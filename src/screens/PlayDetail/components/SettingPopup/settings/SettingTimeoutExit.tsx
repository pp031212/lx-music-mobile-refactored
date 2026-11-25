import { useRef } from 'react'
import { TouchableOpacity, View } from 'react-native'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import TimeoutExitEditModal, { type TimeoutExitEditModalType, useTimeInfo } from '@/components/TimeoutExitEditModal'
import { useTimeoutExitTimeInfo } from '@/core/player/timeoutExit'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'
import settingStyles from './style'

const formatTime = (time: number) => {
  const h = Math.trunc(time / 3600)
  const hStr = h ? `${h}:` : ''
  const rest = time % 3600
  const m = Math.trunc(rest / 60).toString().padStart(2, '0')
  const s = Math.trunc(rest % 60).toString().padStart(2, '0')
  return `${hStr}${m}:${s}`
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const modalRef = useRef<TimeoutExitEditModalType>(null)
  const timeInfo = useTimeInfo()
  const exitTimeInfo = useTimeoutExitTimeInfo()

  const handleShow = () => {
    modalRef.current?.show()
  }

  const label = timeInfo.active && exitTimeInfo.time >= 0
    ? t('timeout_exit_tip_on', { time: formatTime(exitTimeInfo.time) })
    : t('timeout_exit_tip_off')

  return (
    <View style={settingStyles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleShow}
        style={{
          ...localStyles.row,
          backgroundColor: theme['c-primary-input-background'],
          borderColor: timeInfo.active ? theme['c-primary-alpha-600'] : theme['c-border-background'],
        }}
      >
        <Icon
          name="music_time"
          size={16}
          color={timeInfo.active ? theme['c-primary-font-active'] : theme['c-font']}
          style={localStyles.leftIcon}
        />
        <Text
          size={14}
          color={timeInfo.active ? theme['c-primary-font-active'] : theme['c-font']}
          style={localStyles.label}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Icon name="chevron-right" size={14} color={theme['c-font-label']} />
      </TouchableOpacity>
      <TimeoutExitEditModal ref={modalRef} timeInfo={timeInfo} />
    </View>
  )
}

const localStyles = createStyle({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: BorderWidths.normal,
  },
  leftIcon: {
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontWeight: '500',
  },
})
