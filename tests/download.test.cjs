const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')

// Compile the platform-independent modules with the project's TypeScript version.
// No React Native runtime or device is needed for queue race/IO failure tests.
function load(file) {
  const source = fs.readFileSync(path.join(__dirname, '../src/core/download', file), 'utf8')
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
  const compiled = new Module(file, module)
  compiled._compile(result.outputText, file)
  return compiled.exports
}
const { DownloadManager, safeFileName, qualityExtension } = load('manager.ts')
const { supportsDownloadQuality } = load('quality.ts')
const tick = () => new Promise(resolve => setImmediate(resolve))
const until = async(predicate) => {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return
    await tick()
  }
  assert.fail('Queue did not reach the expected state')
}
const song = id => ({ id, name: 'same title', singer: 'artist', source: 'kw', interval: '03:00', meta: { songId: id, albumName: '', _qualitys: { '128k': {}, flac: {} }, qualitys: [] } })

function fixture(overrides = {}) {
  const transfers = []
  const files = new Set()
  const saved = []
  const urls = []
  const errors = []
  let changes = 0
  const deps = {
    load: async() => null,
    save: async(snapshot) => { saved.push(snapshot) },
    prepare: async() => {},
    getUrl: async(task, refresh) => { urls.push({ id: task.id, refresh, quality: task.metadata.quality }); return 'https://audio.test/song' },
    temporaryPath: id => `/tmp/${id}.part`,
    exists: async(file) => files.has(file),
    unlink: async(file) => { files.delete(file) },
    download: (url, file, progress) => {
      let resolveTransfer, rejectTransfer
      const promise = new Promise((resolve, reject) => { resolveTransfer = resolve; rejectTransfer = reject })
      files.add(file)
      const transfer = { file, progress, resolve: resolveTransfer, reject: rejectTransfer, cancelled: false }
      transfers.push(transfer)
      return { promise, cancel: () => { transfer.cancelled = true; rejectTransfer(new Error('cancelled')) } }
    },
    finish: async(task) => { const file = `/saved/${task.metadata.fileName}`; files.add(file); return file },
    message: key => key,
    onListChange: () => { changes++ },
    onError: error => { errors.push(error) },
    ...overrides,
  }
  const manager = new DownloadManager(deps, { directory: '/saved', concurrency: 2, saveLyric: false, embedMetadata: false, allowToggleSource: false })
  return { manager, transfers, files, saved, urls, errors, changes: () => changes }
}

test('bounded concurrency, duplicate suppression, distinct filenames, and completion publishes local files', async() => {
  const { manager, transfers, saved, files, changes } = fixture()
  assert.equal(await manager.create([song('a'), song('b'), song('c'), song('a')], '128k', 'song'), 3)
  await until(() => transfers.length == 2)
  assert.equal(manager.tasks.filter(task => task.status == 'run').length, 2)
  assert.equal(new Set(manager.tasks.map(task => task.metadata.fileName)).size, 3)
  transfers[0].progress(10, 10)
  transfers[0].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => transfers.length == 3)
  for (const transfer of transfers.slice(1)) transfer.resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => manager.tasks.every(task => task.status == 'completed'))
  await manager.flush()
  assert.equal(saved.at(-1).tasks.length, 3)
  assert.ok(saved.at(-1).tasks.every(task => task.progress == 100))
  assert.ok(await manager.getFile(manager.tasks[0].id))
  assert.equal([...files].filter(file => file.endsWith('.part')).length, 0)
  assert.ok(changes() >= 4)
})

test('pause while obtaining URL prevents a late response from starting a transfer; restart waits for old run', async() => {
  let release
  const firstUrl = new Promise(resolve => { release = resolve })
  let requests = 0
  const { manager, transfers } = fixture({ getUrl: async() => ++requests == 1 ? firstUrl : 'https://audio.test/fresh' })
  await manager.create([song('a')], '128k', 'song')
  await until(() => requests == 1)
  const id = manager.tasks[0].id
  await manager.pause([id])
  await manager.start([id])
  assert.equal(transfers.length, 0)
  release('https://audio.test/old')
  await until(() => transfers.length == 1)
  assert.equal(requests, 2)
  transfers[0].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => manager.tasks[0].status == 'completed')
  await manager.flush()
})

