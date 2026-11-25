import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { BorderWidths } from '@/theme'
import { type SettingScreenIds } from '../Main'

import Basic from '../settings/Basic'
import Player from '../settings/Player'
import LyricDesktop from '../settings/LyricDesktop'
import Search from '../settings/Search'
import List from '../settings/List'
import Download from '../settings/Download'
import Sync from '../settings/Sync'
import Backup from '../settings/Backup'
import Other from '../settings/Other'
import Version from '../settings/Version'
import About from '../settings/About'

export interface VerticalSettingType {
  handleBack: () => boolean
}

interface SettingGroup {
  title: string
  items: Array<{ id: SettingScreenIds, icon: string }>
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: '常规与外观',
    items: [
      { id: 'basic', icon: 'setting' },
    ],
  },
  {
    title: '播放与歌词',
    items: [
      { id: 'player', icon: 'play-outline' },
      { id: 'lyric_desktop', icon: 'lyric-on' },
    ],
  },
  {
    title: '搜索与列表',
    items: [
      { id: 'search', icon: 'search-2' },
      { id: 'list', icon: 'menu' },
    ],
  },
  {
    title: '数据与系统',
    items: [
      { id: 'download', icon: 'download-2' },
      { id: 'sync', icon: 'share' },
      { id: 'backup', icon: 'sd-card' },
      { id: 'other', icon: 'slider' },
      { id: 'version', icon: 'available_updates' },
      { id: 'about', icon: 'help' },
    ],
  },
]

const renderSettingDetail = (id: SettingScreenIds) => {
  switch (id) {
    case 'player': return <Player />
    case 'lyric_desktop': return <LyricDesktop />
    case 'search': return <Search />
    case 'list': return <List />
    case 'download': return <Download />
    case 'sync': return <Sync />
    case 'backup': return <Backup />
    case 'other': return <Other />
    case 'version': return <Version />
    case 'about': return <About />
    case 'basic':
    default: return <Basic />
  }
}

export default forwardRef<VerticalSettingType, {}>((_props, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const [activeId, setActiveId] = useState<SettingScreenIds | null>(null)

  useImperativeHandle(ref, () => ({
    handleBack() {
      if (activeId !== null) {
        setActiveId(null)
        return true
      }
      return false
    },
  }), [activeId])

  const detailContent = useMemo(() => {
    if (!activeId) return null
    return renderSettingDetail(activeId)
  }, [activeId])

  if (activeId !== null) {
    return (
      <View style={styles.container}>
        <View
          style={{
            ...styles.subHeader,
            borderBottomColor: theme['c-border-background']
          }}
        >
          <TouchableOpacity
            style={styles.subHeaderBackBtn}
            activeOpacity={0.65}
            onPress={() => { setActiveId(null) }}
          >
            <Icon name="chevron-left" size={16} color={theme['c-primary-font-active']} />
            <Text style={styles.subHeaderBack} size={14} color={theme['c-primary-font-active']}>
              {t('nav_setting')}
            </Text>
          </TouchableOpacity>
          <View style={{ ...styles.subHeaderDivider, backgroundColor: theme['c-border-background'] }} />
          <Text style={styles.subHeaderTitle} size={15} numberOfLines={1} color={theme['c-font']}>
            {t(`setting_${activeId}`)}
          </Text>
        </View>
        <ScrollView keyboardShouldPersistTaps={'always'}>
          <View style={styles.detailBody}>
            {detailContent}
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.menuScroll}>
      {SETTING_GROUPS.map((group) => (
        <View key={group.title} style={styles.groupBlock}>
          <Text style={styles.groupTitle} size={12} color={theme['c-font-label']}>
            {group.title}
          </Text>
          <View
            style={{
              ...styles.groupCard,
              backgroundColor: theme['c-content-background'],
              borderColor: theme['c-border-background'],
            }}
          >
            {group.items.map((item, idx) => {
              const isLast = idx === group.items.length - 1
              return (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    ...styles.menuRow,
                    borderBottomWidth: isLast ? 0 : BorderWidths.normal,
                    borderBottomColor: theme['c-border-background'],
                  }}
                  activeOpacity={0.65}
                  onPress={() => {
                    global.lx.settingActiveId = item.id
                    setActiveId(item.id)
                  }}
                >
                  <View style={{ ...styles.iconBadge, backgroundColor: theme['c-primary-alpha-900'] }}>
                    <Icon name={item.icon} size={16} color={theme['c-primary-font-active']} />
                  </View>
                  <Text style={styles.rowTitle} size={15} color={theme['c-font']} numberOfLines={1}>
                    {t(`setting_${item.id}`)}
                  </Text>
                  <Icon name="chevron-right" size={14} color={theme['c-350']} />
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  menuScroll: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },
  groupBlock: {
    marginBottom: 16,
  },
  groupTitle: {
    paddingLeft: 8,
    paddingBottom: 6,
    fontWeight: '500',
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 14,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    flex: 1,
    fontWeight: '400',
  },
  subHeader: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    borderBottomWidth: BorderWidths.normal,
  },
  subHeaderBackBtn: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
  },
  subHeaderBack: {
    marginLeft: 4,
    fontWeight: '500',
  },
  subHeaderDivider: {
    width: 1,
    height: 16,
    marginLeft: 2,
    marginRight: 12,
  },
  subHeaderTitle: {
    flex: 1,
    fontWeight: '500',
  },
  detailBody: {
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 14,
    paddingBottom: 28,
  },
})
