import { memo, useEffect, useMemo, useState } from 'react'
import { TouchableOpacity, View, type LayoutChangeEvent } from 'react-native'
import Image from '@/components/common/Image'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import listState from '@/store/list/state'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'
import { scaleSizeW } from '@/utils/pixelRatio'
import { getListDetail } from '@/core/songlist'
import { getListExtraMeta, getListExtraMetaSync, saveListExtraMeta, type MyListExtraMeta } from '@/utils/listMetaCache'

const COVER_SIZE = scaleSizeW(74)

export default memo(({ listId, list, onHeightChange }: {
  listId: string
  list: LX.List.ListMusics
  onHeightChange?: (height: number) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const [meta, setMeta] = useState<MyListExtraMeta>(() => getListExtraMetaSync(listId) ?? {})
  const [descExpanded, setDescExpanded] = useState(false)

  const listInfo = useMemo(() => {
    if (!listId) return null
    return listState.userList.find(l => l.id === listId) ?? null
  }, [listId])

  const onlineSource = listInfo?.source
  const sourceListId = listInfo?.sourceListId
  const isCollectedOnlineList = Boolean(onlineSource && sourceListId)

  useEffect(() => {
    if (!isCollectedOnlineList) {
      onHeightChange?.(0)
      return
    }
    let cancelled = false
    setDescExpanded(false)
    const syncCached = getListExtraMetaSync(listId)
    setMeta(syncCached ?? {})

    void getListExtraMeta(listId).then((cached) => {
      if (cancelled) return
      if (cached) setMeta(cached)

      if (onlineSource && sourceListId && (!cached?.img || !cached?.desc)) {
        const cleanId = sourceListId.startsWith(`${onlineSource}__`)
          ? sourceListId.slice(onlineSource.length + 2)
          : sourceListId
        void getListDetail(cleanId, onlineSource, 1).then((detail) => {
          if (cancelled) return
          const fetched: MyListExtraMeta = {
            img: detail.info.img || cached?.img,
            desc: detail.info.desc || cached?.desc,
          }
          if (fetched.img || fetched.desc) {
            setMeta(fetched)
            void saveListExtraMeta(listId, fetched)
          }
        }).catch(() => {})
      }
    })

    return () => {
      cancelled = true
    }
  }, [isCollectedOnlineList, listId, onHeightChange, onlineSource, sourceListId])

  const fallbackCover = useMemo(() => {
    for (const song of list) {
      if (song.meta?.picUrl) return song.meta.picUrl
    }
    return undefined
  }, [list])

  if (!listInfo || !isCollectedOnlineList) return null

  const coverUrl = meta.img || fallbackCover
  const descText = meta.desc?.trim() ?? ''
  const isEnglish = t('nav_love') == 'My List'
  const countText = isEnglish ? `${list.length} tracks` : `共 ${list.length} 首歌曲`

  const handleLayout = (e: LayoutChangeEvent) => {
    onHeightChange?.(e.nativeEvent.layout.height)
  }

  return (
    <View
      onLayout={handleLayout}
      style={{
        ...styles.container,
        borderBottomColor: theme['c-border-background'],
      }}
    >
      <View style={styles.row}>
        <View style={{ ...styles.coverWrap, width: COVER_SIZE, height: COVER_SIZE }}>
          <Image url={coverUrl} style={styles.cover} />
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text size={15} color={theme['c-font']} numberOfLines={1} style={styles.title}>
              {listInfo.name}
            </Text>
            {onlineSource ? <Badge type="tertiary">{onlineSource.toUpperCase()}</Badge> : null}
          </View>
          <Text size={12} color={theme['c-font-label']} style={styles.count}>
            {countText}
          </Text>
          {descText ? (
            <TouchableOpacity activeOpacity={0.75} onPress={() => { setDescExpanded(v => !v) }}>
              <Text
                size={12}
                color={theme['c-font-label']}
                numberOfLines={descExpanded ? undefined : 3}
                style={styles.desc}
              >
                {descText}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: BorderWidths.normal,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coverWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  cover: {
    flex: 1,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontWeight: '500',
  },
  count: {
    marginTop: 4,
  },
  desc: {
    marginTop: 5,
    lineHeight: 17,
  },
})
