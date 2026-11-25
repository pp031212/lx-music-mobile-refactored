import { memo, useRef } from 'react'

import { View, StyleSheet, TouchableOpacity } from 'react-native'

import { pop } from '@/navigation'
import StatusBar from '@/components/common/StatusBar'
import { useTheme } from '@/store/theme/hook'
import { usePlayerMusicInfo } from '@/store/player/hook'
import Text from '@/components/common/Text'
import Image from '@/components/common/Image'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT, NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import commonState from '@/store/common/state'
import SettingPopup, { type SettingPopupType } from '../../components/SettingPopup'
import { useStatusbarHeight } from '@/store/common/hook'
import Btn from './Btn'

export const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)
const MINI_COVER_SIZE = scaleSizeH(34)

const MiniCover = ({ onPress }: { onPress?: () => void }) => {
  const musicInfo = usePlayerMusicInfo()

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={styles.miniCoverWrap}
    >
      <Image
        url={musicInfo.pic}
        style={{
          width: MINI_COVER_SIZE,
          height: MINI_COVER_SIZE,
          borderRadius: 4,
        }}
      />
    </TouchableOpacity>
  )
}

const Title = ({ centered }: { centered: boolean }) => {
  const theme = useTheme()
  const musicInfo = usePlayerMusicInfo()

  return (
    <View style={[styles.titleContent, centered && styles.titleContentCentered]}>
      <Text numberOfLines={1} style={[styles.title, centered && styles.titleCentered]}>
        {musicInfo.name}
      </Text>
      <Text numberOfLines={1} style={[styles.title, centered && styles.titleCentered]} size={12} color={theme['c-font-label']}>
        {musicInfo.singer}
      </Text>
    </View>
  )
}

export default memo(({ showMiniCover = false, onPressMiniCover }: {
  showMiniCover?: boolean
  onPressMiniCover?: () => void
}) => {
  const popupRef = useRef<SettingPopupType>(null)
  const statusBarHeight = useStatusbarHeight()

  const back = () => {
    void pop(commonState.componentIds.playDetail!)
  }
  const showSetting = () => {
    popupRef.current?.show()
  }

  return (
    <View style={{ height: HEADER_HEIGHT + statusBarHeight, paddingTop: statusBarHeight }} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_header}>
      <StatusBar />
      <View style={styles.container}>
        <Btn icon="chevron-left" onPress={back} />
        { showMiniCover ? <MiniCover onPress={onPressMiniCover} /> : null }
        <Title centered={!showMiniCover} />
        <Btn icon="slider" onPress={showSetting} />
      </View>
      <SettingPopup ref={popupRef} direction="vertical" />
    </View>
  )
})


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  miniCoverWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  titleContent: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  titleContentCentered: {
    alignItems: 'center',
  },
  title: {},
  titleCentered: {
    textAlign: 'center',
    width: '100%',
  },
  icon: {
    paddingLeft: 4,
    paddingRight: 4,
  },
})
