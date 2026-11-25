import { action, state } from '@/store/userApi'
import { addUserApi, getUserApiScript, removeUserApi as removeUserApiFromStore, setUserApiAllowShowUpdateAlert as setUserApiAllowShowUpdateAlertFromStore } from '@/utils/data'
import { destroy, loadScript } from '@/utils/nativeModules/userApi'
import { log as writeLog } from '@/utils/log'


export const setUserApi = async(apiId: string) => {
  global.lx.qualityList = {}
  setUserApiStatus(false, 'initing')

  const target = state.list.find(api => api.id === apiId)
  if (!target) throw new Error('api not found')
  const script = await getUserApiScript(target.id)
  loadScript({ ...target, script })
}

export const destroyUserApi = () => {
  destroy()
}


export const setUserApiStatus: typeof action['setStatus'] = (status, message) => {
  action.setStatus(status, message)
}

export const setUserApiList: typeof action['setUserApiList'] = (list) => {
  action.setUserApiList(list)
}

let sourceChanges: Promise<void> = Promise.resolve()
const queueSourceChange = async(operation: () => Promise<void>) => {
  const pending = sourceChanges.then(operation)
  sourceChanges = pending.catch(() => {})
  await pending
}

export const importUserApi = async(script: string) => queueSourceChange(async() => {
  if (state.list.length >= 20) throw new Error(global.i18n.t('user_api_max_tip'))
  if (script.length > 9_000_000) throw new Error('Too large script')
  const info = await addUserApi(script.replace(/^\uFEFF/, ''))
  action.addUserApi(info)
})

export const removeUserApi = async(ids: string[]) => queueSourceChange(async() => {
  const list = await removeUserApiFromStore(ids)
  action.setUserApiList(list)
})

export const setUserApiAllowShowUpdateAlert = async(id: string, enable: boolean) => queueSourceChange(async() => {
  await setUserApiAllowShowUpdateAlertFromStore(id, enable)
  action.setUserApiAllowShowUpdateAlert(id, enable)
})

export const log = {
  r_info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.info(...params)
  },
  r_warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.warn(...params)
  },
  r_error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    writeLog.error(...params)
  },
  log(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  info(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.info(...params)
  },
  warn(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.warn(...params)
  },
  error(...params: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    if (global.lx.isEnableUserApiLog) writeLog.error(...params)
  },
}
