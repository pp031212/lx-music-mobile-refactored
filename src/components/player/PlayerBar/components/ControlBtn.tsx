import { useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useIsPlay } from '@/store/player/hook'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { createStyle } from '@/utils/tools'
import { useHorizontalMode } from '@/utils/hooks'
import PlayingQueuePopup, { type PlayingQueuePopupType } from '@/components/player/PlayingQueuePopup'

const BTN_SIZE = 20

const handlePlayPrev = () => {
  void playPrev()
}
const handlePlayNext = () => {
  void playNext()
}

const PlayPrevBtn = () => {
  const theme = useTheme()
  return (
    <TouchableOpacity style={styles.cotrolBtn} activeOpacity={0.5} onPress={handlePlayPrev}>
      <Icon name='prevMusic' color={theme['c-button-font']} size={BTN_SIZE} />
    </TouchableOpacity>
  )
}

const PlayNextBtn = () => {
  const theme = useTheme()
  return (
    <TouchableOpacity style={styles.cotrolBtn} activeOpacity={0.5} onPress={handlePlayNext}>
      <Icon name='nextMusic' color={theme['c-button-font']} size={BTN_SIZE} />
    </TouchableOpacity>
  )
}

const TogglePlayBtn = () => {
  const isPlay = useIsPlay()
  const theme = useTheme()

  return (
    <TouchableOpacity style={styles.playPrimaryBtnWrap} activeOpacity={0.6} onPress={togglePlay}>
      <View style={{ ...styles.playPrimaryCircle, backgroundColor: theme['c-primary-background-active'] }}>
        <Icon name={isPlay ? 'pause' : 'play'} color={theme['c-primary-font-active']} size={18} />
      </View>
    </TouchableOpacity>
  )
}

export default () => {
  const isHorizontalMode = useHorizontalMode()
  const theme = useTheme()
  const queuePopupRef = useRef<PlayingQueuePopupType>(null)

  return (
    <>
      {isHorizontalMode ? <PlayPrevBtn /> : null}
      <TogglePlayBtn />
      <PlayNextBtn />
      <TouchableOpacity
        style={styles.cotrolBtn}
        activeOpacity={0.5}
        onPress={() => queuePopupRef.current?.show()}
      >
        <Icon name='menu' color={theme['c-button-font']} size={19} />
      </TouchableOpacity>
      <PlayingQueuePopup ref={queuePopupRef} />
    </>
  )
}

const styles = createStyle({
  cotrolBtn: {
    width: 40,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPrimaryBtnWrap: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPrimaryCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
