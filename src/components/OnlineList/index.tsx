import { useCallback, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { View } from 'react-native'
import List, { type ListProps, type ListType, type Status, type RowInfoType } from './List'
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from './ListMenu'
import ListMusicMultiAdd, { type MusicMultiAddModalType as ListAddMultiType } from '@/components/MusicMultiAddModal'
import ListMusicAdd, { type MusicAddModalType as ListMusicAddType } from '@/components/MusicAddModal'
import MultipleModeBar, { type MultipleModeBarType, type SelectMode } from './MultipleModeBar'
import MultiSelectActionBar, { type BatchActionItem } from '@/components/common/MultiSelectActionBar'
import { clearMusicUrl, handleDislikeMusic, handlePlay, handlePlayLater, handleShare, handleShowMusicSourceDetail } from './listAction'
import { createStyle } from '@/utils/tools'
import DownloadModal, { type DownloadModalType } from '@/components/DownloadModal'
import { useI18n } from '@/lang'

export interface OnlineListProps {
  onRefresh: ListProps['onRefresh']
  onLoadMore: ListProps['onLoadMore']
  onPlayList?: ListProps['onPlayList']
  progressViewOffset?: ListProps['progressViewOffset']
  ListHeaderComponent?: ListProps['ListHeaderComponent']
  checkHomePagerIdle?: boolean
  rowType?: RowInfoType
}
export interface OnlineListType {
  setList: (list: LX.Music.MusicInfoOnline[], isAppend?: boolean, showSource?: boolean) => void
  setStatus: (val: Status) => void
}

export default forwardRef<OnlineListType, OnlineListProps>(({
  onRefresh,
  onLoadMore,
  onPlayList,
  progressViewOffset,
  ListHeaderComponent,
  checkHomePagerIdle = false,
  rowType,
}, ref) => {
  const t = useI18n()
  const listRef = useRef<ListType>(null)
  const multipleModeBarRef = useRef<MultipleModeBarType>(null)
  const listMusicAddRef = useRef<ListMusicAddType>(null)
  const listMusicMultiAddRef = useRef<ListAddMultiType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const downloadModalRef = useRef<DownloadModalType>(null)
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)

  useImperativeHandle(ref, () => ({
    setList(list, isAppend = false, showSource = false) {
      listRef.current?.setList(list, isAppend, showSource)
      multipleModeBarRef.current?.setIsSelectAll(false)
    },
    setStatus(val) {
      listRef.current?.setStatus(val)
    },
  }))

  const hancelMultiSelect = useCallback(() => {
    setIsMultiSelect(true)
    multipleModeBarRef.current?.show()
    listRef.current?.setIsMultiSelectMode(true)
  }, [])
  const hancelSwitchSelectMode = useCallback((mode: SelectMode) => {
    multipleModeBarRef.current?.setSwitchMode(mode)
    listRef.current?.setSelectMode(mode)
  }, [])
  const hancelExitSelect = useCallback(() => {
    multipleModeBarRef.current?.exitSelectMode()
    listRef.current?.setIsMultiSelectMode(false)
    setIsMultiSelect(false)
    setSelectedCount(0)
  }, [])
  const handleSelectedCountChange = useCallback((count: number) => {
    setSelectedCount(count)
    multipleModeBarRef.current?.setSelectedCount(count)
  }, [])

  const showMenu = (musicInfo: LX.Music.MusicInfoOnline, index: number, position: Position) => {
    listMenuRef.current?.show({
      musicInfo,
      index,
      single: false,
      selectedList: listRef.current!.getSelectedList(),
    }, position)
  }
  const handleAddMusic = (info: SelectInfo) => {
    if (info.selectedList.length) {
      listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: '', isMove: false })
    } else {
      listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: '', isMove: false })
    }
  }

  const batchActions = useMemo<BatchActionItem[]>(() => [
    {
      id: 'play_later',
      icon: 'play-outline',
      label: t('play_later'),
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        hancelExitSelect()
        handlePlayLater(selected[0], selected, hancelExitSelect)
      },
    },
    {
      id: 'add_to',
      icon: 'add-music',
      label: t('add_to').replace(/\.\.\.$/, ''),
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        listMusicMultiAddRef.current?.show({ selectedList: selected, listId: '', isMove: false })
      },
    },
    {
      id: 'download',
      icon: 'download-2',
      label: t('download_action'),
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        downloadModalRef.current?.show(selected)
      },
    },
  ], [hancelExitSelect, t])

  return (
    <View style={styles.container}>
      <MultipleModeBar
        ref={multipleModeBarRef}
        onSwitchMode={hancelSwitchSelectMode}
        onSelectAll={isAll => listRef.current?.selectAll(isAll)}
        onExitSelectMode={hancelExitSelect}
      />
      <View style={{ flex: 1 }}>
        <List
          ref={listRef}
          onShowMenu={showMenu}
          onMuiltSelectMode={hancelMultiSelect}
          onSelectAll={isAll => multipleModeBarRef.current?.setIsSelectAll(isAll)}
          onSelectedCountChange={handleSelectedCountChange}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          onPlayList={onPlayList}
          progressViewOffset={progressViewOffset}
          ListHeaderComponent={ListHeaderComponent}
          checkHomePagerIdle={checkHomePagerIdle}
          rowType={rowType}
        />
      </View>
      <MultiSelectActionBar
        visible={isMultiSelect}
        selectedCount={selectedCount}
        actions={batchActions}
      />
      <ListMusicAdd ref={listMusicAddRef} onAdded={() => { hancelExitSelect() }} />
      <ListMusicMultiAdd ref={listMusicMultiAddRef} onAdded={() => { hancelExitSelect() }} />
      <ListMenu
        ref={listMenuRef}
        onPlay={info => { handlePlay(info.musicInfo) }}
        onDownload={info => downloadModalRef.current?.show(info.selectedList.length ? info.selectedList : [info.musicInfo])}
        onPlayLater={info => { hancelExitSelect(); handlePlayLater(info.musicInfo, info.selectedList, hancelExitSelect) }}
        onCopyName={info => { handleShare(info.musicInfo) }}
        onAdd={handleAddMusic}
        onMusicSourceDetail={info => { void handleShowMusicSourceDetail(info.musicInfo) }}
        onRemoveCache={info => { void clearMusicUrl(info.musicInfo) }}
        onDislikeMusic={info => { void handleDislikeMusic(info.musicInfo) }}
      />
      <DownloadModal ref={downloadModalRef} onAdded={hancelExitSelect} />
    </View>
  )
})


const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
})
