import { useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { TextInput, View, TouchableOpacity, StyleSheet, type TextInputProps } from 'react-native'
import { Icon } from '@/components/common/Icon'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { setSpText } from '@/utils/pixelRatio'

const styles = createStyle({
  content: {
    flexDirection: 'row',
    flexGrow: 1,
    flexShrink: 1,
    alignItems: 'center',
  },
  input: {
    borderRadius: 2,
    paddingTop: 0,
    paddingBottom: 0,
    height: 32,
    paddingLeft: 5,
    paddingRight: 0,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: 14,
  },
  clearBtnContent: {
    flexGrow: 0,
    flexShrink: 0,
  },
  clearBtn: {
    height: '70%',
    paddingLeft: 5,
    paddingRight: 5,
    justifyContent: 'center',
  },
})

export interface InputProps extends TextInputProps {
  onChangeText?: (value: string) => void
  onClearText?: () => void
  clearBtn?: boolean
  size?: number
}


export interface InputType {
  blur: () => void
  focus: () => void
  clear: () => void
  isFocused: () => boolean
}

export default forwardRef<InputType, InputProps>(({ onChangeText, onClearText, clearBtn, style, size = 14, ...props }, ref) => {
  const inputRef = useRef<TextInput>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    blur() {
      inputRef.current?.blur()
    },
    focus() {
      inputRef.current?.focus()
    },
    clear() {
      inputRef.current?.clear()
    },
    isFocused() {
      return inputRef.current?.isFocused() ?? false
    },
  }))

  const clearText = useCallback(() => {
    inputRef.current?.clear()
    onChangeText?.('')
    onClearText?.()
  }, [onChangeText, onClearText])

  const changeText = useCallback((text: string) => {
    onChangeText?.(text)
  }, [onChangeText])

  return (
    <View style={styles.content}>
      <TextInput
        autoCapitalize="none"
        onChangeText={changeText}
        autoComplete="off"
        style={StyleSheet.compose({ ...styles.input, color: theme['c-font'], fontSize: setSpText(size) }, style)}
        placeholderTextColor={theme['c-350']}
        selectionColor={theme['c-primary-light-100-alpha-300']}
        ref={inputRef} {...props} />
      {clearBtn
        ? <View style={styles.clearBtnContent}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearText}>
              <Icon name="remove" color={theme['c-400']} size={11} />
            </TouchableOpacity>
          </View>
        : null
      }
    </View>
  )
})
