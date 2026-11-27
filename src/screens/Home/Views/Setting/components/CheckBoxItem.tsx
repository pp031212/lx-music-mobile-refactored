import { memo, useCallback, useEffect, useRef } from 'react'
import { Animated, TouchableOpacity, View } from 'react-native'
import { type CheckBoxProps } from '@/components/common/CheckBox'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle, tipDialog } from '@/utils/tools'

const ToggleSwitch = memo(({ value, disabled }: { value: boolean, disabled?: boolean }) => {
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
        ...styles.switchTrack,
        backgroundColor: value ? theme['c-primary'] : theme['c-primary-input-background'],
        borderColor: value ? theme['c-primary'] : theme['c-border-background'],
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Animated.View
        style={{
          ...styles.switchThumb,
          transform: [{ translateX }],
        }}
      />
    </View>
  )
})

export interface CheckBoxItemProps extends CheckBoxProps {
  flat?: boolean
}

export default memo(({ check, label, children, onChange, helpTitle, helpDesc, disabled = false, need = false, flat = false }: CheckBoxItemProps) => {
  const theme = useTheme()
  const isLocked = disabled || (need && check)

  const handleToggle = useCallback(() => {
    if (isLocked) return
    onChange?.(!check)
  }, [check, isLocked, onChange])

  const handleShowHelp = useCallback(() => {
    void tipDialog({
      title: helpTitle ?? '',
      message: helpDesc,
      btnText: global.i18n.t('understand'),
    })
  }, [helpDesc, helpTitle])

  return (
    <TouchableOpacity
      activeOpacity={isLocked ? 1 : 0.72}
      onPress={handleToggle}
      style={flat
        ? {
            ...styles.flatRow,
            borderBottomColor: theme['c-border-background'],
            opacity: disabled ? 0.55 : 1,
          }
        : {
            ...styles.card,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
            opacity: disabled ? 0.55 : 1,
          }}
    >
      <View style={styles.left}>
        {label ? (
          <Text size={14} color={theme['c-font']} style={styles.label}>
            {label}
          </Text>
        ) : (
          <View style={styles.customChild}>{children}</View>
        )}
        {(helpTitle ?? helpDesc) ? (
          <TouchableOpacity activeOpacity={0.65} style={styles.helpBtn} onPress={handleShowHelp}>
            <Icon size={15} name="help" color={theme['c-font-label']} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ToggleSwitch value={check} disabled={disabled} />
    </TouchableOpacity>
  )
})

const styles = createStyle({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    marginBottom: 8,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  label: {
    flexShrink: 1,
    lineHeight: 20,
  },
  customChild: {
    flexShrink: 1,
  },
  helpBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    justifyContent: 'center',
    flexShrink: 0,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    elevation: 2,
  },
})
