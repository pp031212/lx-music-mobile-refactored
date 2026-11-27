import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import CheckBox from './Checkbox'

import { createStyle, tipDialog } from '@/utils/tools'
import { scaleSizeH, scaleSizeW } from '@/utils/pixelRatio'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import Text from '../Text'
import { Icon } from '../Icon'

export interface CheckBoxProps {
  check: boolean
  label?: string
  children?: React.ReactNode
  onChange: (check: boolean) => void
  disabled?: boolean
  need?: boolean
  size?: number
  marginRight?: number
  marginBottom?: number

  helpTitle?: string
  helpDesc?: string
}

export default ({ check, label, children, onChange, helpTitle, helpDesc, disabled = false, need = false, marginRight = 0, marginBottom = 0, size = 1 }: CheckBoxProps) => {
  const theme = useTheme()
  const [isDisabled, setDisabled] = useState(false)
  const tintColors = {
    true: theme['c-primary'],
    false: theme['c-600'],
  }
  const disabledTintColors = {
    true: theme['c-primary-alpha-600'],
    false: theme['c-400'],
  }

  useEffect(() => {
    if (need) {
      if (check) {
        if (!isDisabled) setDisabled(true)
      } else {
        if (isDisabled) setDisabled(false)
      }
    } else {
      isDisabled && setDisabled(false)
    }
  }, [check, need, isDisabled])

  const handleLabelPress = useCallback(() => {
    if (isDisabled || disabled) return
    onChange?.(!check)
  }, [isDisabled, disabled, onChange, check])

  const helpComponent = useMemo(() => {
    const handleShowHelp = () => {
      void tipDialog({
        title: helpTitle ?? '',
        message: helpDesc,
        btnText: global.i18n.t('understand'),
      })
    }
    return (helpTitle ?? helpDesc) ? (
      <TouchableOpacity style={styles.helpBtn} onPress={handleShowHelp}>
        <Icon size={15 * size} name="help" color={theme['c-font-label']} />
      </TouchableOpacity>
    ) : null
  }, [helpTitle, helpDesc, size, theme])

  // Render radio-style single-select options (need=true) as modern mobile choice chips
  if (need && label && !children) {
    return (
      <View style={{ ...styles.chipWrap, marginRight: scaleSizeW(marginRight || 8), marginBottom: scaleSizeH(marginBottom || 8) }}>
        <TouchableOpacity
          activeOpacity={check || disabled ? 1 : 0.72}
          disabled={disabled || isDisabled}
          onPress={handleLabelPress}
          style={{
            ...styles.chip,
            backgroundColor: check ? theme['c-primary-alpha-900'] : theme['c-primary-input-background'],
            borderColor: check ? theme['c-primary'] : 'transparent',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text
            size={13 * size}
            color={check ? theme['c-primary-font-active'] : theme['c-font']}
            style={check ? styles.chipActiveText : styles.chipText}
          >
            {label}
          </Text>
        </TouchableOpacity>
        {helpComponent}
      </View>
    )
  }

  const contentStyle = { ...styles.content, marginBottom: scaleSizeH(marginBottom) }
  const labelStyle = { ...styles.label, marginRight: scaleSizeW(marginRight) }

  return (
    disabled
      ? (
          <View style={contentStyle}>
            <CheckBox status={check ? 'checked' : 'unchecked'} disabled={true} tintColors={disabledTintColors} size={size} />
            <View style={labelStyle}>{label ? <Text style={styles.name} color={theme['c-500']} size={15 * size}>{label}</Text> : children}</View>
            {helpComponent}
          </View>
        )
      : (
          <View style={contentStyle}>
            <CheckBox status={check ? 'checked' : 'unchecked'} disabled={isDisabled} onPress={handleLabelPress} tintColors={tintColors} size={size} />
            <TouchableOpacity style={labelStyle} activeOpacity={0.3} onPress={handleLabelPress}>
              {label ? <Text style={styles.name} size={15 * size}>{label}</Text> : children}
            </TouchableOpacity>
            {helpComponent}
          </View>
        )
  )
}

const styles = createStyle({
  content: {
    flexGrow: 0,
    flexShrink: 1,
    marginRight: 15,
    alignItems: 'center',
    flexDirection: 'row',
  },
  checkbox: {
    flex: 0,
  },
  label: {
    flexGrow: 0,
    flexShrink: 1,
    paddingRight: 3,
  },
  name: {
    marginTop: 2,
  },
  helpBtn: {
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 2,
    paddingBottom: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontWeight: '400',
  },
  chipActiveText: {
    fontWeight: '500',
  },
})
