import { useEffect, useRef, useState } from 'react'
import { Animated, AppState, Easing, ScrollView, TouchableOpacity, View } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import { createStyle, formatMusicName } from '@/utils/tools'

const MARQUEE_GAP = 36
const MARQUEE_SPEED = 32 // px per second
const MARQUEE_DELAY = 1800 // ms pause before scrolling

export default ({ isHome }: { isHome: boolean }) => {
  const musicInfo = usePlayerMusicInfo()
  const downloadFileName = useSettingValue('download.fileName')
  const theme = useTheme()

  const [containerWidth, setContainerWidth] = useState(0)
  const [measured, setMeasured] = useState<{ title: string, width: number }>({ title: '', width: 0 })
  const [foreground, setForeground] = useState(AppState.currentState === 'active')
  const translateX = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setForeground(state === 'active')
    })
    return () => { sub.remove() }
  }, [])

  const handlePress = () => {
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
  }

  const handleLongPress = () => {
    if (!isHome) return
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }

  const title = musicInfo.id
    ? musicInfo.singer
      ? formatMusicName(downloadFileName, musicInfo.name, musicInfo.singer)
      : musicInfo.name
    : 'LX Music'

  const textWidth = measured.title === title ? measured.width : 0
  const shouldScroll = foreground && containerWidth > 0 && textWidth > containerWidth + 2

  useEffect(() => {
    translateX.setValue(0)
    if (!shouldScroll) return
    const distance = textWidth + MARQUEE_GAP
    const duration = Math.max(2500, Math.round((distance / MARQUEE_SPEED) * 1000))
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(MARQUEE_DELAY),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => {
      loop.stop()
      translateX.setValue(0)
    }
  }, [title, shouldScroll, textWidth, translateX])

  return (
    <TouchableOpacity
      style={styles.container}
      onLongPress={handleLongPress}
      onPress={handlePress}
      activeOpacity={0.7}
      onLayout={e => {
        const w = Math.floor(e.nativeEvent.layout.width)
        if (w !== containerWidth) setContainerWidth(w)
      }}
    >
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        pointerEvents="none"
        style={styles.clip}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
          <Text
            key={title}
            style={styles.titleText}
            size={14}
            color={theme['c-font']}
            numberOfLines={1}
            onLayout={e => {
              const w = Math.ceil(e.nativeEvent.layout.width)
              setMeasured(prev => (prev.title === title && prev.width === w ? prev : { title, width: w }))
            }}
          >
            {title}
          </Text>
          {shouldScroll ? (
            <>
              <View style={styles.gap} />
              <Text style={styles.titleText} size={14} color={theme['c-font']} numberOfLines={1}>
                {title}
              </Text>
            </>
          ) : null}
        </Animated.View>
      </ScrollView>
    </TouchableOpacity>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    paddingHorizontal: 2,
    paddingBottom: 1,
    overflow: 'hidden',
  },
  clip: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap: {
    width: MARQUEE_GAP,
  },
  titleText: {
    fontWeight: '500',
  },
})
