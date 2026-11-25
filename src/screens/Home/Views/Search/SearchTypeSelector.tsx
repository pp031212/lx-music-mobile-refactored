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
      <View style={{ ...styles.segmentedTrack, backgroundColor: theme['c-primary-input-background'] }}>
        {list.map(item => {
          const isActive = type === item.id
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.75}
              onPress={() => handleTypeChange(item.id)}
              style={{
                ...styles.segmentItem,
                backgroundColor: isActive ? theme['c-content-background'] : 'transparent',
                elevation: isActive ? 2 : 0,
              }}
            >
              <Text
                size={13}
                style={isActive ? styles.activeText : styles.inactiveText}
                color={isActive ? theme['c-primary-font-active'] : theme['c-font-label']}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = createStyle({
  wrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: BorderWidths.normal,
  },
  segmentedTrack: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 10,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeText: {
    fontWeight: '500',
  },
  inactiveText: {
    fontWeight: '400',
  },
})
