import { memo, useRef } from 'react'
import { View, TouchableOpacity } from 'react-native'
import Text from '@/components/common/Text'
import Badge, { type BadgeType } from '@/components/common/Badge'
import { Icon } from '@/components/common/Icon'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { scaleSizeH } from '@/utils/pixelRatio'
import { LIST_ITEM_HEIGHT } from '@/config/constant'
import { createStyle, type RowInfo } from '@/utils/tools'
import { BorderWidths } from '@/theme'

export const ITEM_HEIGHT = scaleSizeH(LIST_ITEM_HEIGHT)

const useQualityTag = (musicInfo: LX.Music.MusicInfoOnline) => {
  const t = useI18n()
  let info: { type: BadgeType | null, text: string } = { type: null, text: '' }
  if (musicInfo.meta._qualitys.flac24bit) {
    info.type = 'secondary'
    info.text = t('quality_lossless_24bit')
  } else if (musicInfo.meta._qualitys.flac ?? musicInfo.meta._qualitys.ape) {
    info.type = 'secondary'
    info.text = t('quality_lossless')
  } else if (musicInfo.meta._qualitys['320k']) {
    info.type = 'tertiary'
    info.text = t('quality_high_quality')
  }

  return info
}

export default memo(({ item, index, showSource, onPress, onLongPress, onShowMenu, selectedList, isMultiSelectMode, rowInfo, isShowAlbumName, isShowInterval }: {
  item: LX.Music.MusicInfoOnline
  index: number
  showSource?: boolean
  onPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onLongPress: (item: LX.Music.MusicInfoOnline, index: number) => void
  onShowMenu: (item: LX.Music.MusicInfoOnline, index: number, position: { x: number, y: number, w: number, h: number }) => void
  selectedList: LX.Music.MusicInfoOnline[]
  isMultiSelectMode: boolean
  rowInfo: RowInfo
  isShowAlbumName: boolean
  isShowInterval: boolean
}) => {
  const theme = useTheme()

  const isSelected = selectedList.includes(item)

  const moreButtonRef = useRef<TouchableOpacity>(null)
  const handleShowMenu = () => {
    if (moreButtonRef.current?.measure) {
      moreButtonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }
  const tagInfo = useQualityTag(item)

  const singer = `${item.singer}${isShowAlbumName && item.meta.albumName ? ` · ${item.meta.albumName}` : ''}`

  return (
    <View
      style={{
        ...styles.listItem,
        width: rowInfo.rowWidth,
        height: ITEM_HEIGHT,
        backgroundColor: isSelected ? theme['c-primary-background-hover'] : 'rgba(0,0,0,0)',
        borderBottomColor: theme['c-border-background'],
      }}
    >
      <TouchableOpacity style={styles.listItemLeft} onPress={() => { onPress(item, index) }} onLongPress={() => { onLongPress(item, index) }}>
        {isMultiSelectMode ? (
          <View style={styles.checkboxWrap}>
            <Icon
              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              color={isSelected ? theme['c-primary-font-active'] : theme['c-350']}
            />
          </View>
        ) : (
          <Text style={styles.sn} size={13} color={index < 3 ? theme['c-primary-font-active'] : theme['c-350']}>{index + 1}</Text>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.songTitle} size={15} color={theme['c-font']} numberOfLines={1}>{item.name}</Text>
          <View style={styles.listItemSingle}>
            {tagInfo.type ? <Badge type={tagInfo.type}>{tagInfo.text}</Badge> : null}
            {showSource ? <Badge type="tertiary">{item.source.toUpperCase()}</Badge> : null}
            <Text style={styles.listItemSingleText} size={12} color={theme['c-450']} numberOfLines={1}>{singer}</Text>
          </View>
        </View>
        {isShowInterval ? (
          <Text size={11} color={theme['c-300']} numberOfLines={1}>{item.interval}</Text>
        ) : null}
      </TouchableOpacity>
      {!isMultiSelectMode ? (
        <TouchableOpacity onPress={handleShowMenu} ref={moreButtonRef} style={styles.moreButton}>
          <Icon name="dots-vertical" style={{ color: theme['c-400'] }} size={15} />
        </TouchableOpacity>
      ) : (
        <View style={styles.multiRightSpacer} />
      )}
    </View>
  )
}, (prevProps, nextProps) => {
  return !!(prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isMultiSelectMode === nextProps.isMultiSelectMode &&
    prevProps.isShowAlbumName === nextProps.isShowAlbumName &&
    prevProps.isShowInterval === nextProps.isShowInterval &&
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
    width: 32,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  checkboxWrap: {
    width: 36,
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
  multiRightSpacer: {
    width: 12,
  },
})
