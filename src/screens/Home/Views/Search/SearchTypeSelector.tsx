import { useEffect, useMemo, useState } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { createStyle } from '@/utils/tools'
import { type SearchType } from '@/store/search/state'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { getSearchSetting } from '@/utils/data'
import { BorderWidths } from '@/theme'

const SEARCH_TYPE_LIST = [
  'music',
  'songlist',
] as const

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const [type, setType] = useState<SearchType>('music')

  useEffect(() => {
    void getSearchSetting().then(info => {
      setType(info.type)
    })
  }, [])

  const list = useMemo(() => {
    return SEARCH_TYPE_LIST.map(item => ({ label: t(`search_type_${item}`), id: item }))
  }, [t])

  const handleTypeChange = (nextType: SearchType) => {
    if (nextType === type) return
    setType(nextType)
    global.app_event.searchTypeChanged(nextType)
  }

  return (
    <View style={{ ...styles.wrapper, borderBottomColor: theme['c-border-background'] }}>
      {list.map(item => {
        const isActive = type === item.id
        return (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => handleTypeChange(item.id)}
            style={styles.tabItem}
          >
            <Text
              size={14}
              style={isActive ? styles.activeText : styles.inactiveText}
              color={isActive ? theme['c-primary-font-active'] : theme['c-font-label']}
            >
              {item.label}
            </Text>
            {isActive ? (
              <View style={{ ...styles.indicator, backgroundColor: theme['c-primary'] }} />
            ) : null}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = createStyle({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 16,
    gap: 22,
    borderBottomWidth: BorderWidths.normal,
  },
  tabItem: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeText: {
    fontWeight: '700',
  },
  inactiveText: {
    fontWeight: '400',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 18,
    height: 2.5,
    borderRadius: 1.5,
  },
})
