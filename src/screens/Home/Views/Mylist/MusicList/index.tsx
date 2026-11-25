import { useCallback, useMemo, useRef, useState } from 'react'

import listState from '@/store/list/state'
import ListMenu, { type ListMenuType, type Position, type SelectInfo } from './ListMenu'
import { clearMusicUrl, handleDislikeMusic, handlePlay, handlePlayLater, handleRemove, handleShare, handleShowMusicSourceDetail, handleUpdateMusicInfo, handleUpdateMusicPosition } from './listAction'
import List, { type ListType } from './List'
import ListMusicAdd, { type MusicAddModalType as ListMusicAddType } from '@/components/MusicAddModal'
import ListMusicMultiAdd, { type MusicMultiAddModalType as ListAddMultiType } from '@/components/MusicMultiAddModal'
import MultiSelectActionBar, { type BatchActionItem } from '@/components/common/MultiSelectActionBar'
import { createStyle } from '@/utils/tools'
import { type LayoutChangeEvent, View } from 'react-native'
import ActiveList, { type ActiveListType } from './ActiveList'
import MultipleModeBar, { type SelectMode, type MultipleModeBarType } from './MultipleModeBar'
import ListSearchBar, { type ListSearchBarType } from './ListSearchBar'
import ListMusicSearch, { type ListMusicSearchType } from './ListMusicSearch'
import MusicPositionModal, { type MusicPositionModalType } from './MusicPositionModal'
import MetadataEditModal, { type MetadataEditType, type MetadataEditProps } from '@/components/MetadataEditModal'
import MusicToggleModal, { type MusicToggleModalType } from './MusicToggleModal'
import DownloadModal, { type DownloadModalType } from '@/components/DownloadModal'
import { useI18n } from '@/lang'


