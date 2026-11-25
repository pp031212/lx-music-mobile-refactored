import { useMemo, useRef, useState } from 'react'

import DorpDownMenu, { type DorpDownMenuProps as _DorpDownMenuProps } from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import ScriptImportExport, { type ScriptImportExportType } from './ScriptImportExport'
import ScriptImportOnline, { type ScriptImportOnlineType } from './ScriptImportOnline'
import { state } from '@/store/userApi'
import { tipDialog, toast } from '@/utils/tools'
import { importLocalSources } from '@/core/userApiBatch'
import { importUserApi } from '@/core/userApi'
import { readLocalSourceFile, selectLocalSourceFiles } from '@/utils/nativeModules/utils'
import settingState from '@/store/setting/state'

import { useTheme } from '@/store/theme/hook'

interface BtnProps {
  btnStyle?: _DorpDownMenuProps<any[]>['btnStyle']
}


export default ({ btnStyle }: BtnProps) => {
  const t = useI18n()
  const theme = useTheme()
  const scriptImportExportRef = useRef<ScriptImportExportType>(null)
  const scriptImportOnlineRef = useRef<ScriptImportOnlineType>(null)
  const importingRef = useRef(false)
  const [importing, setImporting] = useState(false)

  const importTypes = useMemo(() => {
    return [
      { action: 'local', label: t('user_api_btn_import_local'), disabled: importing },
      { action: 'online', label: t('user_api_btn_import_online'), disabled: importing },
    ] as const
  }, [t, importing])

  type DorpDownMenuProps = _DorpDownMenuProps<typeof importTypes>

  const handleLocalImport = async() => {
    importingRef.current = true
    setImporting(true)
    try {
      const files = await selectLocalSourceFiles()
      if (!files?.length) return
      const result = await importLocalSources(files, {
        count: () => state.list.length,
        read: readLocalSourceFile,
        importScript: importUserApi,
        invalidFileMessage: t('storage_file_no_match'),
      })
      if (files.length == 1 && result.success == 1) {
        toast(t('user_api_import_success_tip'))
        return
      }
      const messages = [t('user_api_batch_result', { success: result.success, failed: result.errors.length, skipped: result.skipped })]
      if (result.errors.length) messages.push(result.errors.map(error => `${error.name}: ${error.message}`).join('\n'))
      if (result.reachedLimit) messages.push(t('user_api_max_tip'))
      await tipDialog({ title: t('user_api_btn_import_local'), message: messages.join('\n\n'), btnText: t('ok') })
    } catch (error) {
      await tipDialog({ message: t('user_api_import_failed_tip', { message: error instanceof Error ? error.message : String(error) }), btnText: t('ok') })
    } finally {
      importingRef.current = false
      setImporting(false)
    }
  }

  const handleAction: DorpDownMenuProps['onPress'] = ({ action }) => {
    if (importingRef.current) return
    if (state.list.length >= 20) {
      void tipDialog({
        message: t('user_api_max_tip'),
        btnText: t('ok'),
      })
      return
    }

    if (action == 'local') {
      if (settingState.setting['common.useSystemFileSelector']) void handleLocalImport()
      else scriptImportExportRef.current?.import()
    } else {
      scriptImportOnlineRef.current?.show()
    }
  }


  return (
    <DorpDownMenu
      btnStyle={btnStyle}
      menus={importTypes}
      center
      onPress={handleAction}
    >
      <Text size={14} color={theme['c-button-font']}>{t(importing ? 'user_api_batch_importing' : 'user_api_btn_import')}</Text>
      <ScriptImportExport ref={scriptImportExportRef} />
      <ScriptImportOnline ref={scriptImportOnlineRef} />
    </DorpDownMenu>
  )
}
