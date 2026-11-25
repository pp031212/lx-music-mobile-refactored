import { useCallback, useRef } from 'react'
import { View } from 'react-native'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import Button, { type BtnType } from '@/components/common/Button'
import { createStyle } from '@/utils/tools'
import { type BoardItem } from '@/store/leaderboard/state'

export interface ListItemProps {
  item: BoardItem
  index: number
  longPressIndex: number
  activeId: string
  onShowMenu: (id: string, name: string, index: number, position: { x: number, y: number, w: number, h: number }) => void
  onBoundChange: (item: BoardItem) => void
}

export default ({ item, activeId, index, longPressIndex, onBoundChange, onShowMenu }: ListItemProps) => {
  const theme = useTheme()
  const buttonRef = useRef<BtnType>(null)

  const setPosition = useCallback(() => {
    if (buttonRef.current?.measure) {
      buttonRef.current.measure((fx, fy, width, height, px, py) => {
        onShowMenu(item.id, item.name, index, { x: Math.ceil(px), y: Math.ceil(py), w: Math.ceil(width), h: Math.ceil(height) })
      })
    }
  }, [index, item, onShowMenu])

  const active = activeId == item.id

  return (
    <Button
      ref={buttonRef}
      style={{
        ...styles.button,
        backgroundColor: active
          ? theme['c-content-background']
          : index == longPressIndex
            ? theme['c-button-background-active']
            : 'transparent',
      }}
      key={item.id}
      onLongPress={setPosition}
      onPress={() => { onBoundChange(item) }}
    >
      {active ? (
        <View style={{ ...styles.activeIndicator, backgroundColor: theme['c-primary'] }} />
      ) : null}
      <Text
        style={active ? styles.listNameActive : styles.listName}
        size={13}
        textBreakStrategy="simple"
        color={active ? theme['c-primary-font-active'] : theme['c-font']}
        numberOfLines={2}
      >
        {item.name}
      </Text>
    </Button>
  )
}

const styles = createStyle({
  button: {
    minHeight: 46,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    width: 3,
    height: 20,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  listName: {
    flex: 1,
    fontWeight: '400',
  },
  listNameActive: {
    flex: 1,
    fontWeight: '500',
  },
})