test('pause cancels the native job and ignores late progress; restart starts from zero', async() => {
  const { manager, transfers } = fixture()
  await manager.create([song('a')], '128k', 'song')
  await until(() => transfers.length == 1)
  transfers[0].progress(50, 100)
  await manager.pause([manager.tasks[0].id])
  transfers[0].progress(99, 100)
  assert.equal(manager.tasks[0].downloaded, 50)
  assert.equal(manager.tasks[0].status, 'pause')
  assert.ok(transfers[0].cancelled)
  await manager.start([manager.tasks[0].id])
  await until(() => transfers.length == 2)
  assert.equal(manager.tasks[0].downloaded, 0)
  transfers[1].resolve({ statusCode: 200, bytesWritten: 100 })
  await until(() => manager.tasks[0].status == 'completed')
  await manager.flush()
})

test('HTTP and truncated-file failures refresh URL once, then fail without publishing', async() => {
  const { manager, transfers, urls, files } = fixture()
  await manager.create([song('a')], 'flac', 'song')
  await until(() => transfers.length == 1)
  transfers[0].resolve({ statusCode: 403, bytesWritten: 20 })
  await until(() => transfers.length == 2)
  transfers[1].progress(10, 100)
  transfers[1].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => manager.tasks[0].status == 'error')
  assert.deepEqual(urls.map(url => url.refresh), [false, true])
  assert.deepEqual(urls.map(url => url.quality), ['flac', 'flac'])
  assert.equal(manager.tasks[0].isComplate, false)
  await manager.flush()
  await tick()
  assert.equal(files.size, 0)
})

test('publication failure does not retry the audio transfer and does not mark complete', async() => {
  const { manager, transfers } = fixture({ finish: async() => { throw new Error('disk full') } })
  await manager.create([song('a')], '128k', 'song')
  await until(() => transfers.length == 1)
  transfers[0].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => manager.tasks[0].status == 'error')
  assert.equal(manager.tasks[0].statusText, 'disk full')
  assert.equal(transfers.length, 1)
  await manager.flush()
})

test('remove cancels active transfers and optionally deletes completed audio and lyrics', async() => {
  const { manager, transfers, files, saved } = fixture()
  await manager.create([song('a'), song('b')], '128k', 'song')
  await until(() => transfers.length == 2)
  const first = manager.tasks[0]
  const second = manager.tasks[1]
  await manager.remove(first.id, false)
  assert.ok(transfers[0].cancelled)
  transfers[1].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => second.status == 'completed')
  second.metadata.lyricPath = '/saved/song.lrc'
  files.add(second.metadata.lyricPath)
  await manager.remove(second.id, true)
  await manager.flush()
  assert.equal(files.size, 0)
  assert.deepEqual(saved.at(-1).tasks, [])
})

test('removing only a completed record preserves its audio file', async() => {
  const { manager, transfers, files } = fixture()
  await manager.create([song('a')], '128k', 'song')
  await until(() => transfers.length == 1)
  transfers[0].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => manager.tasks[0].status == 'completed')
  const task = manager.tasks[0]
  await manager.remove(task.id, false)
  assert.ok(files.has(task.metadata.filePath))
  assert.equal(manager.tasks.length, 0)
  await manager.flush()
})

