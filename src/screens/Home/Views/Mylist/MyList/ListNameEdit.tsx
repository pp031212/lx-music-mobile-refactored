import { useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import Input, { type InputType } from '@/components/common/Input'
import { Icon } from '@/components/common/Icon'
import { createUserList, updateUserList } from '@/core/list'
import { confirmDialog, createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useKeyboard } from '@/utils/hooks'
import { BorderWidths } from '@/theme'
import listState from '@/store/list/state'

export interface ListNameEditType {
  showCreate: (position: number) => void
  show: (listInfo: LX.List.UserListInfo) => void
}

export default forwardRef<ListNameEditType, {}>((_props, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const { keyboardShown, keyboardHeight } = useKeyboard()
  const modalRef = useRef<ModalType>(null)
  const inputRef = useRef<InputType>(null)
  const [mode, setMode] = useState<'create' | 'rename'>('create')
  const [text, setText] = useState('')
  const createPositionRef = useRef(0)
  const selectedListInfoRef = useRef<LX.List.UserListInfo | null>(null)

  const openModal = (initialText: string) => {
    setText(initialText)
    requestAnimationFrame(() => {
      modalRef.current?.setVisible(true)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 180)
    })
  }

  useImperativeHandle(ref, () => ({
    showCreate(position) {
      createPositionRef.current = position
      selectedListInfoRef.current = null
      setMode('create')
      openModal('')
    },
    show(listInfo) {
      selectedListInfoRef.current = listInfo
      setMode('rename')
      openModal(listInfo.name ?? '')
    },
  }))

  const close = () => {
    inputRef.current?.blur()
    modalRef.current?.setVisible(false)
  }

  const handleConfirm = async() => {
    let name = text.trim()
    if (!name.length) return
    if (name.length > 100) name = name.substring(0, 100)
    close()

    if (mode == 'rename' && selectedListInfoRef.current) {
      void updateUserList([{ ...selectedListInfoRef.current, name }])
      return
    }

    const confirmed = listState.userList.some(l => l.name == name)
      ? await confirmDialog({ message: global.i18n.t('list_duplicate_tip') })
      : true
    if (!confirmed) return
    const now = Date.now()
    void createUserList(createPositionRef.current, [{ id: `userlist_${now}`, name, locationUpdateTime: now }])
  }

  const canSubmit = text.trim().length > 0
  const title = mode == 'rename' ? t('list_rename_title') : t('list_create')

  return (
    <Modal ref={modalRef} bgColor="rgba(0,0,0,0.36)">
      <View
        style={{
          ...styles.backdrop,
          paddingBottom: keyboardShown ? keyboardHeight : 0,
        }}
        pointerEvents="box-none"
      >
        <View
          style={{
            ...styles.sheet,
            backgroundColor: theme['c-content-background'],
          }}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.grabberWrap}>
            <View style={{ ...styles.grabber, backgroundColor: theme['c-font-label'] }} />
          </View>
          <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
            <Text size={16} color={theme['c-font']} style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={close} style={styles.closeBtn}>
              <Icon name="close" size={16} color={theme['c-font-label']} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View
              style={{
                ...styles.inputWrap,
                backgroundColor: theme['c-primary-input-background'],
                borderColor: theme['c-border-background'],
              }}
            >
              <Input
                ref={inputRef}
                placeholder={t('list_create_input_placeholder')}
                value={text}
                onChangeText={setText}
                onSubmitEditing={() => { void handleConfirm() }}
                clearBtn
                style={styles.input}
              />
            </View>

            <View style={styles.footerBtns}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={close}
                style={{
                  ...styles.btn,
                  backgroundColor: theme['c-primary-input-background'],
                }}
              >
                <Text size={14} color={theme['c-font-label']}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={!canSubmit}
                onPress={() => { void handleConfirm() }}
                style={{
                  ...styles.btn,
                  backgroundColor: theme['c-primary'],
                  opacity: canSubmit ? 1 : 0.45,
                }}
              >
                <Text size={14} color="#fff" style={styles.confirmText}>
                  {t('confirm_button_text')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
})

const styles = createStyle({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  title: {
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputWrap: {
    height: 44,
    borderRadius: 10,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  input: {
    height: 38,
    fontSize: 15,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontWeight: '500',
  },
})
