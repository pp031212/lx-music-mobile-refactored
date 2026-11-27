import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Modal, { type ModalType as BaseModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Input, { type InputType } from '@/components/common/Input'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { BorderWidths } from '@/theme'
import { type Source } from '@/store/songlist/state'

export interface ModalProps {
  onOpenId: (id: string) => void
}
export interface ModalType {
  show: (source: Source) => void
}

export default forwardRef<ModalType, ModalProps>(({ onOpenId }, ref) => {
  const modalRef = useRef<BaseModalType>(null)
  const inputRef = useRef<InputType>(null)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const theme = useTheme()
  const t = useI18n()

  const handleShow = () => {
    setText('')
    modalRef.current?.setVisible(true)
  }

  useImperativeHandle(ref, () => ({
    show(_source: Source) {
      if (visible) handleShow()
      else {
        setVisible(true)
        requestAnimationFrame(() => {
          handleShow()
        })
      }
    },
  }))

  const handleClose = () => {
    modalRef.current?.setVisible(false)
  }

  const handleConfirm = () => {
    let id = text.trim()
    if (!id.length) return
    if (id.length > 500) id = id.substring(0, 500)
    modalRef.current?.setVisible(false)
    onOpenId(id)
  }

  const trimmed = text.trim()

  return (
    visible
      ? (
        <Modal onShow={() => inputRef.current?.focus()} ref={modalRef} bgHide={false} bgColor="rgba(0,0,0,0.38)" statusBarPadding={false}>
          <View style={styles.backdrop}>
            <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={handleClose} />
            <View
              style={{
                ...styles.sheet,
                backgroundColor: theme['c-content-background'],
              }}
            >
              <View style={styles.handleWrap}>
                <View style={{ ...styles.handle, backgroundColor: theme['c-border-background'] }} />
              </View>

              <View style={styles.header}>
                <Text size={16} color={theme['c-font']} style={styles.title}>
                  {t('songlist_open')}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.65}
                  onPress={handleClose}
                  style={styles.closeBtn}
                >
                  <Icon name="close" size={16} color={theme['c-font-label']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                <Input
                  ref={inputRef}
                  placeholder={t('songlist_open_input_placeholder')}
                  value={text}
                  onChangeText={setText}
                  onSubmitEditing={handleConfirm}
                  clearBtn
                  style={{
                    ...styles.input,
                    backgroundColor: theme['c-main-background'],
                    borderColor: theme['c-border-background'],
                  }}
                />
                <View
                  style={{
                    ...styles.tipBox,
                    backgroundColor: theme['c-main-background'],
                    borderColor: theme['c-border-background'],
                  }}
                >
                  <Text style={styles.tipText} size={12} color={theme['c-font-label']}>
                    {t('songlist_open_input_tip')}
                  </Text>
                </View>

                <View style={styles.footer}>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    onPress={handleClose}
                    style={{
                      ...styles.btn,
                      backgroundColor: theme['c-main-background'],
                      borderColor: theme['c-border-background'],
                      borderWidth: BorderWidths.normal,
                    }}
                  >
                    <Text size={14} color={theme['c-font']}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.78}
                    disabled={!trimmed}
                    onPress={handleConfirm}
                    style={{
                      ...styles.btn,
                      backgroundColor: theme['c-primary'],
                      opacity: trimmed ? 1 : 0.45,
                    }}
                  >
                    <Text size={14} color="#ffffff" style={styles.confirmText}>
                      {t('songlist_open')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
        )
      : null
  )
})

const styles = createStyle({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    paddingBottom: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  body: {
    gap: 12,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 12,
  },
  tipBox: {
    borderRadius: 10,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tipText: {
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontWeight: '600',
  },
})
