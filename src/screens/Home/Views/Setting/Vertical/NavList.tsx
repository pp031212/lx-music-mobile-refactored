import { memo, useCallback, useState } from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'

import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { SETTING_SCREENS, type SettingScreenIds } from '../Main'
import { useI18n } from '@/lang'
import { BorderRadius, BorderWidths } from '@/theme'

const ListItem = memo(({ id, activeId, onPress }: {
  onPress: (item: SettingScreenIds) => void
  activeId: string
  id: SettingScreenIds
}) => {
  const theme = useTheme()
  const t = useI18n()
  const active = activeId == id

  return (
    <View style={{ ...styles.listItem, backgroundColor: active ? theme['c-primary-background-active'] : 'transparent' }}>
      <TouchableOpacity style={styles.listName} onPress={() => onPress(id)}>
        <Text size={14} numberOfLines={1} color={active ? theme['c-primary-font-active'] : theme['c-font']}>
          {t(`setting_${id}`)}
        </Text>
      </TouchableOpacity>
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.id === nextProps.id &&
    prevProps.activeId != nextProps.id &&
    nextProps.activeId != nextProps.id
  )
})

export default ({ onChangeId }: {
  onChangeId: (id: SettingScreenIds) => void
}) => {
  const [activeId, setActiveId] = useState(global.lx.settingActiveId)
  const theme = useTheme()

  const handleChangeId = useCallback((id: SettingScreenIds) => {
    onChangeId(id)
    setActiveId(id)
    global.lx.settingActiveId = id
  }, [onChangeId])

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ ...styles.container, borderBottomColor: theme['c-border-background'] }}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps={'always'}
    >
      {SETTING_SCREENS.map(id => (
        <ListItem key={id} id={id} activeId={activeId} onPress={handleChangeId} />
      ))}
    </ScrollView>
  )
}

const styles = createStyle({
  container: {
    height: 48,
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: BorderWidths.normal,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 8,
  },
  listItem: {
    height: 36,
    paddingHorizontal: 14,
    marginHorizontal: 3,
    borderRadius: BorderRadius.normal,
  },
  listName: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
})
