import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Popup, { type PopupType, type PopupProps } from '@/components/common/Popup'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

import SettingTimeoutExit from './settings/SettingTimeoutExit'
import SettingLyricProgress from './settings/SettingLyricProgress'
import SettingVolume from './settings/SettingVolume'
import SettingPlaybackRate from './settings/SettingPlaybackRate'
import SettingAudioEffects from './settings/SettingAudioEffects'
import SettingLrcFontSize from './settings/SettingLrcFontSize'
import SettingLrcAlign from './settings/SettingLrcAlign'
import settingStyles from './settings/style'

export interface SettingPopupProps extends Omit<PopupProps, 'children'> {
  direction: 'vertical' | 'horizontal'
}

export interface SettingPopupType {
  show: () => void
}

export default forwardRef<SettingPopupType, SettingPopupProps>(({ direction, ...props }, ref) => {
  const [visible, setVisible] = useState(false)
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    show() {
      if (visible) popupRef.current?.setVisible(true)
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          popupRef.current?.setVisible(true)
        })
      }
    },
  }))

  const cardSurface = {
    ...settingStyles.card,
    backgroundColor: theme['c-main-background'],
    borderColor: theme['c-border-background'],
  }

  return (
    visible
      ? (
        <Popup ref={popupRef} title={t('play_detail_setting_title')} {...props}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View onStartShouldSetResponder={() => true}>
              <SettingTimeoutExit />

              <View style={cardSurface}>
                <SettingVolume />
                <View style={{ ...settingStyles.divider, borderTopColor: theme['c-border-background'] }} />
                <SettingPlaybackRate />
                <View style={{ ...settingStyles.divider, borderTopColor: theme['c-border-background'] }} />
                <SettingLyricProgress />
              </View>

              <SettingAudioEffects />

              <View style={cardSurface}>
                <SettingLrcFontSize direction={direction} />
                <View style={{ ...settingStyles.divider, borderTopColor: theme['c-border-background'] }} />
                <SettingLrcAlign />
              </View>
            </View>
          </ScrollView>
        </Popup>
        )
      : null
  )
})

const styles = createStyle({
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 20,
  },
})
