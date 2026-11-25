import { useState, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react'
import { Animated, View, TouchableOpacity } from 'react-native'

import Text from '@/components/common/Text'
import Button from '@/components/common/Button'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { scaleSizeH } from '@/utils/pixelRatio'

export type SelectMode = 'single' | 'range'

export const MULTI_SELECT_BAR_HEIGHT = scaleSizeH(42)

export interface MultipleModeBarProps {
  onSwitchMode: (mode: SelectMode) => void
  onSelectAll: (isAll: boolean) => void
  onExitSelectMode: () => void
}
export interface MultipleModeBarType {
  show: () => void
  setIsSelectAll: (isAll: boolean) => void
  setSelectedCount: (count: number) => void
  setSwitchMode: (mode: SelectMode) => void
  exitSelectMode: () => void
}

export default forwardRef<MultipleModeBarType, MultipleModeBarProps>(({ onSelectAll, onSwitchMode, onExitSelectMode }, ref) => {
  const [visible, setVisible] = useState(false)
  const [animatePlayed, setAnimatPlayed] = useState(true)
  const animFade = useRef(new Animated.Value(0)).current
  const animTranslateY = useRef(new Animated.Value(0)).current
  const [selectMode, setSelectMode] = useState<SelectMode>('single')
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    show() {
      handleShow()
    },
    setIsSelectAll(isAll) {
      setIsSelectAll(isAll)
    },
    setSelectedCount(count) {
      setSelectedCount(count)
    },
    setSwitchMode(mode: SelectMode) {
      setSelectMode(mode)
    },
    exitSelectMode() {
      handleHide()
    },
  }))

  const handleShow = useCallback(() => {
    setVisible(true)
    setAnimatPlayed(false)
    requestAnimationFrame(() => {
      animTranslateY.setValue(-16)

      Animated.parallel([
        Animated.timing(animFade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setAnimatPlayed(true)
      })
    })
  }, [animFade, animTranslateY])

  const handleHide = useCallback(() => {
    setAnimatPlayed(false)
    Animated.parallel([
      Animated.timing(animFade, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(animTranslateY, {
        toValue: -16,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(finished => {
      if (!finished) return
      setVisible(false)
      setAnimatPlayed(true)
    })
  }, [animFade, animTranslateY])

  const animaStyle = useMemo(() => ({
    ...styles.container,
    height: MULTI_SELECT_BAR_HEIGHT,
    backgroundColor: theme['c-main-background'],
    borderBottomColor: theme['c-border-background'],
    opacity: animFade,
    transform: [
      { translateY: animTranslateY },
    ],
  }), [animFade, animTranslateY, theme])

  const handleSelectAll = useCallback(() => {
    const selectAll = !isSelectAll
    setIsSelectAll(selectAll)
    onSelectAll(selectAll)
  }, [isSelectAll, onSelectAll])

  const handleToggleRange = useCallback(() => {
    onSwitchMode(selectMode == 'range' ? 'single' : 'range')
  }, [onSwitchMode, selectMode])

  const component = useMemo(() => {
    const isRange = selectMode == 'range'
    const isEnglish = global.i18n.t('list_select_cancel') == 'Cancel'
    const countLabel = isEnglish ? `${selectedCount} selected` : `已选 ${selectedCount} 首`

    return (
      <Animated.View style={animaStyle}>
        <Text size={14} color={theme['c-font']} style={styles.countText} numberOfLines={1}>
          {countLabel}
        </Text>
        <View style={styles.rightActions}>
          <Button
            onPress={handleToggleRange}
            style={{
              ...styles.rangePill,
              backgroundColor: isRange ? theme['c-primary-alpha-900'] : theme['c-primary-input-background'],
              borderColor: isRange ? theme['c-primary-alpha-600'] : 'transparent',
            }}
          >
            <Text size={12} color={isRange ? theme['c-primary-font-active'] : theme['c-font-label']}>
              {global.i18n.t('list_select_range')}
            </Text>
          </Button>
          <TouchableOpacity onPress={handleSelectAll} style={styles.btn}>
            <Text size={13} color={theme['c-primary-font-active']}>
              {global.i18n.t(isSelectAll ? 'list_select_unall' : 'list_select_all')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExitSelectMode} style={styles.btn}>
            <Text size={13} color={theme['c-font-label']}>
              {global.i18n.t('list_select_cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    )
  }, [animaStyle, selectMode, selectedCount, theme, handleToggleRange, handleSelectAll, isSelectAll, onExitSelectMode])

  return !visible && animatePlayed ? null : component
})

const styles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingRight: 6,
    borderBottomWidth: BorderWidths.normal,
  },
  countText: {
    fontWeight: '500',
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangePill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: BorderWidths.normal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  btn: {
    height: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
