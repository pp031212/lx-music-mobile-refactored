import { useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import Slider, { type SliderProps } from '@/components/common/Slider'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import styles from './style'
import { setPlaybackRate, updateMetaData } from '@/plugins/player'
import { setPlaybackRate as setLyricPlaybackRate } from '@/core/lyric'
import playerState from '@/store/player/state'
import settingState from '@/store/setting/state'
import { createStyle } from '@/utils/tools'

const MIN_VALUE = 60
const MAX_VALUE = 200

export default () => {
  const theme = useTheme()
  const playbackRate = Math.trunc(useSettingValue('player.playbackRate') * 100)
  const [sliderSize, setSliderSize] = useState(playbackRate)
  const [isSliding, setSliding] = useState(false)
  const t = useI18n()

  const handleSlidingStart: SliderProps['onSlidingStart'] = () => {
    setSliding(true)
  }
  const handleValueChange: SliderProps['onValueChange'] = value => {
    value = Math.trunc(value)
    setSliderSize(value)
    void setPlaybackRate(parseFloat((value / 100).toFixed(2)))
  }
  const handleSlidingComplete: SliderProps['onSlidingComplete'] = value => {
    setSliding(false)
    value = Math.trunc(value)
    const rate = value / 100
    void setLyricPlaybackRate(rate)
    void updateMetaData(playerState.musicInfo, playerState.isPlay, true)
    if (playbackRate == value) return
    updateSetting({ 'player.playbackRate': rate })
  }
  const handleReset = () => {
    if (settingState.setting['player.playbackRate'] == 1) return
    setSliderSize(100)
    void setPlaybackRate(1).then(() => {
      void updateMetaData(playerState.musicInfo, playerState.isPlay, true)
      void setLyricPlaybackRate(1)
    })
    updateSetting({ 'player.playbackRate': 1 })
  }

  const displayRate = isSliding ? sliderSize : playbackRate
  const isDefault = displayRate === 100

  return (
    <View style={styles.item}>
      <View style={styles.headerRow}>
        <Text size={14}>{t('play_detail_setting_playback_rate')}</Text>
        <View style={localStyles.rightActions}>
          <Text size={13} style={styles.valueText} color={theme['c-font-label']}>
            {`${(displayRate / 100).toFixed(2)}x`}
          </Text>
          {!isDefault ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReset}
              style={{ ...localStyles.resetBtn, backgroundColor: theme['c-primary-alpha-900'] }}
            >
              <Text size={11} color={theme['c-primary-font-active']}>
                {t('play_detail_setting_playback_rate_reset')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={styles.sliderWrap}>
        <Slider
          minimumValue={MIN_VALUE}
          maximumValue={MAX_VALUE}
          onSlidingComplete={handleSlidingComplete}
          onValueChange={handleValueChange}
          onSlidingStart={handleSlidingStart}
          step={1}
          value={playbackRate}
        />
      </View>
    </View>
  )
}

const localStyles = createStyle({
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
})
