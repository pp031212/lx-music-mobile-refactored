import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Popup, { type PopupType } from '@/components/common/Popup'
import { setHomePagerScrollLocked } from '@/screens/Home/Vertical/Main'
import MusicList, { type MusicListType } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
} from '@/components/SourceSelector'
import { getBoardsList } from '@/core/leaderboard'
import { handleCollect, handlePlay } from '../listAction'
import boardState, { type BoardItem, type InitState } from '@/store/leaderboard/state'

type Sources = Readonly<InitState['sources']>
type SourceSelectorType = _SourceSelectorType<Sources>

export default () => {
  const theme = useTheme()
  const t = useI18n()
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const musicListRef = useRef<MusicListType>(null)
  const boardsScrollRef = useRef<ScrollView>(null)
  const allBoardsPopupRef = useRef<PopupType>(null)
  const boundInfo = useRef<{ source: LX.OnlineSource, id: string | null }>({ source: 'kw', id: null })
  const [boards, setBoards] = useState<BoardItem[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string>('')
  const [popupMounted, setPopupMounted] = useState(false)

  useEffect(() => {
    return () => {
      setHomePagerScrollLocked(false)
    }
  }, [])

  const lockPager = useCallback(() => {
    setHomePagerScrollLocked(true)
  }, [])

  const unlockPager = useCallback(() => {
    setHomePagerScrollLocked(false)
  }, [])

  const handleBoundChange = useCallback((source: LX.OnlineSource, id: string) => {
    boundInfo.current.id = id
    setActiveBoardId(id)
    musicListRef.current?.loadList(source, id)
    void saveLeaderboardSetting({
      source,
      boardId: id,
    })
  }, [])

  const onSelectBoard = useCallback((id: string) => {
    if (id === boundInfo.current.id) return
    handleBoundChange(boundInfo.current.source, id)
  }, [handleBoundChange])

  const onSourceChange = useCallback((source: LX.OnlineSource) => {
    boundInfo.current.source = source
    void getBoardsList(source).then(list => {
      if (!list.length) return
      const id = list[0].id
      setBoards(list)
      boardsScrollRef.current?.scrollTo({ x: 0, animated: false })
      requestAnimationFrame(() => {
        handleBoundChange(source, id)
      })
    })
  }, [handleBoundChange])

  useEffect(() => {
    void getLeaderboardSetting().then(({ source, boardId }) => {
      boundInfo.current.source = source
      boundInfo.current.id = boardId
      setActiveBoardId(boardId)
      sourceSelectorRef.current?.setSourceList(boardState.sources, source)
      void getBoardsList(source).then(list => {
        setBoards(list)
      })
      musicListRef.current?.loadList(source, boardId)
    })
  }, [])

  const activeBoard = useMemo(
    () => boards.find(b => b.id === activeBoardId) ?? null,
    [boards, activeBoardId],
  )

  const handleOpenAllBoards = useCallback(() => {
    if (popupMounted) {
      allBoardsPopupRef.current?.setVisible(true)
    } else {
      setPopupMounted(true)
      requestAnimationFrame(() => {
        allBoardsPopupRef.current?.setVisible(true)
      })
    }
  }, [popupMounted])

  const handlePlayAll = useCallback(() => {
    const id = boundInfo.current.id
    if (!id) return
    void handlePlay(id, boardState.listDetailInfo.list, 0, activeBoard?.name)
  }, [activeBoard])

  const handleCollectBoard = useCallback(() => {
    const id = boundInfo.current.id
    if (!id || !activeBoard) return
    void handleCollect(id, activeBoard.name, boundInfo.current.source)
  }, [activeBoard])

  const listHeader = useMemo(() => (
    <View style={styles.actionBar}>
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={handlePlayAll}
        style={{
          ...styles.playAllBtn,
          backgroundColor: theme['c-primary-alpha-900'],
          borderColor: theme['c-primary-alpha-700'],
        }}
      >
        <View style={{ ...styles.playIconCircle, backgroundColor: theme['c-primary'] }}>
          <Icon name="play" size={10} color="#ffffff" style={{ marginLeft: 1 }} />
        </View>
        <Text size={13} color={theme['c-primary-font-active']} style={styles.playAllText}>
          {t('play_all')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.72}
        onPress={handleCollectBoard}
        style={{
          ...styles.collectBtn,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
      >
        <Icon name="love" size={13} color={theme['c-font-label']} />
        <Text size={12} color={theme['c-font-label']} style={styles.collectText}>
          {t('collect_toplist')}
        </Text>
      </TouchableOpacity>
    </View>
  ), [handleCollectBoard, handlePlayAll, t, theme])

  return (
    <View style={{ ...styles.container, borderTopColor: theme['c-border-background'] }}>
      <View
        style={{ ...styles.topBar, borderBottomColor: theme['c-border-background'] }}
        onTouchStart={lockPager}
        onTouchEnd={unlockPager}
        onTouchCancel={unlockPager}
      >
        <View
          style={{
            ...styles.sourcePill,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        >
          <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} center />
        </View>
        <ScrollView
          ref={boardsScrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onTouchStart={lockPager}
          onTouchEnd={unlockPager}
          onTouchCancel={unlockPager}
          onScrollEndDrag={unlockPager}
          onMomentumScrollEnd={unlockPager}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {boards.map(board => {
            const selected = board.id === activeBoardId
            return (
              <TouchableOpacity
                key={board.id}
                activeOpacity={0.72}
                onPress={() => { onSelectBoard(board.id) }}
                style={{
                  ...styles.chip,
                  backgroundColor: selected ? theme['c-primary-alpha-900'] : theme['c-content-background'],
                  borderColor: selected ? theme['c-primary'] : theme['c-border-background'],
                }}
              >
                <Text
                  size={13}
                  numberOfLines={1}
                  color={selected ? theme['c-primary-font-active'] : theme['c-font']}
                  style={selected ? styles.chipTextActive : undefined}
                >
                  {board.name}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('nav_top')}
          onPress={handleOpenAllBoards}
          style={{
            ...styles.allBoardsBtn,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        >
          <Icon name="menu" size={14} color={theme['c-font-label']} />
        </TouchableOpacity>
      </View>

      <View style={styles.listWrap}>
        <MusicList ref={musicListRef} ListHeaderComponent={listHeader} />
      </View>

      {popupMounted ? (
        <Popup ref={allBoardsPopupRef} title={t('nav_top')}>
          <ScrollView contentContainerStyle={styles.popupScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.popupGrid}>
              {boards.map(board => {
                const selected = board.id === activeBoardId
                return (
                  <TouchableOpacity
                    key={board.id}
                    activeOpacity={0.72}
                    onPress={() => {
                      onSelectBoard(board.id)
                      allBoardsPopupRef.current?.setVisible(false)
                    }}
                    style={{
                      ...styles.popupChip,
                      backgroundColor: selected ? theme['c-primary-alpha-900'] : theme['c-main-background'],
                      borderColor: selected ? theme['c-primary'] : theme['c-border-background'],
                    }}
                  >
                    <Text
                      size={13}
                      numberOfLines={1}
                      color={selected ? theme['c-primary-font-active'] : theme['c-font']}
                      style={selected ? styles.chipTextActive : undefined}
                    >
                      {board.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </Popup>
      ) : null}
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
    flexDirection: 'column',
    borderTopWidth: BorderWidths.normal,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  sourcePill: {
    height: 32,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  chipsScroll: {
    flex: 1,
    height: '100%',
  },
  chipsContent: {
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipTextActive: {
    fontWeight: '600',
  },
  allBoardsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  listWrap: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    paddingRight: 13,
    height: 32,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    gap: 7,
  },
  playIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllText: {
    fontWeight: '600',
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    height: 30,
    borderRadius: 15,
    borderWidth: BorderWidths.normal,
    gap: 5,
  },
  collectText: {
    fontWeight: '500',
  },
  popupScroll: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
  },
  popupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
  },
})
