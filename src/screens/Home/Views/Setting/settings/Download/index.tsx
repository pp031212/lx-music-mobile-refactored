import { useRef, useState } from 'react'
import { View } from 'react-native'
import Section from '../../components/Section'
import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import Button from '../../components/Button'
import CheckBox from '@/components/common/CheckBox'
import Text from '@/components/common/Text'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import { DEFAULT_DOWNLOAD_DIRECTORY, downloadManager } from '@/core/download'
import { useDownloadSettings } from '@/store/download/hook'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle, toast } from '@/utils/tools'

const perform = (operation: Promise<unknown>) => {
  void operation.catch(error => { toast(error instanceof Error ? error.message : String(error), 'long') })
}

// Both entry points use the same controls and settings; no separate quick-settings state.
export const DownloadSettingsContent = () => {
  const t = useI18n()
  const settings = useDownloadSettings()
  const fileName = useSettingValue('download.fileName')
  const [showPath, setShowPath] = useState(false)
  const pathRef = useRef<ChoosePathType>(null)
  const chooseDirectory = () => {
    setShowPath(true)
    requestAnimationFrame(() => { pathRef.current?.show({ title: t('download_directory'), dirOnly: true, isPersist: true }) })
  }
  const nameFormats: Array<{ value: LX.AppSetting['download.fileName'], label: string }> = [
    { value: '歌名 - 歌手', label: t('download_name_song_artist') },
    { value: '歌手 - 歌名', label: t('download_name_artist_song') },
    { value: '歌名', label: t('download_name_song') },
  ]

  return <>
    <SubTitle title={t('download_directory')}>
      <Text size={12} selectable>{settings.directory}</Text>
      <View style={styles.buttons}>
        <Button onPress={chooseDirectory}>{t('download_change_directory')}</Button>
        <Button onPress={() => { perform(downloadManager.updateSettings({ directory: DEFAULT_DOWNLOAD_DIRECTORY })) }}>{t('download_default_directory')}</Button>
      </View>
      <Text size={12}>{t('download_directory_tip')}</Text>
    </SubTitle>
    <SubTitle title={t('download_concurrency')}>
      <View style={styles.choices}>
        {[1, 2, 3].map(concurrency => <CheckBox key={concurrency} marginRight={12} check={settings.concurrency == concurrency} label={String(concurrency)} need
          onChange={() => { perform(downloadManager.updateSettings({ concurrency })) }} />)}
      </View>
    </SubTitle>
    <SubTitle title={t('download_setting_allowToggleSource')}>
      <CheckBox check={settings.allowToggleSource} label={t('download_setting_enabled')}
        onChange={allowToggleSource => { perform(downloadManager.updateSettings({ allowToggleSource })) }} />
    </SubTitle>
    <SubTitle title={t('download_name_format')}>
      <View style={styles.choices}>
        {nameFormats.map(format => <CheckBox key={format.value} marginRight={12} check={fileName == format.value} label={format.label} need
          onChange={() => { updateSetting({ 'download.fileName': format.value }) }} />)}
      </View>
      <Text size={12}>{t('download_name_suffix_tip')}</Text>
    </SubTitle>
    <CheckBoxItem check={settings.embedMetadata} label={t('download_setting_embedMetadata')}
      onChange={embedMetadata => { perform(downloadManager.updateSettings({ embedMetadata })) }} />
    <CheckBoxItem check={settings.saveLyric} label={t('download_setting_saveLyric')}
      onChange={saveLyric => { perform(downloadManager.updateSettings({ saveLyric })) }} />
    <View style={styles.notice}><Text size={12}>{t('download_runtime_tip')}</Text></View>
    {showPath && <ChoosePath ref={pathRef} onConfirm={directory => { perform(downloadManager.updateSettings({ directory })) }} />}
  </>
}

export default () => {
  const t = useI18n()
  return <Section title={t('setting_download')}><DownloadSettingsContent /></Section>
}

const styles = createStyle({
  choices: { flexDirection: 'row', flexWrap: 'wrap' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 10 },
  notice: { marginVertical: 14, paddingLeft: 25 },
})
