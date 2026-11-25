import { TouchableOpacity, View } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { playNext, playPrev, togglePlay } from '@/core/player/player'
import { useIsPlay } from '@/store/player/hook'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'

const SIDE_BTN_SIZE = scaleSizeW(50)
const MAIN_BTN_SIZE = scaleSizeW(66)

const PrevBtn = () => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      style={{ ...styles.sideBtn, width: SIDE_BTN_SIZE, height: SIDE_BTN_SIZE }}
      activeOpacity={0.6}
      onPress={() => { void playPrev() }}
    >
      <Icon name="prevMusic" color={theme['c-button-font']} size={26} />
    </TouchableOpacity>
  )
}

const NextBtn = () => {
  const theme = useTheme()
  return (
    <TouchableOpacity
      style={{ ...styles.sideBtn, width: SIDE_BTN_SIZE, height: SIDE_BTN_SIZE }}
      activeOpacity={0.6}
      onPress={() => { void playNext() }}
    >
      <Icon name="nextMusic" color={theme['c-button-font']} size={26} />
    </TouchableOpacity>
  )
}

const TogglePlayBtn = () => {
  const theme = useTheme()
  const isPlay = useIsPlay()
  return (
    <TouchableOpacity
      style={{
        ...styles.mainPlayBtn,
        width: MAIN_BTN_SIZE,
        height: MAIN_BTN_SIZE,
        borderRadius: MAIN_BTN_SIZE / 2,
        backgroundColor: theme['c-primary'],
      }}
      activeOpacity={0.75}
      onPress={togglePlay}
    >
      <Icon name={isPlay ? 'pause' : 'play'} color="#ffffff" size={28} />
    </TouchableOpacity>
  )
}

export default () => {
  return (
    <View style={styles.container}>
      <PrevBtn />
      <TogglePlayBtn />
      <NextBtn />
    </View>
  )
}

const styles = createStyle({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: '8%',
    paddingVertical: 18,
  },
  sideBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPlayBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
})
