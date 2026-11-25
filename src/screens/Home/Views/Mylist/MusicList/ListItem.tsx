import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { Icon } from '@/components/common/Icon'
import { createStyle, type RowInfo } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useAssertApiSupport } from '@/store/common/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import { BorderWidths } from '@/theme'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

export default memo(({
  item,
  index,
  activeIndex,
  onPress,
  onShowMenu,
  onLongPress,
  onPressOut,
  onDragHandlePressIn,
  selectedList,
  isMultiSelectMode,
  isDragging,
  rowInfo,
  isShowAlbumName,
  isShowInterval,
}: {
  item: LX.Music.MusicInfo
  index: number
  activeIndex: number
  onPress: (item: LX.Music.MusicInfo, index: number) => void
  onLongPress: (item: LX.Music.MusicInfo, index: number) => void
  onPressOut?: () => void
  onDragHandlePressIn?: (item: LX.Music.MusicInfo, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfo, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfo[]
  isMultiSelectMode: boolean
  isDragging: boolean
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()

  const isSelected = selectedList.includes(item)
  const isSupported = useAssertApiSupport(item.source)
  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const active = activeIndex == index

  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`

  return (
    <View
      style={{
        ...styles.listItem,
        width: rowInfo.rowWidth,
        height: ITEM_HEIGHT,
        backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)',
        borderBottomColor: theme['c-border-background'],
        opacity: isDragging ? 0.25 : isSupported ? 1 : 0.5,
      }}
    >
      <TouchableOpacity
        style={styles.listItemLeft}
        delayLongPress={280}
        onPress={() => { onPress(item, index) }}
        onLongPress={() => { onLongPress(item, index) }}
        onPressOut={onPressOut}
      >
        {isMultiSelectMode ? (
          <View style={styles.checkboxWrap}>
            <Icon
              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              color={isSelected ? theme['c-primary-font-active'] : theme['c-350']}
            />
          </View>
        ) : active ? (
          <Icon style={styles.sn} name="play-outline" size={14} color={theme['c-primary-font-active']} />
        ) : (
          <Text style={styles.sn} size={13} color={theme['c-350']}>{index + 1}</Text>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.songTitle} size={15} color={active ? theme['c-primary-font-active'] : theme['c-font']} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.listItemSingle}>
            <Badge>{item.source.toUpperCase()}</Badge>
            <Text style={styles.listItemSingleText} size={12} color={active ? theme['c-primary-alpha-200'] : theme['c-450']} numberOfLines={1}>
              {singer}
            </Text>
          </View>
        </View>
        {isShowInterval ? (
          <Text size={11} color={active ? theme['c-primary-alpha-400'] : theme['c-300']} numberOfLines={1}>{item.interval}</Text>
        ) : null}
      </TouchableOpacity>
      {!isMultiSelectMode ? (
        <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
          <Icon name="dots-vertical" style={{ color: theme['c-400'] }} size={15} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.6}
          onPressIn={() => { onDragHandlePressIn?.(item, index) }}
          onPressOut={onPressOut}
          style={styles.dragHandle}
        >
          <Icon name="menu" color={theme['c-400']} size={16} />
        </TouchableOpacity>
      )}
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
    prevProps.activeIndex != nextProps.index &&
    nextProps.activeIndex != nextProps.index &&
    nextProps.selectedList.includes(nextProps.item) == prevProps.selectedList.includes(nextProps.item)
  )
})

const styles = createStyle({
  listItem: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingRight: 2,
    alignItems: 'center',
    borderBottomWidth: BorderWidths.normal,
  },
  listItemLeft: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sn: {
    width: 40,
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  checkboxWrap: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 4,
  },
  songTitle: {
    fontWeight: '500',
  },
  listItemSingle: {
    paddingTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemSingleText: {
    flexGrow: 0,
    flexShrink: 1,
  },
  moreButton: {
    width: 46,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 46,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