test('restart restores unfinished jobs paused and marks missing completed files as failed', async() => {
  const original = fixture()
  await original.manager.create([song('a'), song('b'), song('c')], '128k', 'song')
  await original.manager.pause(original.manager.tasks.map(task => task.id))
  const tasks = JSON.parse(JSON.stringify(original.manager.tasks))
  tasks[0].status = 'run'
  tasks[1].status = 'waiting'
  tasks[2].status = 'completed'
  tasks[2].isComplate = true
  tasks[2].metadata.filePath = '/missing/song.mp3'
  const { manager, transfers } = fixture({ load: async() => ({ tasks, settings: original.manager.settings }) })
  await manager.init()
  assert.deepEqual(manager.tasks.map(task => task.status), ['pause', 'pause', 'error'])
  assert.equal(manager.tasks[2].isComplate, false)
  assert.equal(transfers.length, 0)
  await manager.flush()
  await original.manager.flush()
})

test('missing local files invalidate completed records without requesting an online URL', async() => {
  const { manager, transfers, files, urls } = fixture()
  await manager.create([song('a')], '128k', 'song')
  await until(() => transfers.length == 1)
  transfers[0].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => manager.tasks[0].status == 'completed')
  files.clear()
  await assert.rejects(manager.getFile(manager.tasks[0].id), /download_file_missing/)
  assert.equal(manager.tasks[0].status, 'error')
  assert.equal(urls.length, 1)
  await manager.flush()
})

test('progress persistence is serialized so an old write cannot resurrect a removed task', async() => {
  let release
  let calls = 0
  const snapshots = []
  const { manager, transfers } = fixture({
    save: async(snapshot) => {
      if (++calls == 2) await new Promise(resolve => { release = resolve })
      snapshots.push(snapshot)
    },
  })
  await manager.create([song('a')], '128k', 'song')
  await until(() => transfers.length == 1 && !!release)
  await manager.remove(manager.tasks[0].id, false)
  release()
  await manager.flush()
  assert.deepEqual(snapshots.at(-1).tasks, [])
})

test('quality choices respect both song metadata and custom-source capabilities; names cannot escape directory', () => {
  assert.equal(supportsDownloadQuality(song('a'), 'flac', { kw: ['128k'] }), false)
  assert.equal(supportsDownloadQuality(song('a'), '320k', { kw: ['320k'] }), false)
  assert.equal(supportsDownloadQuality(song('a'), 'flac', { kw: ['flac'] }), true)
  assert.equal(qualityExtension('flac24bit'), 'flac')
  assert.equal(qualityExtension('320k'), 'mp3')
  assert.ok(!/[\\/:]/.test(safeFileName('../../a/b:c')))
})

test('pause all during final publication pauses queued songs before the next slot opens', async() => {
  let publish
  const { manager, transfers } = fixture({ finish: async() => new Promise(resolve => { publish = resolve }) })
  await manager.updateSettings({ concurrency: 1 })
  await manager.create([song('a'), song('b')], '128k', 'song')
  await until(() => transfers.length == 1)
  transfers[0].resolve({ statusCode: 200, bytesWritten: 10 })
  await until(() => !!publish)
  const pausing = manager.pause(manager.tasks.map(task => task.id))
  await tick()
  assert.equal(manager.tasks[1].status, 'pause')
  publish('/saved/a.mp3')
  await pausing
  assert.equal(manager.tasks[0].status, 'completed')
  assert.equal(transfers.length, 1)
  await manager.flush()
})

test('delete in progress blocks a concurrent restart from resurrecting the task', async() => {
  let cancelNative
  const { manager, transfers } = fixture({
    download: () => {
      const promise = new Promise((resolve, reject) => { cancelNative = () => { reject(new Error('cancelled')) } })
      transfers.push({})
      return { promise, cancel: () => {} }
    },
  })
  await manager.create([song('a')], '128k', 'song')
  await until(() => transfers.length == 1)
  const id = manager.tasks[0].id
  const removing = manager.remove(id, false)
  await tick()
  await manager.start([id])
  cancelNative()
  await removing
  assert.equal(manager.tasks.length, 0)
  assert.equal(transfers.length, 1)
  await manager.flush()
})
