import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, View, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useWindowSize } from '@/utils/hooks'
import { NAV_SHEAR_NATIVE_IDS } from '@/config/constant'
import { useNavigationComponentDidAppear } from '@/navigation'
import { HEADER_HEIGHT } from './components/Header'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import { useStatusbarHeight } from '@/store/common/hook'
import commonState from '@/store/common/state'
import { useLrcPlay, useLrcSet } from '@/plugins/lyric'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'

interface MiniLyricDisplay {
  primaryText: string
  extraLines: string[]
  isNextPreview: boolean
}

const buildDisplay = (lyricLines: ReturnType<typeof useLrcSet>, line: number): MiniLyricDisplay => {
  if (!lyricLines.length) return { primaryText: '', extraLines: [], isNextPreview: false }
  const activeIdx = line >= 0 && line < lyricLines.length ? line : 0
  const activeLine = lyricLines[activeIdx]
  const extended = (activeLine?.extendedLyrics ?? []).map(t => t?.trim() ?? '').filter(Boolean)
  if (extended.length > 0) {
    return {
      primaryText: activeLine?.text ?? '',
      extraLines: extended.slice(0, 2),
      isNextPreview: false,
    }
  }
  const nextLine = lyricLines[activeIdx + 1]?.text?.trim() ?? ''
  return {
    primaryText: activeLine?.text ?? '',
    extraLines: nextLine ? [nextLine] : [],
    isNextPreview: true,
  }
}

const LyricBlock = memo(({ display }: { display: MiniLyricDisplay }) => {
  const theme = useTheme()
  return (
    <View style={styles.lyricBlock}>
      <Text
        numberOfLines={1}
        size={14}
        color={theme['c-primary']}
        style={styles.miniLyricPrimary}
      >
        {display.primaryText || ' '}
      </Text>
      {display.extraLines.map((extra, idx) => (
        <Text
          key={idx}
          numberOfLines={1}
          size={idx == 0 ? 12 : 11}
          color={theme['c-font-label']}
          style={display.isNextPreview ? styles.miniLyricNext : styles.miniLyricExtra}
        >
          {extra}
        </Text>
      ))}
    </View>
  )
})

const MiniLyric = memo(({ onPress }: { onPress?: () => void }) => {
  const lyricLines = useLrcSet()
  const { line } = useLrcPlay()

  const nextDisplay = useMemo(() => buildDisplay(lyricLines, line), [lyricLines, line])
  const [currentDisplay, setCurrentDisplay] = useState<MiniLyricDisplay>(nextDisplay)
  const [prevDisplay, setPrevDisplay] = useState<MiniLyricDisplay | null>(null)

  const animProgress = useRef(new Animated.Value(1)).current
  const prevKeyRef = useRef('')

  useEffect(() => {
    const nextKey = `${nextDisplay.primaryText}\n${nextDisplay.extraLines.join('\n')}`
    if (prevKeyRef.current === nextKey) return
    const hadPrevious = prevKeyRef.current !== ''
    prevKeyRef.current = nextKey

    if (!hadPrevious) {
      setCurrentDisplay(nextDisplay)
      setPrevDisplay(null)
      animProgress.setValue(1)
      return
    }

    setPrevDisplay(currentDisplay)
    setCurrentDisplay(nextDisplay)
    animProgress.stopAnimation()
    animProgress.setValue(0)
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPrevDisplay(null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextDisplay])

  const incomingTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  })
  const outgoingTranslateY = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  })
  const outgoingOpacity = animProgress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.15, 0],
  })

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.miniLyricContainer}
    >
      {prevDisplay ? (
        <Animated.View
          pointerEvents="none"
          style={{
            ...styles.animatedLayer,
            opacity: outgoingOpacity,
            transform: [{ translateY: outgoingTranslateY }],
          }}
        >
          <LyricBlock display={prevDisplay} />
        </Animated.View>
      ) : null}
      <Animated.View
        style={{
          ...styles.animatedLayer,
          opacity: animProgress,
          transform: [{ translateY: incomingTranslateY }],
        }}
      >
        <LyricBlock display={currentDisplay} />
      </Animated.View>
    </TouchableOpacity>
  )
})

export default ({ componentId, onPressLyric }: {
  componentId: string
  onPressLyric?: () => void
}) => {
  const musicInfo = usePlayerMusicInfo()
  const { width: winWidth, height: winHeight } = useWindowSize()
  const statusBarHeight = useStatusbarHeight()

  const [animated, setAnimated] = useState(!!commonState.componentIds.playDetail)
  const [pic, setPic] = useState(musicInfo.pic)
  useEffect(() => {
    if (animated) setPic(musicInfo.pic)
  }, [musicInfo.pic, animated])

  useNavigationComponentDidAppear(componentId, () => {
    setAnimated(true)
  })

  const style = useMemo(() => {
    const imgWidth = Math.min(winWidth * 0.76, (winHeight - statusBarHeight - HEADER_HEIGHT) * 0.43)
    return {
      width: imgWidth,
      height: imgWidth,
      borderRadius: 6,
    }
  }, [statusBarHeight, winHeight, winWidth])

  return (
    <View style={styles.container}>
      <View style={{ ...styles.content, elevation: animated ? 3 : 0 }}>
        <Image url={pic} nativeID={NAV_SHEAR_NATIVE_IDS.playDetail_pic} style={style} />
      </View>
      <MiniLyric onPress={onPressLyric} />
    </View>
  )
}

const styles = createStyle({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'rgba(0,0,0,0)',
    borderRadius: 6,
  },
  miniLyricContainer: {
    width: '100%',
    height: scaleSizeH(76),
    marginTop: scaleSizeH(16),
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  animatedLayer: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lyricBlock: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLyricPrimary: {
    textAlign: 'center',
    width: '100%',
    fontWeight: '500',
  },
  miniLyricExtra: {
    textAlign: 'center',
    width: '100%',
    marginTop: 4,
  },
  miniLyricNext: {
    textAlign: 'center',
    width: '100%',
    marginTop: 5,
    opacity: 0.78,
  },
})
