import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo, memo } from 'react'
import { View, TouchableOpacity, FlatList, type FlatListProps } from 'react-native'
import Popup, { type PopupType } from '@/components/common/Popup'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Badge from '@/components/common/Badge'
import { useTheme } from '@/store/theme/hook'
import { usePlayMusicInfo, usePlayInfo } from '@/store/player/hook'
import { getList } from '@/core/player/playInfo'
import { playList } from '@/core/player/player'
import { removeListMusics } from '@/core/list'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { BorderWidths } from '@/theme'

export interface PlayingQueuePopupType {
  show: () => void
  hide: () => void
}

const ITEM_HEIGHT = scaleSizeH(52)

const QueueItem = memo(({
  item,
  index,
  isActive,
  onPlay,
  onRemove,
}: {
  item: LX.Music.MusicInfo
  index: number
  isActive: boolean
  onPlay: (index: number) => void
  onRemove: (id: string) => void
}) => {
  const theme = useTheme()

  return (
    <View style={{ ...styles.itemRow, height: ITEM_HEIGHT, borderBottomColor: theme['c-border-background'] }}>
      <TouchableOpacity style={styles.itemLeft} activeOpacity={0.7} onPress={() => onPlay(index)}>
        {isActive ? (
          <Icon style={styles.sn} name="play-outline" size={14} color={theme['c-primary-font-active']} />
        ) : (
          <Text style={styles.sn} size={12} color={theme['c-350']}>{index + 1}</Text>
        )}
        <View style={styles.itemTextWrap}>
          <Text
            size={14}
            numberOfLines={1}
            color={isActive ? theme['c-primary-font-active'] : theme['c-font']}
          >
            {item.name}
          </Text>
          <View style={styles.subRow}>
            <Badge>{item.source.toUpperCase()}</Badge>
            <Text
              size={11}
              numberOfLines={1}
              color={isActive ? theme['c-primary-alpha-200'] : theme['c-450']}
            >
              {item.singer}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(item.id)}>
        <Icon name="close" size={13} color={theme['c-350']} />
      </TouchableOpacity>
    </View>
  )
})

export default forwardRef<PlayingQueuePopupType, {}>((_props, ref) => {
  const popupRef = useRef<PopupType>(null)
  const flatListRef = useRef<FlatList<LX.Music.MusicInfo>>(null)
  const playMusicInfo = usePlayMusicInfo()
  const playInfo = usePlayInfo()
  const theme = useTheme()
  const [queueList, setQueueList] = useState<LX.Music.MusicInfo[]>([])

  const currentListId = playInfo.playerListId ?? playMusicInfo.listId

  const listTitle = useMemo(() => {
    if (!currentListId) return global.i18n.t('list_name_temp')
    let name = ''
    switch (currentListId) {
      case LIST_IDS.TEMP:
        name = global.i18n.t('list_name_temp')
        break
      case LIST_IDS.DEFAULT:
        name = global.i18n.t('list_name_default')
        break
      case LIST_IDS.LOVE:
        name = global.i18n.t('list_name_love')
        break
      default:
        name = listState.allList.find(l => l.id === currentListId)?.name ?? global.i18n.t('list_name_default')
    }
    return `${name} (${queueList.length})`
  }, [currentListId, queueList.length])

  const refreshQueue = () => {
    const id = playerListIdOrFallback()
    if (!id) {
      setQueueList([])
      return
    }
    const raw = getList(id) as LX.Music.MusicInfo[]
    setQueueList([...raw])
  }

  const playerListIdOrFallback = () => {
    return playInfo.playerListId ?? playMusicInfo.listId
  }

  useImperativeHandle(ref, () => ({
    show() {
      refreshQueue()
      popupRef.current?.setVisible(true)
      setTimeout(() => {
        if (playInfo.playIndex > 0) {
          try {
            flatListRef.current?.scrollToIndex({
              index: Math.max(0, playInfo.playIndex - 2),
              animated: false,
            })
          } catch {}
        }
      }, 120)
    },
    hide() {
      popupRef.current?.setVisible(false)
    },
  }))

  useEffect(() => {
    const handleListChange = () => {
      refreshQueue()
    }
    global.app_event.on('myListMusicUpdate', handleListChange)
    return () => {
      global.app_event.off('myListMusicUpdate', handleListChange)
    }
  }, [currentListId])

  const handlePlayItem = (index: number) => {
    if (!currentListId) return
    void playList(currentListId, index)
  }

  const handleRemoveItem = (id: string) => {
    if (!currentListId || currentListId === LIST_IDS.DOWNLOAD) return
    void removeListMusics(currentListId, [id])
  }

  const renderItem: FlatListProps<LX.Music.MusicInfo>['renderItem'] = ({ item, index }) => (
    <QueueItem
      item={item}
      index={index}
      isActive={playInfo.playIndex === index}
      onPlay={handlePlayItem}
      onRemove={handleRemoveItem}
    />
  )

  const getItemLayout: FlatListProps<LX.Music.MusicInfo>['getItemLayout'] = (_data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })

  return (
    <Popup ref={popupRef} position="bottom" title={listTitle}>
      <View style={styles.container}>
        {queueList.length ? (
          <FlatList
            ref={flatListRef}
            data={queueList}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Text size={14} color={theme['c-font-label']}>当前暂无播放队列</Text>
          </View>
        )}
      </View>
    </Popup>
  )
})

const styles = createStyle({
  container: {
    maxHeight: '100%',
    minHeight: 240,
    paddingBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    borderBottomWidth: BorderWidths.normal,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  sn: {
    width: 34,
    textAlign: 'center',
  },
  itemTextWrap: {
    flex: 1,
    paddingRight: 6,
    justifyContent: 'center',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  removeBtn: {
    width: 44,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
