import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Modal, { type ModalType as BaseModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Input, { type InputType } from '@/components/common/Input'
import { createStyle, toast } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { cancelTimeoutExit, getTimeoutExitTime, onTimeUpdate, startTimeoutExit, stopTimeoutExit, useTimeoutExitTimeInfo } from '@/core/player/timeoutExit'
import { useI18n } from '@/lang'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import settingState from '@/store/setting/state'
import { BorderWidths } from '@/theme'
import ToggleSwitch from '@/screens/PlayDetail/components/SettingPopup/settings/ToggleSwitch'

const MAX_MIN = 1440
const QUICK_PRESETS = [15, 30, 45, 60] as const
const rxp = /([1-9]\d*)/

const formatTime = (time: number) => {
  const h = Math.trunc(time / 3600)
  const hStr = h ? `${h}:` : ''
  const rest = time % 3600
  const m = Math.trunc(rest / 60).toString().padStart(2, '0')
  const s = Math.trunc(rest % 60).toString().padStart(2, '0')
  return `${hStr}${m}:${s}`
}

const StatusSubtitle = () => {
  const theme = useTheme()
  const t = useI18n()
  const exitTimeInfo = useTimeoutExitTimeInfo()

  if (exitTimeInfo.time < 0 && !exitTimeInfo.isPlayedStop) return null

  return (
    <View style={{ ...styles.statusBanner, backgroundColor: theme['c-primary-alpha-900'] }}>
      <Icon name="music_time" size={14} color={theme['c-primary-font-active']} />
      <Text size={13} color={theme['c-primary-font-active']} style={styles.statusText}>
        {exitTimeInfo.time >= 0
          ? t('timeout_exit_tip_on', { time: formatTime(exitTimeInfo.time) })
          : t('timeout_exit_btn_wait_tip')}
      </Text>
    </View>
  )
}

export const useTimeInfo = () => {
  const [exitTimeInfo, setExitTimeInfo] = useState({
    cancelText: '',
    confirmText: '',
    isPlayedStop: false,
    active: false,
  })
  const t = useI18n()

  useEffect(() => {
    let active: boolean | null = null
    const remove = onTimeUpdate((time, isPlayedStop) => {
      if (time < 0) {
        if (active) {
          setExitTimeInfo({
            cancelText: isPlayedStop ? t('timeout_exit_btn_wait_cancel') : '',
            confirmText: '',
            isPlayedStop,
            active: false,
          })
          active = false
        }
      } else {
        if (active !== true) {
          setExitTimeInfo({
            cancelText: t('timeout_exit_btn_cancel'),
            confirmText: t('timeout_exit_btn_update'),
            isPlayedStop,
            active: true,
          })
          active = true
        }
      }
    })

    return () => {
      remove()
    }
  }, [t])

  return exitTimeInfo
}

export interface TimeoutExitEditModalType {
  show: () => void
}
interface TimeoutExitEditModalProps {
  timeInfo: ReturnType<typeof useTimeInfo>
}

export default forwardRef<TimeoutExitEditModalType, TimeoutExitEditModalProps>(({ timeInfo }, ref) => {
  const modalRef = useRef<BaseModalType>(null)
  const inputRef = useRef<InputType>(null)
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState('')
  const theme = useTheme()
  const t = useI18n()
  const timeoutExitPlayed = useSettingValue('player.timeoutExitPlayed')

  const handleShow = () => {
    setText(settingState.setting['player.timeoutExit'] || '')
    modalRef.current?.setVisible(true)
  }

  useImperativeHandle(ref, () => ({
    show() {
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

  const handleCancelTimer = () => {
    if (timeInfo.isPlayedStop) {
      cancelTimeoutExit()
      modalRef.current?.setVisible(false)
      return
    }
    if (timeInfo.active) {
      stopTimeoutExit()
      toast(t('timeout_exit_tip_cancel'))
    }
    modalRef.current?.setVisible(false)
  }

  const handleConfirm = () => {
    let timeStr = text.trim()
    if (rxp.test(timeStr)) {
      timeStr = RegExp.$1
      if (parseInt(timeStr) > MAX_MIN) {
        toast(t('timeout_exit_tip_max', { num: MAX_MIN }))
        return
      }
    } else {
      if (timeStr.length) toast(t('input_error'))
      return
    }
    const time = parseInt(timeStr)
    cancelTimeoutExit()
    startTimeoutExit(time * 60)
    toast(t('timeout_exit_tip_on', { time: formatTime(getTimeoutExitTime()) }))
    updateSetting({ 'player.timeoutExit': String(time) })
    modalRef.current?.setVisible(false)
  }

  const cancelLabel = timeInfo.cancelText || t('cancel')
  const confirmLabel = timeInfo.confirmText || t('confirm')

  return (
    visible
      ? (
        <Modal ref={modalRef} bgHide={false} bgColor="rgba(0,0,0,0.38)" statusBarPadding={false}>
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
                  {t('timeout_exit_tip_off')}
                </Text>
                <TouchableOpacity activeOpacity={0.65} onPress={handleClose} style={styles.closeBtn}>
                  <Icon name="close" size={16} color={theme['c-font-label']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                <StatusSubtitle />

                <View style={styles.presetsRow}>
                  {QUICK_PRESETS.map(mins => {
                    const selected = text.trim() === String(mins)
                    return (
                      <TouchableOpacity
                        key={mins}
                        activeOpacity={0.72}
                        onPress={() => { setText(String(mins)) }}
                        style={{
                          ...styles.presetChip,
                          backgroundColor: selected ? theme['c-primary-alpha-900'] : theme['c-main-background'],
                          borderColor: selected ? theme['c-primary'] : theme['c-border-background'],
                        }}
                      >
                        <Text
                          size={13}
                          color={selected ? theme['c-primary-font-active'] : theme['c-font']}
                          style={selected ? styles.presetActiveText : undefined}
                        >
                          {mins}{t('timeout_exit_min')}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>

                <View
                  style={{
                    ...styles.inputRow,
                    backgroundColor: theme['c-main-background'],
                    borderColor: theme['c-border-background'],
                  }}
                >
                  <Input
                    ref={inputRef}
                    keyboardType="number-pad"
                    placeholder={t('timeout_exit_input_tip')}
                    value={text}
                    onChangeText={setText}
                    onSubmitEditing={handleConfirm}
                    style={styles.input}
                  />
                  <Text size={13} color={theme['c-font-label']} style={styles.unitLabel}>
                    {t('timeout_exit_min')}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.72}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: timeoutExitPlayed }}
                  onPress={() => { updateSetting({ 'player.timeoutExitPlayed': !timeoutExitPlayed }) }}
                  style={{
                    ...styles.switchCard,
                    backgroundColor: theme['c-main-background'],
                    borderColor: theme['c-border-background'],
                  }}
                >
                  <Text size={14} color={theme['c-font']} style={styles.switchLabel}>
                    {t('timeout_exit_label_isPlayed')}
                  </Text>
                  <ToggleSwitch value={timeoutExitPlayed} />
                </TouchableOpacity>

                <View style={styles.footer}>
                  <TouchableOpacity
                    activeOpacity={0.72}
                    onPress={handleCancelTimer}
                    style={{
                      ...styles.btn,
                      backgroundColor: theme['c-main-background'],
                      borderColor: theme['c-border-background'],
                      borderWidth: BorderWidths.normal,
                    }}
                  >
                    <Text size={14} color={theme['c-font']}>{cancelLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.78}
                    disabled={!text.trim()}
                    onPress={handleConfirm}
                    style={{
                      ...styles.btn,
                      backgroundColor: theme['c-primary'],
                      opacity: text.trim() ? 1 : 0.45,
                    }}
                  >
                    <Text size={14} color="#ffffff" style={styles.confirmText}>
                      {confirmLabel}
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  statusText: {
    fontWeight: '500',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    borderWidth: BorderWidths.normal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetActiveText: {
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    paddingLeft: 12,
    paddingRight: 14,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 0,
  },
  unitLabel: {
    marginLeft: 8,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    lineHeight: 20,
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
