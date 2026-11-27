import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { useI18n } from '@/lang'
import { useNavActiveId } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { NAV_MENUS, type NAV_ID_Type } from '@/config/constant'
import { setNavActiveId } from '@/core/common'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { BorderWidths } from '@/theme'
import { useKeyboard } from '@/utils/hooks'
import { useSettingValue } from '@/store/setting/hook'

const TAB_BAR_HEIGHT = scaleSizeH(56)
const CORE_BOTTOM_TABS = new Set<NAV_ID_Type>(['nav_search', 'nav_songlist', 'nav_top', 'nav_love'])
const BOTTOM_MENUS = NAV_MENUS.filter(menu => CORE_BOTTOM_TABS.has(menu.id))

const TabItem = ({ id, icon }: { id: NAV_ID_Type, icon: string }) => {
  const t = useI18n()
  const activeId = useNavActiveId()
  const theme = useTheme()
  const isActive = activeId === id

  const handlePress = () => {
    if (isActive) return
    setNavActiveId(id)
  }

  return (
    <TouchableOpacity
      style={styles.tabItem}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <Icon
        name={icon}
        size={20}
        color={isActive ? theme['c-primary-font-active'] : theme['c-font-label']}
      />
      <Text
        style={styles.tabLabel}
        size={11}
        numberOfLines={1}
        color={isActive ? theme['c-primary-font-active'] : theme['c-font-label']}
      >
        {t(id)}
      </Text>
    </TouchableOpacity>
  )
}

export default memo(() => {
  const theme = useTheme()
  const { keyboardShown } = useKeyboard()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')

  if (autoHidePlayBar && keyboardShown) return null

  return (
    <View
      style={{
        ...styles.container,
        height: TAB_BAR_HEIGHT,
        backgroundColor: theme['c-content-background'],
        borderTopColor: theme['c-border-background'],
      }}
    >
      {BOTTOM_MENUS.map(menu => (
        <TabItem key={menu.id} id={menu.id} icon={menu.icon} />
      ))}
    </View>
  )
})

const styles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: BorderWidths.normal,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    marginTop: 3,
  },
})
