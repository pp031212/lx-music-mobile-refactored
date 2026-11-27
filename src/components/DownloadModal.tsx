import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { downloadManager } from '@/core/download'
import { DOWNLOAD_QUALITIES, supportsDownloadQuality } from '@/core/download/quality'
import settingState from '@/store/setting/state'
import { BorderWidths } from '@/theme'
import { createStyle, toast } from '@/utils/tools'

export interface DownloadModalType {
  show: (musics: LX.Music.MusicInfo[]) => void
}

const getQualityDisplay = (quality: LX.Quality, isEnglish: boolean): { title: string, badge: string, badgeType: BadgeType } => {
  switch (quality) {
    case 'flac24bit':
      return { title: isEnglish ? 'Hi-Res Lossless' : 'Hi-Res 超清无损', badge: '24BIT', badgeType: 'secondary' }
    case 'flac':
      return { title: isEnglish ? 'Lossless FLAC' : '无损音质', badge: 'FLAC', badgeType: 'secondary' }
    case '320k':
      return { title: isEnglish ? 'High Quality' : '高品音质', badge: '320K', badgeType: 'tertiary' }
    case '128k':
    default:
      return { title: isEnglish ? 'Standard' : '标准音质', badge: '128K', badgeType: 'normal' }
  }
}

export default forwardRef<DownloadModalType, { onAdded?: () => void }>(({ onAdded }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const modalRef = useRef<ModalType>(null)
  const [musics, setMusics] = useState<LX.Music.MusicInfoOnline[]>([])
  const [busy, setBusy] = useState(false)

  useImperativeHandle(ref, () => ({
    show(list) {
      const online = list.filter((music): music is LX.Music.MusicInfoOnline => music.source != 'local')
      if (!online.length) { toast(t('download_online_only')); return }
      setMusics(online)
      requestAnimationFrame(() => {
        modalRef.current?.setVisible(true)
      })
    },
  }))

  const close = () => {
    modalRef.current?.setVisible(false)
  }

  const qualities = DOWNLOAD_QUALITIES.filter(quality => musics.some(music => supportsDownloadQuality(music, quality, global.lx.qualityList)))
  const isSingle = musics.length == 1
  const isEnglish = t('cancel') == 'Cancel'

  const subtitle = isSingle
    ? `${musics[0].name}${musics[0].singer ? ` - ${musics[0].singer}` : ''}`
    : t('download_selection', { count: musics.length })

  const add = async(quality: LX.Quality) => {
    if (busy) return
    setBusy(true)
    try {
      const eligible = musics.filter(music => supportsDownloadQuality(music, quality, global.lx.qualityList))
      const count = await downloadManager.create(eligible, quality, settingState.setting['download.fileName'])
      toast(t('download_added', { count, skipped: musics.length - count }), 'long')
      modalRef.current?.setVisible(false)
      onAdded?.()
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error), 'long')
    } finally { setBusy(false) }
  }

  return (
    <Modal ref={modalRef} bgColor="rgba(0,0,0,0.36)">
      <View style={styles.backdrop} pointerEvents="box-none">
        <View
          style={{
            ...styles.sheet,
            backgroundColor: theme['c-content-background'],
          }}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.grabberWrap}>
            <View style={{ ...styles.grabber, backgroundColor: theme['c-font-label'] }} />
          </View>
          <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
            <View style={styles.headerTextWrap}>
              <Text size={16} color={theme['c-font']} style={styles.title} numberOfLines={1}>
                {t('download_choose_quality')}
              </Text>
              {subtitle ? (
                <Text size={12} color={theme['c-font-label']} numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={close} style={styles.closeBtn}>
              <Icon name="close" size={16} color={theme['c-font-label']} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
            {qualities.length ? (
              qualities.map(quality => {
                const display = getQualityDisplay(quality, isEnglish)
                const eligibleCount = musics.filter(music => supportsDownloadQuality(music, quality, global.lx.qualityList)).length
                const singleSize = isSingle ? musics[0].meta._qualitys[quality]?.size : ''
                return (
                  <TouchableOpacity
                    key={quality}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    disabled={busy}
                    onPress={() => { void add(quality) }}
                    style={{
                      ...styles.optionCard,
                      backgroundColor: theme['c-primary-input-background'],
                      borderColor: theme['c-border-background'],
                      opacity: busy ? 0.5 : 1,
                    }}
                  >
                    <View style={styles.optionLeft}>
                      <Text size={15} color={theme['c-font']} style={styles.optionTitle}>
                        {display.title}
                      </Text>
                      <Badge type={display.badgeType}>{display.badge}</Badge>
                    </View>
                    <View style={styles.optionRight}>
                      {isSingle ? (
                        singleSize ? (
                          <Text size={12} color={theme['c-font-label']} style={styles.optionMeta}>
                            {singleSize}
                          </Text>
                        ) : null
                      ) : (
                        <Text size={12} color={theme['c-font-label']} style={styles.optionMeta}>
                          {eligibleCount}/{musics.length}
                        </Text>
                      )}
                      <Icon name="download-2" size={16} color={theme['c-primary-font-active']} />
                    </View>
                  </TouchableOpacity>
                )
              })
            ) : (
              <View style={styles.emptyWrap}>
                <Text size={13} color={theme['c-font-label']} style={styles.emptyText}>
                  {t('download_no_quality')}
                </Text>
              </View>
            )}

            <View style={{ ...styles.tipBox, backgroundColor: theme['c-primary-alpha-900'] }}>
              <Icon name="help" size={13} color={theme['c-primary-font-active']} style={styles.tipIcon} />
              <Text size={11} color={theme['c-font-label']} style={styles.tipText}>
                {t('download_quality_tip')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
})

const styles = createStyle({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '72%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: '100%',
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    marginBottom: 8,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionMeta: {
    marginRight: 8,
  },
  emptyWrap: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  tipIcon: {
    marginRight: 6,
  },
  tipText: {
    flex: 1,
    lineHeight: 16,
  },
})
