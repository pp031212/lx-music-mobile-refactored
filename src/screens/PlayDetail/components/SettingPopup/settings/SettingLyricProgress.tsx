import { TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import styles from './style'
import ToggleSwitch from './ToggleSwitch'

export default () => {
  const t = useI18n()
  const isShowLyricProgressSetting = useSettingValue('playDetail.isShowLyricProgressSetting')
  const handleToggle = () => {
    updateSetting({ 'playDetail.isShowLyricProgressSetting': !isShowLyricProgressSetting })
  }

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      accessibilityRole="switch"
      accessibilityState={{ checked: isShowLyricProgressSetting }}
      onPress={handleToggle}
      style={styles.switchRow}
    >
      <Text size={14} style={styles.switchLabel}>
        {t('play_detail_setting_show_lyric_progress_setting')}
      </Text>
      <ToggleSwitch value={isShowLyricProgressSetting} />
    </TouchableOpacity>
  )
}
