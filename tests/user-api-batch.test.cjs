const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '../src', relativePath)
  const compiled = new Module(filename, module)
  compiled.require = name => {
    assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`)
    return mocks[name]
  }
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  compiled._compile(result.outputText, filename)
  return compiled.exports
}
const { importLocalSources } = load('core/userApiBatch.ts')
const file = (name, extras = {}) => ({ name, uri: `content://files/${name}`, ...extras })

function dependencies(overrides = {}) {
  let count = 0
  const read = []
  const imported = []
  return {
    readFiles: read,
    imported,
    count: () => count,
    read: async(uri) => { read.push(uri); return '/* source */' },
    importScript: async(script) => { imported.push(script); count++ },
    invalidFileMessage: 'Expected .js',
    ...overrides,
  }
}

test('imports each JS file, reports non-JS/read/parse failures, and continues after each error', async() => {
  const imported = []
  const deps = dependencies({
    read: async(uri) => {
      if (uri.endsWith('/unreadable.js')) throw new Error('Permission denied')
      return uri.endsWith('/broken.js') ? 'broken' : '/* valid */'
    },
    importScript: async(script) => {
      if (script == 'broken') throw new Error('Invalid source metadata')
      imported.push(script)
    },
  })
  const result = await importLocalSources(['first.js', 'wrong.txt', 'unreadable.js', 'broken.js', 'last.JS'].map(name => file(name)), deps)
  assert.equal(result.success, 2)
  assert.equal(imported.length, 2)
  assert.deepEqual(result.errors.map(error => error.name), ['wrong.txt', 'unreadable.js', 'broken.js'])
  assert.equal(result.skipped, 0)
})

test('stops before reading files beyond the available source slots', async() => {
  let count = 18
  const deps = dependencies({ count: () => count, importScript: async() => { count++ } })
  const result = await importLocalSources(['a.js', 'b.js', 'c.js', 'd.js'].map(name => file(name)), deps)
  assert.equal(result.success, 2)
  assert.equal(result.skipped, 2)
  assert.equal(result.reachedLimit, true)
  assert.equal(deps.readFiles.length, 2)
})

test('a failed file does not consume the last slot, and duplicate URIs are not imported twice', async() => {
  let count = 19
  const deps = dependencies({ count: () => count, importScript: async() => { count++ } })
  const result = await importLocalSources([file('bad.txt'), file('bad.txt'), file('valid.js'), file('later.js')], deps)
  assert.equal(result.errors.length, 1)
  assert.equal(result.success, 1)
  assert.equal(result.skipped, 2)
  assert.equal(count, 20)
})

test('metadata errors and empty files are reported per file; BOM-prefixed UTF-8 scripts are normalized', async() => {
  const deps = dependencies({ read: async(uri) => uri.endsWith('empty.js') ? '   ' : '\uFEFF/* valid */' })
  const result = await importLocalSources([file('metadata.js', { error: 'No display name access' }), file('empty.js'), file('valid.js')], deps)
  assert.equal(result.success, 1)
  assert.equal(result.errors.length, 2)
  assert.equal(deps.imported[0], '/* valid */')
})

test('imports and reads are sequential, not a Promise.all race', async() => {
  let busy = false
  let maximum = 0
  let active = 0
  const deps = dependencies({
    read: async() => { assert.equal(busy, false); return '/* valid */' },
    importScript: async() => {
      busy = true
      maximum = Math.max(maximum, ++active)
      await new Promise(resolve => setImmediate(resolve))
      active--
      busy = false
    },
  })
  const result = await importLocalSources([file('a.js'), file('b.js')], deps)
  assert.equal(result.success, 2)
  assert.equal(maximum, 1)
})

test('an empty selection performs no reads or imports', async() => {
  const deps = dependencies()
  assert.deepEqual(await importLocalSources([], deps), { success: 0, errors: [], skipped: 0, reachedLimit: false })
  assert.equal(deps.readFiles.length, 0)
})

function sourceCore(initialCount) {
  const state = { list: Array.from({ length: initialCount }, (_, index) => ({ id: String(index) })) }
  const calls = []
  const core = load('core/userApi.ts', {
    '@/store/userApi': {
      state,
      action: {
        addUserApi: info => { state.list.push(info) },
        setUserApiList: list => { state.list = list },
      },
    },
    '@/utils/data': {
      addUserApi: async(script) => {
        calls.push(script)
        await new Promise(resolve => setImmediate(resolve))
        if (script == 'broken') throw new Error('Invalid source')
        return { id: script }
      },
      removeUserApi: async(ids) => state.list.filter(info => !ids.includes(info.id)),
    },
    '@/utils/nativeModules/userApi': {},
    '@/utils/log': { log: {} },
  })
  return { core, state, calls }
}

test('concurrent import requests cannot exceed 20, even from different import entry points', async() => {
  global.i18n = { t: key => key }
  const { core, state, calls } = sourceCore(19)
  const result = await Promise.allSettled([core.importUserApi('first'), core.importUserApi('second')])
  assert.deepEqual(result.map(item => item.status), ['fulfilled', 'rejected'])
  assert.deepEqual(calls, ['first'])
  assert.equal(state.list.length, 20)
})

test('failed imports do not poison the operation queue or consume a source slot', async() => {
  global.i18n = { t: key => key }
  const { core, state } = sourceCore(19)
  const result = await Promise.allSettled([core.importUserApi('broken'), core.importUserApi('\uFEFFvalid')])
  assert.deepEqual(result.map(item => item.status), ['rejected', 'fulfilled'])
  assert.equal(state.list.length, 20)
  assert.equal(state.list.at(-1).id, 'valid')
})

test('source removal is serialized with imports so it cannot overwrite an import', async() => {
  const { core, state } = sourceCore(1)
  await Promise.all([core.importUserApi('new'), core.removeUserApi(['0'])])
  assert.deepEqual(state.list.map(info => info.id), ['new'])
})

test('a storage failure does not leave a phantom source in the next successful save', async() => {
  let fail = true
  const snapshots = []
  const config = load('config/constant.ts')
  const data = load('utils/data.ts', {
    '@/plugins/storage': {
      getData: async() => [],
      saveDataMultiple: async(snapshot) => {
        if (fail) throw new Error('Storage full')
        snapshots.push(snapshot)
      },
    },
    '@/config/constant': config,
    './common': { throttle: callback => callback },
  })
  await data.getUserApiList()
  const script = '/*\n * @name Test source\n */\n'
  await assert.rejects(data.addUserApi(script), /Storage full/)
  fail = false
  const info = await data.addUserApi(script)
  const list = snapshots[0].find(([key]) => key == config.storageDataPrefix.userApi)[1]
  assert.equal(list.length, 1)
  assert.equal(list[0].id, info.id)
})
