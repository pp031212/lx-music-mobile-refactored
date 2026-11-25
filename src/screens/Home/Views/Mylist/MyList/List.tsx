import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'

import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import Button from '@/components/common/Button'
import Loading from '@/components/common/Loading'
import Image from '@/components/common/Image'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching, useMyList } from '@/store/list/hook'
import { createStyle } from '@/utils/tools'
import { LIST_IDS } from '@/config/constant'
import { setActiveList } from '@/core/list'
import { type Position } from './ListMenu'
import { BorderWidths } from '@/theme'
import { useI18n } from '@/lang'
import { getListDetail } from '@/core/songlist'
import { getListExtraMeta, getListExtraMetaSync, saveListExtraMeta } from '@/utils/listMetaCache'

const ListRow = memo(({ item, index, isLast, activeId, onPress, onShowMenu }: {
  item: LX.List.MyListInfo
  index: number
  isLast: boolean
  activeId: string
  onPress: (item: LX.List.MyListInfo) => void
  onShowMenu: (item: LX.List.MyListInfo, index: number, position: { x: number, y: number, w: number, h: number }) => void
}) => {
  const theme = useTheme()
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const fetching = useListFetching(item.id)
  const active = activeId == item.id

  const onlineSource = 'source' in item ? item.source : undefined
  const sourceListId = 'sourceListId' in item ? item.sourceListId : undefined
  const isCollectedOnlineList = Boolean(onlineSource && sourceListId)

  const [coverUrl, setCoverUrl] = useState<string | undefined>(() => (
    isCollectedOnlineList ? getListExtraMetaSync(item.id)?.img : undefined
  ))

  useEffect(() => {
    if (!isCollectedOnlineList) {
      setCoverUrl(undefined)
      return
    }
    let cancelled = false
    const syncCached = getListExtraMetaSync(item.id)?.img
    if (syncCached) setCoverUrl(syncCached)

    void getListExtraMeta(item.id).then((cached) => {
      if (cancelled) return
      if (cached?.img) {
        setCoverUrl(cached.img)
        return
      }
      if (onlineSource && sourceListId) {
        const cleanId = sourceListId.startsWith(`${onlineSource}__`)
          ? sourceListId.slice(onlineSource.length + 2)
          : sourceListId
        void getListDetail(cleanId, onlineSource, 1).then((detail) => {
          if (cancelled) return
          const img = detail.info.img
          const desc = detail.info.desc
          if (img || desc) {
            if (img) setCoverUrl(img)
            void saveListExtraMeta(item.id, { img, desc })
          }
        }).catch(() => {})
      }
    })

    return () => {
      cancelled = true
    }
  }, [isCollectedOnlineList, item.id, onlineSource, sourceListId])

  const iconName = item.id == LIST_IDS.LOVE
    ? 'love'
    : item.id == LIST_IDS.DEFAULT
      ? 'play-outline'
      : 'album'

  const sourceTag = onlineSource ? onlineSource.toUpperCase() : ''

  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }

  return (
    <View
      style={{
        ...styles.menuRow,
        borderBottomWidth: isLast ? 0 : BorderWidths.normal,
        borderBottomColor: theme['c-border-background'],
      }}
    >
      <TouchableOpacity
        style={styles.rowMain}
        activeOpacity={0.65}
        onPress={() => { onPress(item) }}
      >
        {isCollectedOnlineList && coverUrl ? (
          <View style={styles.coverThumbWrap}>
            <Image url={coverUrl} style={styles.coverThumb} />
          </View>
        ) : (
          <View style={{ ...styles.iconBadge, backgroundColor: active ? theme['c-primary-alpha-900'] : theme['c-primary-input-background'] }}>
            <Icon name={iconName} size={16} color={active ? theme['c-primary-font-active'] : theme['c-font-label']} />
          </View>
        )}
        {fetching ? <Loading color={theme['c-primary-font-active']} style={styles.loading} /> : null}
        <View style={styles.rowTitleWrap}>
          <Text
            style={styles.rowTitle}
            size={15}
            numberOfLines={1}
            color={active ? theme['c-primary-font-active'] : theme['c-font']}
          >
            {item.name}
          </Text>
          {sourceTag ? <Badge type="tertiary">{sourceTag}</Badge> : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.listMoreBtn}>
        <Icon name="dots-vertical" color={theme['c-400']} size={14} />
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.65} onPress={() => { onPress(item) }} style={styles.chevronBtn}>
        <Icon name="chevron-right" size={14} color={theme['c-350']} />
      </TouchableOpacity>
    </View>
  )
})

