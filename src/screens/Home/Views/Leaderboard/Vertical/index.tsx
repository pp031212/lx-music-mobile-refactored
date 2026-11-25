import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import MusicList, { type MusicListType } from '../MusicList'
import { getLeaderboardSetting, saveLeaderboardSetting } from '@/utils/data'
import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
} from '@/components/SourceSelector'
import BoardsList, { type BoardsListType, type BoardsListProps } from '../BoardsList'
import { getBoardsList } from '@/core/leaderboard'
import { handleCollect, handlePlay } from '../listAction'
import boardState, { type InitState } from '@/store/leaderboard/state'

type Sources = Readonly<InitState['sources']>
type SourceSelectorType = _SourceSelectorType<Sources>

export default () => {
  const theme = useTheme()
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const boardsListRef = useRef<BoardsListType>(null)
  const musicListRef = useRef<MusicListType>(null)
  const boundInfo = useRef<{ source: LX.OnlineSource, id: string | null }>({ source: 'kw', id: null })

  const handleBoundChange = (source: LX.OnlineSource, id: string) => {
    musicListRef.current?.loadList(source, id)
    void saveLeaderboardSetting({
      source,
      boardId: id,
    })
  }

  const onBoundChange: BoardsListProps['onBoundChange'] = (id) => {
    boundInfo.current.id = id
    handleBoundChange(boundInfo.current.source, id)
  }

  const onPlay: BoardsListProps['onPlay'] = (id) => {
    boundInfo.current.id = id
    void handlePlay(id, boardState.listDetailInfo.list)
  }

  const onCollect: BoardsListProps['onCollect'] = (id, name) => {
    boundInfo.current.id = id
    void handleCollect(id, name, boundInfo.current.source)
  }

  const onSourceChange = (source: LX.OnlineSource) => {
    boundInfo.current.source = source
    void getBoardsList(source).then(list => {
      if (!list.length) return
      const id = list[0].id
      boundInfo.current.id = id
      requestAnimationFrame(() => {
        boardsListRef.current?.setList(list, id)
        requestAnimationFrame(() => {
          handleBoundChange(source, id)
        })
      })
    })
  }

  useEffect(() => {
    void getLeaderboardSetting().then(({ source, boardId }) => {
      boundInfo.current.source = source
      boundInfo.current.id = boardId
      sourceSelectorRef.current?.setSourceList(boardState.sources, source)
      void getBoardsList(source).then(list => {
        boardsListRef.current?.setList(list, boardId)
      })
      musicListRef.current?.loadList(source, boardId)
    })
  }, [])

  return (
    <View style={{ ...styles.container, borderTopColor: theme['c-border-background'] }}>
      <View
        style={{
          ...styles.leftRail,
          borderRightColor: theme['c-border-background'],
          backgroundColor: theme['c-primary-alpha-900'],
        }}
      >
        <View style={{ ...styles.sourceWrap, borderBottomColor: theme['c-border-background'] }}>
          <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} center />
        </View>
        <BoardsList
          ref={boardsListRef}
          onBoundChange={onBoundChange}
          onCollect={onCollect}
          onPlay={onPlay}
        />
      </View>
      <View style={styles.rightContent}>
        <MusicList ref={musicListRef} />
      </View>
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: BorderWidths.normal,
  },
  leftRail: {
    width: 94,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'column',
    borderRightWidth: BorderWidths.normal,
  },
  sourceWrap: {
    height: 42,
    justifyContent: 'center',
    borderBottomWidth: BorderWidths.normal,
  },
  rightContent: {
    flex: 1,
    flexDirection: 'column',
  },
})
