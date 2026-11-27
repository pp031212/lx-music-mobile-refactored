import { memo, useEffect, useRef } from 'react'
import { Animated, View } from 'react-native'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'

export default memo(({ value, disabled = false }: { value: boolean, disabled?: boolean }) => {
  const theme = useTheme()
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start()
  }, [anim, value])

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 20],
  })

  return (
    <View
      style={{
        ...styles.track,
        backgroundColor: value ? theme['c-primary'] : theme['c-primary-input-background'],
        borderColor: value ? theme['c-primary'] : theme['c-border-background'],
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Animated.View
        style={{
          ...styles.thumb,
          transform: [{ translateX }],
        }}
      />
    </View>
  )
})

const styles = createStyle({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    justifyContent: 'center',
    flexShrink: 0,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
})