export default ({ onShowMenu, onSelectList, onCreateList }: {
  onShowMenu: (info: { listInfo: LX.List.MyListInfo, index: number }, position: Position) => void
  onSelectList?: () => void
  onCreateList?: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const allList = useMyList()
  const activeListId = useActiveListId()

  const { systemLists, customLists } = useMemo(() => {
    const sys: Array<{ item: LX.List.MyListInfo, index: number }> = []
    const custom: Array<{ item: LX.List.MyListInfo, index: number }> = []
    allList.forEach((item, index) => {
      if (item.id == LIST_IDS.DEFAULT || item.id == LIST_IDS.LOVE) {
        sys.push({ item, index })
      } else {
        custom.push({ item, index })
      }
    })
    return { systemLists: sys, customLists: custom }
  }, [allList])

  const handleToggleList = (item: LX.List.MyListInfo) => {
    setActiveList(item.id)
    onSelectList?.()
  }

  const showMenu = (listInfo: LX.List.MyListInfo, index: number, position: Position) => {
    onShowMenu({ listInfo, index }, position)
  }

  const isEnglish = t('nav_love') == 'My List'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topActionRow}>
        <Text size={12} color={theme['c-font-label']} style={styles.summaryText}>
          {isEnglish ? `${allList.length} playlists` : `共 ${allList.length} 个歌单`}
        </Text>
        <Button
          onPress={onCreateList}
          style={{
            ...styles.createBtn,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        >
          <Icon name="add_folder" size={13} color={theme['c-primary-font-active']} style={styles.createIcon} />
          <Text size={12} color={theme['c-font']}>
            {t('list_create')}
          </Text>
        </Button>
      </View>

      <View style={styles.groupBlock}>
        <Text style={styles.groupTitle} size={12} color={theme['c-font-label']}>
          {isEnglish ? 'Default' : '默认列表'}
        </Text>
        <View
          style={{
            ...styles.groupCard,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        >
          {systemLists.map(({ item, index }, idx) => (
            <ListRow
              key={item.id}
              item={item}
              index={index}
              isLast={idx === systemLists.length - 1}
              activeId={activeListId}
              onPress={handleToggleList}
              onShowMenu={showMenu}
            />
          ))}
        </View>
      </View>

      <View style={styles.groupBlock}>
        <Text style={styles.groupTitle} size={12} color={theme['c-font-label']}>
          {isEnglish ? `Created & Collected (${customLists.length})` : `自建与收藏歌单 (${customLists.length})`}
        </Text>
        <View
          style={{
            ...styles.groupCard,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        >
          {customLists.length > 0 ? (
            customLists.map(({ item, index }, idx) => (
              <ListRow
                key={item.id}
                item={item}
                index={index}
                isLast={idx === customLists.length - 1}
                activeId={activeListId}
                onPress={handleToggleList}
                onShowMenu={showMenu}
              />
            ))
          ) : (
            <View style={styles.emptyCustom}>
              <Text size={13} color={theme['c-font-label']}>
                {isEnglish ? 'No custom or collected playlists yet' : '暂无自建或收藏歌单，可点右上角新建或收藏在线歌单'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryText: {
    paddingLeft: 6,
  },
  createBtn: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: BorderWidths.normal,
  },
  createIcon: {
    marginRight: 5,
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
    height: 54,
    paddingLeft: 14,
    paddingRight: 8,
  },
  rowMain: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coverThumbWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  coverThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  loading: {
    marginRight: 6,
  },
  rowTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  rowTitle: {
    flexShrink: 1,
    fontWeight: '400',
  },
  listMoreBtn: {
    height: '100%',
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronBtn: {
    height: '100%',
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCustom: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
