import { useCallback, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import Input, { type InputType, type InputProps } from '@/components/common/Input'

export interface SearchInputProps {
  onChangeText: (text: string) => void
  onSubmit: (text: string) => void
  onBlur: () => void
  onTouchStart: () => void
}

export interface SearchInputType {
  setText: (text: string) => void
  focus: () => void
  blur: () => void
}

export default forwardRef<SearchInputType, SearchInputProps>(({ onChangeText, onSubmit, onBlur, onTouchStart }, ref) => {
  const [text, setText] = useState('')
  const inputRef = useRef<InputType>(null)

  useImperativeHandle(ref, () => ({
    setText(text) {
      setText(text)
    },
    focus() {
      inputRef.current?.focus()
    },
    blur() {
      inputRef.current?.blur()
    },
  }))

  const handleChangeText = (text: string) => {
    setText(text)
    onChangeText(text.trim())
  }

  const handleClearText = useCallback(() => {
    setText('')
    onChangeText('')
    onSubmit('')
  }, [onChangeText, onSubmit])

  const handleSubmit = useCallback<NonNullable<InputProps['onSubmitEditing']>>(({ nativeEvent: { text } }) => {
    onSubmit(text)
  }, [onSubmit])

  return (
    <Input
      ref={inputRef}
      placeholder="搜索歌曲、歌手或歌单..."
      value={text}
      onChangeText={handleChangeText}
      onBlur={onBlur}
      onSubmitEditing={handleSubmit}
      onClearText={handleClearText}
      onTouchStart={onTouchStart}
      clearBtn
    />
  )
})