export default () => {
  const t = useI18n()
  const activeListRef = useRef<ActiveListType>(null)
  const listMusicSearchRef = useRef<ListMusicSearchType>(null)
  const listRef = useRef<ListType>(null)
  const multipleModeBarRef = useRef<MultipleModeBarType>(null)
  const listSearchBarRef = useRef<ListSearchBarType>(null)
  const listMusicAddRef = useRef<ListMusicAddType>(null)
  const listMusicMultiAddRef = useRef<ListAddMultiType>(null)
  const musicPositionModalRef = useRef<MusicPositionModalType>(null)
  const metadataEditTypeRef = useRef<MetadataEditType>(null)
  const listMenuRef = useRef<ListMenuType>(null)
  const musicToggleModalRef = useRef<MusicToggleModalType>(null)
  const downloadModalRef = useRef<DownloadModalType>(null)
  const layoutHeightRef = useRef<number>(0)
  const isShowMultipleModeBar = useRef(false)
  const isShowSearchBarModeBar = useRef(false)
  const selectedInfoRef = useRef<SelectInfo>()
  const [isMultiSelect, setIsMultiSelect] = useState(false)
  const [selectedCount, setSelectedCount] = useState(0)

  const hancelMultiSelect = useCallback(() => {
    if (isShowSearchBarModeBar.current) {
      multipleModeBarRef.current?.setVisibleBar(false)
    } else activeListRef.current?.setVisibleBar(false)
    isShowMultipleModeBar.current = true
    setIsMultiSelect(true)
    multipleModeBarRef.current?.show()
    listRef.current?.setIsMultiSelectMode(true)
  }, [])
  const hancelExitSelect = useCallback(() => {
    if (isShowSearchBarModeBar.current) {
      multipleModeBarRef.current?.setVisibleBar(true)
    } else activeListRef.current?.setVisibleBar(true)
    multipleModeBarRef.current?.exitSelectMode()
    listRef.current?.setIsMultiSelectMode(false)
    isShowMultipleModeBar.current = false
    setIsMultiSelect(false)
    setSelectedCount(0)
  }, [])
  const hancelSwitchSelectMode = useCallback((mode: SelectMode) => {
    multipleModeBarRef.current?.setSwitchMode(mode)
    listRef.current?.setSelectMode(mode)
  }, [])
  const hancelScrollToTop = useCallback(() => {
    listRef.current?.scrollToTop()
  }, [])
  const handleSelectedCountChange = useCallback((count: number) => {
    setSelectedCount(count)
    multipleModeBarRef.current?.setSelectedCount(count)
  }, [])

  const showMenu = useCallback((musicInfo: LX.Music.MusicInfo, index: number, position: Position) => {
    listMenuRef.current?.show({
      musicInfo,
      index,
      listId: listState.activeListId,
      single: false,
      selectedList: listRef.current!.getSelectedList(),
    }, position)
  }, [])
  const handleShowSearch = useCallback(() => {
    isShowSearchBarModeBar.current = true
    if (isShowMultipleModeBar.current) {
      multipleModeBarRef.current?.setVisibleBar(false)
    } else activeListRef.current?.setVisibleBar(false)
    listSearchBarRef.current?.show()
  }, [])
  const handleExitSearch = useCallback(() => {
    isShowSearchBarModeBar.current = false
    listMusicSearchRef.current?.hide()
    listSearchBarRef.current?.hide()
    if (isShowMultipleModeBar.current) {
      multipleModeBarRef.current?.setVisibleBar(true)
    } else activeListRef.current?.setVisibleBar(true)
  }, [])
  const handleScrollToInfo = useCallback((info: LX.Music.MusicInfo) => {
    listRef.current?.scrollToInfo(info)
    handleExitSearch()
  }, [handleExitSearch])
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    layoutHeightRef.current = e.nativeEvent.layout.height
  }, [])

  const handleAddMusic = useCallback((info: SelectInfo) => {
    if (info.selectedList.length) {
      listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: info.listId, isMove: false })
    } else {
      listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: info.listId, isMove: false })
    }
  }, [])
  const handleMoveMusic = useCallback((info: SelectInfo) => {
    if (info.selectedList.length) {
      listMusicMultiAddRef.current?.show({ selectedList: info.selectedList, listId: info.listId, isMove: true })
    } else {
      listMusicAddRef.current?.show({ musicInfo: info.musicInfo, listId: info.listId, isMove: true })
    }
  }, [])
  const handleEditMetadata = useCallback((info: SelectInfo) => {
    if (info.musicInfo.source != 'local') return
    selectedInfoRef.current = info
    metadataEditTypeRef.current?.show(info.musicInfo.meta.filePath)
  }, [])
  const handleUpdateMetadata = useCallback<MetadataEditProps['onUpdate']>((info) => {
    if (!selectedInfoRef.current || selectedInfoRef.current.musicInfo.source != 'local') return
    handleUpdateMusicInfo(selectedInfoRef.current.listId, selectedInfoRef.current.musicInfo, info)
  }, [])

  const batchActions = useMemo<BatchActionItem[]>(() => [
    {
      id: 'play_later',
      icon: 'play-outline',
      label: t('play_later'),
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        hancelExitSelect()
        handlePlayLater(listState.activeListId, selected[0], selected, hancelExitSelect)
      },
    },
    {
      id: 'add_to',
      icon: 'add-music',
      label: t('add_to').replace(/\.\.\.$/, ''),
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        listMusicMultiAddRef.current?.show({ selectedList: selected, listId: listState.activeListId, isMove: false })
      },
    },
    {
      id: 'move_to',
      icon: 'add_folder',
      label: t('move_to').replace(/\.\.\.$/, ''),
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        listMusicMultiAddRef.current?.show({ selectedList: selected, listId: listState.activeListId, isMove: true })
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
    {
      id: 'remove',
      icon: 'remove',
      label: t('delete'),
      danger: true,
      onPress: () => {
        const selected = listRef.current?.getSelectedList() ?? []
        if (!selected.length) return
        hancelExitSelect()
        handleRemove(listState.activeListId, selected[0], selected, hancelExitSelect)
      },
    },
  ], [hancelExitSelect, t])

  return (
    <View style={styles.container}>
      <View style={{ zIndex: 2 }}>
        <ActiveList ref={activeListRef} onShowSearchBar={handleShowSearch} onScrollToTop={hancelScrollToTop} />
        <MultipleModeBar
          ref={multipleModeBarRef}
          onSwitchMode={hancelSwitchSelectMode}
          onSelectAll={isAll => listRef.current?.selectAll(isAll)}
          onExitSelectMode={hancelExitSelect}
        />
        <ListSearchBar
          ref={listSearchBarRef}
          onSearch={keyword => listMusicSearchRef.current?.search(keyword, layoutHeightRef.current)}
          onExitSearch={handleExitSearch}
        />
      </View>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <List
          ref={listRef}
          onShowMenu={showMenu}
          onMuiltSelectMode={hancelMultiSelect}
          onSelectAll={isAll => multipleModeBarRef.current?.setIsSelectAll(isAll)}
          onSelectedCountChange={handleSelectedCountChange}
        />
        <ListMusicSearch
          ref={listMusicSearchRef}
          onScrollToInfo={handleScrollToInfo}
        />
      </View>
      <MultiSelectActionBar
        visible={isMultiSelect}
        selectedCount={selectedCount}
        actions={batchActions}
      />
      <ListMusicAdd ref={listMusicAddRef} onAdded={hancelExitSelect} />
      <ListMusicMultiAdd ref={listMusicMultiAddRef} onAdded={hancelExitSelect} />
      <MusicPositionModal ref={musicPositionModalRef}
        onUpdatePosition={(info, postion) => { handleUpdateMusicPosition(postion, info.listId, info.musicInfo, info.selectedList, hancelExitSelect) }} />
      <ListMenu
        ref={listMenuRef}
        onPlay={info => { handlePlay(info.listId, info.index) }}
        onDownload={info => downloadModalRef.current?.show(info.selectedList.length ? info.selectedList : [info.musicInfo])}
        onPlayLater={info => { hancelExitSelect(); handlePlayLater(info.listId, info.musicInfo, info.selectedList, hancelExitSelect) }}
        onRemove={info => { hancelExitSelect(); handleRemove(info.listId, info.musicInfo, info.selectedList, hancelExitSelect) }}
        onDislikeMusic={info => { void handleDislikeMusic(info.musicInfo) }}
        onCopyName={info => { handleShare(info.musicInfo) }}
        onMusicSourceDetail={info => { void handleShowMusicSourceDetail(info.musicInfo) }}
        onAdd={handleAddMusic}
        onMove={handleMoveMusic}
        onEditMetadata={handleEditMetadata}
        onChangePosition={info => musicPositionModalRef.current?.show(info)}
        onToggleSource={info => musicToggleModalRef.current?.show(info)}
        onRemoveCache={info => { void clearMusicUrl(info.musicInfo) }}
      />
      <MetadataEditModal
        ref={metadataEditTypeRef}
        onUpdate={handleUpdateMetadata}
      />
      <MusicToggleModal ref={musicToggleModalRef} />
      <DownloadModal ref={downloadModalRef} onAdded={hancelExitSelect} />
    </View>
  )
}


const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})
