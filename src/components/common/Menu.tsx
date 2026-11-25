import { useImperativeHandle, forwardRef, useState, useRef, type Ref } from 'react'
import { View, Animated, TouchableHighlight, Image, type ImageSourcePropType } from 'react-native'
import Modal, { type ModalType } from './Modal'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'
import { scaleSizeH } from '@/utils/pixelRatio'
import { BorderWidths } from '@/theme'

const menuItemHeight = scaleSizeH(48)

export interface Position { w: number, h: number, x: number, y: number, menuWidth?: number, menuHeight?: number }
export interface MenuSize { width?: number, height?: number }
export type Menus = Readonly<Array<{ action: string, label: string, disabled?: boolean, icon?: ImageSourcePropType }>>

const styles = createStyle({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '72%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 12,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  menuItem: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderBottomWidth: BorderWidths.normal,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 8,
  },
})

interface Props<M extends Menus = Menus> {
  menus: Readonly<M>
  onPress?: (menu: M[number]) => void
  buttonPosition: Position
  menuSize: MenuSize
  onHide: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

const Menu = ({
  menus,
  height,
  onPress = () => {},
  onHide,
  activeId,
  fontSize = 15,
  center = false,
}: Props) => {
  const theme = useTheme()
  const rowHeight = height ? Math.max(height, menuItemHeight) : menuItemHeight

  const menuPress = (menu: Menus[number]) => {
    onPress(menu)
    onHide()
  }

  const renderContent = (menu: Menus[number], color?: string) => (
    <View style={{ ...styles.menuItemContent, justifyContent: center ? 'center' : 'flex-start' }}>
      {menu.icon ? <Image source={menu.icon} style={styles.menuIcon} resizeMode="contain" /> : null}
      <Text
        style={{ textAlign: center ? 'center' : 'left' }}
        color={color}
        size={fontSize}
        numberOfLines={1}
      >
        {menu.label}
      </Text>
    </View>
  )

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <View
        style={{
          ...styles.sheet,
          backgroundColor: theme['c-content-background'],
        }}
        onStartShouldSetResponder={() => true}
      >
        <View style={styles.grabberWrap}>
          <View style={{ ...styles.grabber, backgroundColor: theme['c-font-label'] }} />
        </View>
        <Animated.ScrollView keyboardShouldPersistTaps={'always'}>
          {menus.map((menu) => (
            menu.disabled
              ? (
                  <View
                    key={menu.action}
                    style={{
                      ...styles.menuItem,
                      height: rowHeight,
                      borderBottomColor: theme['c-border-background'],
                      opacity: 0.4,
                    }}
                  >
                    {renderContent(menu)}
                  </View>
                )
              : menu.action == activeId
                ? (
                    <View
                      key={menu.action}
                      style={{
                        ...styles.menuItem,
                        height: rowHeight,
                        borderBottomColor: theme['c-border-background'],
                      }}
                    >
                      {renderContent(menu, theme['c-primary-font-active'])}
                    </View>
                  )
                : (
                    <TouchableHighlight
                      key={menu.action}
                      style={{
                        ...styles.menuItem,
                        height: rowHeight,
                        borderBottomColor: theme['c-border-background'],
                      }}
                      underlayColor={theme['c-primary-background-active']}
                      onPress={() => { menuPress(menu) }}
                    >
                      {renderContent(menu)}
                    </TouchableHighlight>
                  )
          ))}
        </Animated.ScrollView>
      </View>
    </View>
  )
}

export interface MenuProps<M extends Menus = Menus> {
  menus: M
  onPress: (menu: M[number]) => void
  onHide?: () => void
  width?: number
  height?: number
  fontSize?: number
  center?: boolean
  activeId?: M[number]['action'] | null
}

export interface MenuType {
  show: (position: Position, menuSize?: MenuSize) => void
  hide: () => void
}

const Component = <M extends Menus>({ menus, width, height, activeId, onHide, onPress, fontSize, center }: MenuProps<M>, ref: Ref<MenuType>) => {
  const modalRef = useRef<ModalType>(null)
  const [position, setPosition] = useState<Position>({ w: 0, h: 0, x: 0, y: 0 })
  const [menuSize, setMenuSize] = useState<MenuSize>({})
  const hide = () => {
    modalRef.current?.setVisible(false)
  }
  useImperativeHandle(ref, () => ({
    show(newPosition, menuSize) {
      setPosition(newPosition)
      if (menuSize) setMenuSize(menuSize)
      modalRef.current?.setVisible(true)
    },
    hide() {
      hide()
    },
  }))

  return (
    <Modal onHide={onHide} bgColor="rgba(0,0,0,0.32)" ref={modalRef}>
      <Menu
        menus={menus}
        width={width}
        height={height}
        activeId={activeId}
        buttonPosition={position}
        menuSize={menuSize}
        onPress={onPress}
        onHide={hide}
        fontSize={fontSize}
        center={center}
      />
    </Modal>
  )
}

export default forwardRef(Component) as <M extends Menus>(p: MenuProps<M> & { ref?: Ref<MenuType> }) => JSX.Element | null
