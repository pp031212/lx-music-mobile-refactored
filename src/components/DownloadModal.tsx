import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Dialog, { type DialogType } from '@/components/common/Dialog'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { downloadManager } from '@/core/download'
import { DOWNLOAD_QUALITIES, supportsDownloadQuality } from '@/core/download/quality'
import settingState from '@/store/setting/state'
import { createStyle, toast } from '@/utils/tools'

export interface DownloadModalType {
  show: (musics: LX.Music.MusicInfo[]) => void
}

export default forwardRef<DownloadModalType, { onAdded?: () => void }>(({ onAdded }, ref) => {
  const t = useI18n()
  const dialogRef = useRef<DialogType>(null)
  const [musics, setMusics] = useState<LX.Music.MusicInfoOnline[]>([])
  const [busy, setBusy] = useState(false)
  useImperativeHandle(ref, () => ({
    show(list) {
      const online = list.filter((music): music is LX.Music.MusicInfoOnline => music.source != 'local')
      if (!online.length) { toast(t('download_online_only')); return }
      setMusics(online)
      dialogRef.current?.setVisible(true)
    },
  }))

  const qualities = DOWNLOAD_QUALITIES.filter(quality => musics.some(music => supportsDownloadQuality(music, quality, global.lx.qualityList)))
  const add = async(quality: LX.Quality) => {
    if (busy) return
    setBusy(true)
    try {
      const eligible = musics.filter(music => supportsDownloadQuality(music, quality, global.lx.qualityList))
      const count = await downloadManager.create(eligible, quality, settingState.setting['download.fileName'])
      toast(t('download_added', { count, skipped: musics.length - count }), 'long')
      dialogRef.current?.setVisible(false)
      onAdded?.()
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'long')
    } finally { setBusy(false) }
  }

  return <Dialog ref={dialogRef} title={t('download_choose_quality')}>
    <View style={styles.content}>
      <Text>{t('download_selection', { count: musics.length })}</Text>
      <ScrollView>
        {qualities.map(quality => <Button key={quality} accessibilityRole="button" disabled={busy} style={styles.option} onPress={() => { void add(quality) }}>
          <Text>{quality.toUpperCase()} · {musics.filter(music => supportsDownloadQuality(music, quality, global.lx.qualityList)).length}/{musics.length}</Text>
        </Button>)}
      </ScrollView>
      {!qualities.length && <Text>{t('download_no_quality')}</Text>}
      <Text size={12}>{t('download_quality_tip')}</Text>
    </View>
  </Dialog>
})

const styles = createStyle({
  content: { padding: 18, minWidth: 240 },
  option: { paddingVertical: 14 },
})
