import { playList } from '@/core/player/player'
import { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react'
import { Animated, FlatList, PanResponder, Vibration, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type FlatListProps } from 'react-native'

import listState from '@/store/list/state'
import playerState from '@/store/player/state'
import { getListPosition, getListPrevSelectId, saveListPosition } from '@/utils/data'
import { getListMusics, setActiveList, updateListMusicPosition } from '@/core/list'
import ListItem, { ITEM_HEIGHT } from './ListItem'
import { createStyle, getRowInfo } from '@/utils/tools'
import { usePlayInfo, usePlayMusicInfo } from '@/store/player/hook'
import type { Position } from './ListMenu'
import type { SelectMode } from './MultipleModeBar'
import { useActiveListId } from '@/store/list/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'

type FlatListType = FlatListProps<LX.Music.MusicInfo>

interface DragSession {
  item: LX.Music.MusicInfo
  fromIndex: number
  targetIndex: number
  isFromLongPress: boolean
  isVisualDragging: boolean
}

export interface ListProps {
  onShowMenu: (musicInfo: LX.Music.MusicInfo, index: number, position: Position) => void
  onMuiltSelectMode: () => void
  onSelectAll: (isAll: boolean) => void
  onSelectedCountChange?: (count: number) => void
}
export interface ListType {
  setIsMultiSelectMode: (isMultiSelectMode: boolean) => void
  setSelectMode: (mode: SelectMode) => void
  selectAll: (isAll: boolean) => void
  getSelectedList: () => LX.List.ListMusics
  scrollToInfo: (info: LX.Music.MusicInfo) => void
  scrollToTop: () => void
}

const usePlayIndex = () => {
  const activeListId = useActiveListId()
  const playMusicInfo = usePlayMusicInfo()
  const playInfo = usePlayInfo()

  const playIndex = useMemo(() => {
    return playMusicInfo.listId == activeListId ? playInfo.playIndex : -1
  }, [activeListId, playInfo.playIndex, playMusicInfo.listId])

  return playIndex
}


const List = forwardRef<ListType, ListProps>(({ onShowMenu, onMuiltSelectMode, onSelectAll, onSelectedCountChange }, ref) => {
  const theme = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const [currentList, setList] = useState<LX.List.ListMusics>([])
  const currentListRef = useRef<LX.List.ListMusics>([])
  const listFirstScrollRef = useRef(false)
  const isMultiSelectModeRef = useRef(false)
  const [isMultiSelectMode, setIsMultiSelectModeState] = useState(false)
  const selectModeRef = useRef<SelectMode>('single')
  const prevSelectIndexRef = useRef(-1)
  const [selectedList, setSelectedList] = useState<LX.List.ListMusics>([])
  const selectedListRef = useRef<LX.List.ListMusics>([])
  const currentListIdRef = useRef('')
  const waitJumpListPositionRef = useRef(false)
  const rowInfo = useRef(getRowInfo())
  const isShowAlbumName = useSettingValue('list.isShowAlbumName')
  const isShowInterval = useSettingValue('list.isShowInterval')

  // Drag-to-reorder refs & state
  const scrollOffsetRef = useRef(0)
  const listHeightRef = useRef(0)
  const dragSessionRef = useRef<DragSession | null>(null)
  const [dragSession, setDragSession] = useState<DragSession | null>(null)
  const dragYAnim = useRef(new Animated.Value(0)).current
  const initialRowTopRef = useRef(0)
  const hasMovedDuringDragRef = useRef(false)
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastDyRef = useRef(0)

  const syncList = useCallback((nextList: LX.List.ListMusics) => {
    currentListRef.current = nextList
    setList(nextList)
  }, [])

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current)
      autoScrollTimerRef.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    setIsMultiSelectMode(isMultiSelectMode) {
      isMultiSelectModeRef.current = isMultiSelectMode
      setIsMultiSelectModeState(isMultiSelectMode)
      if (!isMultiSelectMode) {
        prevSelectIndexRef.current = -1
        handleUpdateSelectedList([])
      }
    },
    setSelectMode(mode) {
      selectModeRef.current = mode
    },
    selectAll(isAll) {
      let list: LX.List.ListMusics
      if (isAll) {
        list = [...currentList]
      } else {
        list = []
      }
      selectedListRef.current = list
      setSelectedList(list)
      onSelectedCountChange?.(list.length)
    },
    getSelectedList() {
      return selectedListRef.current
    },
    scrollToInfo(info) {
      void getListMusics(listState.activeListId).then((list) => {
        const index = list.findIndex(m => m.id == info.id)
        if (index < 0) return
        flatListRef.current?.scrollToIndex({ index: Math.floor(index / (rowInfo.current.rowNum ?? 1)), viewPosition: 0.3, animated: true })
      })
    },
    scrollToTop() {
      flatListRef.current?.scrollToOffset({
        offset: 0,
        animated: true,
      })
    },
  }))

  useEffect(() => {
    let isUpdateingList = true
    const updateList = (id: string) => {
      if (currentListIdRef.current == id) return
      isUpdateingList = true
      syncList([])
      currentListIdRef.current = id
      void Promise.all([getListMusics(id), getListPosition(id)]).then(([list, position]) => {
        requestAnimationFrame(() => {
          if (currentListIdRef.current != id) return
          selectedListRef.current = []
          setSelectedList([])
          onSelectedCountChange?.(0)
          syncList([...list])
          requestAnimationFrame(() => {
            isUpdateingList = false
            listFirstScrollRef.current = true
            if (waitJumpListPositionRef.current) {
              waitJumpListPositionRef.current = false
              if (playerState.playMusicInfo.listId == id && playerState.playInfo.playIndex > -1) {
                try {
                  flatListRef.current?.scrollToIndex({ index: Math.floor(playerState.playInfo.playIndex / (rowInfo.current.rowNum ?? 1)), viewPosition: 0.3, animated: false })
                  return
                } catch {}
              }
            }
            scrollOffsetRef.current = position
            flatListRef.current?.scrollToOffset({ offset: position, animated: false })
          })
        })
      })
    }
    const handleChange = (ids: string[]) => {
      if (!ids.includes(listState.activeListId)) return
      const id = listState.activeListId
      void getListMusics(id).then((list) => {
        if (currentListIdRef.current != id) return
        selectedListRef.current = []
        setSelectedList([])
        onSelectedCountChange?.(0)
        syncList([...list])
      })
    }

    const handleJumpPosition = () => {
      let listId = playerState.playMusicInfo.listId
      if (!listId) return
      if (listId != listState.activeListId) {
        setActiveList(listId)
        if (currentListIdRef.current != listId) waitJumpListPositionRef.current = true
      } else if (playerState.playInfo.playIndex > -1) {
        if (isUpdateingList) waitJumpListPositionRef.current = true
        else {
          try {
            flatListRef.current?.scrollToIndex({ index: Math.floor(playerState.playInfo.playIndex / (rowInfo.current.rowNum ?? 1)), viewPosition: 0.3, animated: true })
          } catch {}
        }
      }
    }
    if (listState.activeListId) updateList(listState.activeListId)
    else {
      void getListPrevSelectId().then((id) => {
        updateList(id)
      })
    }

    global.state_event.on('mylistToggled', updateList)
    global.app_event.on('myListMusicUpdate', handleChange)
    global.app_event.on('jumpListPosition', handleJumpPosition)

    return () => {
      stopAutoScroll()
      global.state_event.off('mylistToggled', updateList)
      global.app_event.off('myListMusicUpdate', handleChange)
      global.app_event.off('jumpListPosition', handleJumpPosition)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activeIndex = usePlayIndex()
  const handlePlay = (index: number) => {
    void playList(listState.activeListId, index)
  }

  const handleUpdateSelectedList = useCallback((newList: LX.List.ListMusics) => {
    if (selectedListRef.current.length && newList.length == currentListRef.current.length) onSelectAll(true)
    else if (selectedListRef.current.length == currentListRef.current.length) onSelectAll(false)
    selectedListRef.current = newList
    setSelectedList(newList)
    onSelectedCountChange?.(newList.length)
  }, [onSelectAll, onSelectedCountChange])

  const handleSelect = (item: LX.Music.MusicInfo, pressIndex: number) => {
    let newList: LX.List.ListMusics
    if (selectModeRef.current == 'single') {
      prevSelectIndexRef.current = pressIndex
      const index = selectedListRef.current.indexOf(item)
      if (index < 0) {
        newList = [...selectedListRef.current, item]
      } else {
        newList = [...selectedListRef.current]
        newList.splice(index, 1)
      }
    } else {
      if (selectedListRef.current.length) {
        const prevIndex = prevSelectIndexRef.current
        const currentIndex = pressIndex
        if (prevIndex == currentIndex) {
          newList = []
        } else if (currentIndex > prevIndex) {
          newList = currentList.slice(prevIndex, currentIndex + 1)
        } else {
          newList = currentList.slice(currentIndex, prevIndex + 1)
          newList.reverse()
        }
      } else {
        newList = [item]
        prevSelectIndexRef.current = pressIndex
      }
    }

    handleUpdateSelectedList(newList)
  }

  const computeTargetIndex = useCallback((ghostTopY: number) => {
    const listLen = currentListRef.current.length
    if (listLen <= 1) return 0
    const rawIndex = Math.round((ghostTopY + scrollOffsetRef.current) / ITEM_HEIGHT)
    return Math.max(0, Math.min(listLen - 1, rawIndex))
  }, [])

  const finishDrag = useCallback(() => {
    stopAutoScroll()
    const session = dragSessionRef.current
    if (!session) return
    dragSessionRef.current = null
    setDragSession(null)

    const moved = hasMovedDuringDragRef.current
    hasMovedDuringDragRef.current = false
    lastDyRef.current = 0

    if (session.isFromLongPress && !moved) {
      // User long-pressed and released without dragging -> enter multi-select mode
      prevSelectIndexRef.current = session.fromIndex
      handleUpdateSelectedList([session.item])
      onMuiltSelectMode()
      return
    }

    if (session.targetIndex !== session.fromIndex) {
      // Optimistically reorder local list for instant visual response, then persist
      const nextList = [...currentListRef.current]
      const [movedItem] = nextList.splice(session.fromIndex, 1)
      if (movedItem) {
        nextList.splice(session.targetIndex, 0, movedItem)
        syncList(nextList)
      }
      void updateListMusicPosition(listState.activeListId, session.targetIndex, [session.item.id])
    }
  }, [handleUpdateSelectedList, onMuiltSelectMode, stopAutoScroll, syncList])

  const startDragSession = useCallback((item: LX.Music.MusicInfo, index: number, isFromLongPress: boolean) => {
    if ((rowInfo.current.rowNum ?? 1) > 1 || currentListRef.current.length <= 1) {
      if (isFromLongPress && !isMultiSelectModeRef.current) {
        prevSelectIndexRef.current = index
        handleUpdateSelectedList([item])
        onMuiltSelectMode()
      }
      return
    }

    Vibration.vibrate(isFromLongPress ? 15 : 10)
    const rowTop = index * ITEM_HEIGHT - scrollOffsetRef.current
    initialRowTopRef.current = rowTop
    hasMovedDuringDragRef.current = !isFromLongPress
    lastDyRef.current = 0
    dragYAnim.setValue(rowTop)

    const session: DragSession = {
      item,
      fromIndex: index,
      targetIndex: index,
      isFromLongPress,
      isVisualDragging: !isFromLongPress,
    }
    dragSessionRef.current = session
    setDragSession(session)
  }, [dragYAnim, handleUpdateSelectedList, onMuiltSelectMode])

  const updateDragPosition = useCallback((dy: number) => {
    const session = dragSessionRef.current
    if (!session) return
    lastDyRef.current = dy

    if (session.isFromLongPress && !hasMovedDuringDragRef.current && Math.abs(dy) < 8) {
      return
    }

    if (!hasMovedDuringDragRef.current) {
      hasMovedDuringDragRef.current = true
    }

    const maxVisibleTop = Math.max(0, listHeightRef.current - ITEM_HEIGHT)
    const nextTop = Math.max(0, Math.min(maxVisibleTop, initialRowTopRef.current + dy))
    dragYAnim.setValue(nextTop)

    const nextTarget = computeTargetIndex(nextTop)
    if (nextTarget !== session.targetIndex || !session.isVisualDragging) {
      const updated: DragSession = {
        ...session,
        targetIndex: nextTarget,
        isVisualDragging: true,
      }
      dragSessionRef.current = updated
      setDragSession(updated)
    }

    // Gentle auto-scroll near top or bottom edges
    const edgeZone = 48
    const maxScroll = Math.max(0, currentListRef.current.length * ITEM_HEIGHT - listHeightRef.current)
    if (nextTop < edgeZone && scrollOffsetRef.current > 0) {
      if (!autoScrollTimerRef.current) {
        autoScrollTimerRef.current = setInterval(() => {
          const curSession = dragSessionRef.current
          if (!curSession) { stopAutoScroll(); return }
          const nextOffset = Math.max(0, scrollOffsetRef.current - 12)
          scrollOffsetRef.current = nextOffset
          flatListRef.current?.scrollToOffset({ offset: nextOffset, animated: false })
          const ghostY = Math.max(0, Math.min(maxVisibleTop, initialRowTopRef.current + lastDyRef.current))
          const tIdx = computeTargetIndex(ghostY)
          if (tIdx !== curSession.targetIndex) {
            const u = { ...curSession, targetIndex: tIdx }
            dragSessionRef.current = u
            setDragSession(u)
          }
          if (nextOffset <= 0) stopAutoScroll()
        }, 25)
      }
    } else if (nextTop > maxVisibleTop - edgeZone && scrollOffsetRef.current < maxScroll) {
      if (!autoScrollTimerRef.current) {
        autoScrollTimerRef.current = setInterval(() => {
          const curSession = dragSessionRef.current
          if (!curSession) { stopAutoScroll(); return }
          const nextOffset = Math.min(maxScroll, scrollOffsetRef.current + 12)
          scrollOffsetRef.current = nextOffset
          flatListRef.current?.scrollToOffset({ offset: nextOffset, animated: false })
          const ghostY = Math.max(0, Math.min(maxVisibleTop, initialRowTopRef.current + lastDyRef.current))
          const tIdx = computeTargetIndex(ghostY)
          if (tIdx !== curSession.targetIndex) {
            const u = { ...curSession, targetIndex: tIdx }
            dragSessionRef.current = u
            setDragSession(u)
          }
          if (nextOffset >= maxScroll) stopAutoScroll()
        }, 25)
      }
    } else {
      stopAutoScroll()
    }
  }, [computeTargetIndex, dragYAnim, stopAutoScroll])

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_evt, gestureState) => {
      if (!dragSessionRef.current) return false
      return Math.abs(gestureState.dy) > 4 || !dragSessionRef.current.isFromLongPress
    },
    onMoveShouldSetPanResponderCapture: (_evt, gestureState) => {
      if (!dragSessionRef.current) return false
      return Math.abs(gestureState.dy) > 4 || !dragSessionRef.current.isFromLongPress
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_evt, gestureState) => {
      updateDragPosition(gestureState.dy)
    },
    onPanResponderRelease: () => {
      finishDrag()
    },
    onPanResponderTerminate: () => {
      finishDrag()
    },
  }), [finishDrag, updateDragPosition])

  const handlePress = (item: LX.Music.MusicInfo, index: number) => {
    if (dragSessionRef.current) return
    requestAnimationFrame(() => {
      if (!global.lx.homePagerIdle) return
      if (isMultiSelectModeRef.current) {
        handleSelect(item, index)
      } else {
        handlePlay(index)
      }
    })
  }

  const handleLongPress = (item: LX.Music.MusicInfo, index: number) => {
    if (isMultiSelectModeRef.current) return
    startDragSession(item, index, true)
  }

  const handleDragHandlePressIn = useCallback((item: LX.Music.MusicInfo, index: number) => {
    if (!isMultiSelectModeRef.current) return
    startDragSession(item, index, false)
  }, [startDragSession])

  const handleRowPressOut = useCallback(() => {
    if (dragSessionRef.current && !hasMovedDuringDragRef.current) {
      finishDrag()
    }
  }, [finishDrag])

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = nativeEvent.contentOffset.y
    if (listFirstScrollRef.current) {
      listFirstScrollRef.current = false
      return
    }
    void saveListPosition(listState.activeListId, nativeEvent.contentOffset.y)
  }

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    listHeightRef.current = e.nativeEvent.layout.height
  }, [])

  const renderItem: FlatListType['renderItem'] = ({ item, index }) => (
    <ListItem
      item={item}
      index={index}
      activeIndex={activeIndex}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressOut={handleRowPressOut}
      onDragHandlePressIn={handleDragHandlePressIn}
      onShowMenu={onShowMenu}
      selectedList={selectedList}
      isMultiSelectMode={isMultiSelectMode}
      isDragging={!!dragSession?.isVisualDragging && dragSession.fromIndex === index}
      rowInfo={rowInfo.current}
      isShowAlbumName={isShowAlbumName}
      isShowInterval={isShowInterval}
    />
  )
  const getkey: FlatListType['keyExtractor'] = item => item.id
  const getItemLayout: FlatListType['getItemLayout'] = (data, index) => {
    return { length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }
  }

  const dropIndicatorTop = dragSession?.isVisualDragging
    ? Math.max(
        0,
        Math.min(
          listHeightRef.current - 3,
          (dragSession.targetIndex > dragSession.fromIndex ? dragSession.targetIndex + 1 : dragSession.targetIndex) * ITEM_HEIGHT - scrollOffsetRef.current,
        ),
      )
    : -1

  return (
    <View style={styles.wrapper} onLayout={handleContainerLayout} {...panResponder.panHandlers}>
      <FlatList
        ref={flatListRef}
        style={styles.list}
        data={currentList}
        scrollEnabled={!dragSession}
        numColumns={rowInfo.current.rowNum}
        maxToRenderPerBatch={4}
        windowSize={8}
        removeClippedSubviews={false}
        initialNumToRender={12}
        renderItem={renderItem}
        keyExtractor={getkey}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {dragSession?.isVisualDragging && dropIndicatorTop >= 0 ? (
        <View
          pointerEvents="none"
          style={{
            ...styles.dropIndicator,
            top: dropIndicatorTop,
          }}
        >
          <View style={{ ...styles.dropDot, backgroundColor: theme['c-primary'] }} />
          <View style={{ ...styles.dropLine, backgroundColor: theme['c-primary'] }} />
        </View>
      ) : null}

      {dragSession?.isVisualDragging ? (
        <Animated.View
          pointerEvents="none"
          style={{
            ...styles.ghostRow,
            height: ITEM_HEIGHT,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-primary'],
            transform: [{ translateY: dragYAnim }],
          }}
        >
          <View style={styles.ghostInfo}>
            <Text size={15} color={theme['c-font']} numberOfLines={1} style={styles.ghostTitle}>
              {dragSession.item.name}
            </Text>
            <Text size={12} color={theme['c-font-label']} numberOfLines={1} style={styles.ghostSinger}>
              {dragSession.item.singer}
            </Text>
          </View>
          <Icon name="menu" size={16} color={theme['c-primary-font-active']} />
        </Animated.View>
      ) : null}
    </View>
  )
})


const styles = createStyle({
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  dropIndicator: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 19,
  },
  dropDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dropLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  ghostRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    elevation: 8,
    zIndex: 20,
    opacity: 0.96,
  },
  ghostInfo: {
    flex: 1,
    paddingRight: 10,
  },
  ghostTitle: {
    fontWeight: '500',
  },
  ghostSinger: {
    marginTop: 3,
  },
})

export default List
