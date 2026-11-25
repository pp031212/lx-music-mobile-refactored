const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

function load(relativePath, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../src', relativePath)
  const exports = {}
  const requireMock = name => {
    assert.ok(Object.hasOwn(mocks, name), `Unexpected dependency: ${name}`)
    return mocks[name]
  }
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  })
  vm.runInNewContext(outputText, { exports, require: requireMock, global: globals }, { filename })
  return exports
}

const builtIn = load('theme/themes/themes.ts').default
const defaults = load('config/defaultSetting.ts').default

function themeStartup(overrides, appearance = 'light', userThemes = []) {
  const state = load('store/theme/state.ts', { react: { createContext: theme => ({ theme }) } }).default
  const settings = { setting: { ...defaults, ...overrides } }
  const applied = []
  const globals = {
    state_event: {
      on() {},
      themeUpdated(theme) { applied.push(theme) },
    },
  }
  const themeModule = load('theme/themes/index.ts', {
    '@/utils/data': { getUserTheme: async() => userThemes },
    '@/theme/themes/themes': builtIn,
    '@/store/setting/state': settings,
    '@/store/theme/state': state,
    '@/utils': { isUrl: () => false },
    '@/utils/fs': { privateStorageDirectoryPath: '/data' },
    './images/china_ink.jpg': 1,
    './images/jqbg.jpg': 2,
    './images/landingMoon2.png': 3,
    './images/myzcbg.jpg': 4,
    './images/xnkl.png': 5,
  })
  const themeActions = load('store/theme/action.ts', {
    '@/theme/themes': themeModule,
    './state': state,
  }, globals).default
  const coreTheme = load('core/theme.ts', {
    '@/store/theme/action': themeActions,
    '@/theme/themes': themeModule,
    './common': { updateSetting: changes => Object.assign(settings.setting, changes) },
    '@/store/theme/state': state,
  })
  const init = load('core/init/theme.ts', {
    '@/utils/tools': {
      getAppearance: () => appearance,
      getIsSupportedAutoTheme: () => true,
      onAppearanceChange() {},
    },
    '@/core/theme': coreTheme,
    '@/theme/themes/index': themeModule,
    '@/store/setting/state': settings,
    '@/components/common/StatusBar': {},
  }, globals).default
  return { init: () => init(settings.setting), applied }
}

test('startup applies the default theme with a resolved color palette', async() => {
  const { init, applied } = themeStartup({})
  await init()
  assert.equal(applied.length, 1)
  assert.equal(applied[0].id, defaults['theme.id'])
  assert.ok(applied[0]['c-primary'])
})

test('startup falls back when the saved theme no longer exists', async() => {
  const { init, applied } = themeStartup({ 'theme.id': 'removed-theme' })
  await init()
  assert.equal(applied[0].id, 'green')
})

test('startup honors automatic dark mode', async() => {
  const { init, applied } = themeStartup({ 'common.isAutoTheme': true }, 'dark')
  await init()
  assert.equal(applied[0].id, 'black')
  assert.equal(applied[0].isDark, true)
})

test('startup resolves a saved custom theme', async() => {
  const custom = { ...structuredClone(builtIn[0]), id: 'user-theme', isCustom: true }
  const { init, applied } = themeStartup({ 'theme.id': custom.id }, 'light', [custom])
  await init()
  assert.equal(applied[0].id, custom.id)
})
