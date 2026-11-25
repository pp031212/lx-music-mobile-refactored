import { memo, useEffect } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'

export interface BatchActionItem {
  id: string
  icon: string
  label: string
  danger?: boolean
  disabled?: boolean
  onPress: () => void
}

export interface MultiSelectActionBarProps {
  visible: boolean
  selectedCount: number
  actions: BatchActionItem[]
}

let activeMultiSelectBarCount = 0
const visibilityListeners = new Set<(hidden: boolean) => void>()

const notifyVisibility = () => {
  const hidden = activeMultiSelectBarCount > 0
  visibilityListeners.forEach(listener => { listener(hidden) })
}

export const subscribeMultiSelectBarVisible = (listener: (visible: boolean) => void) => {
  visibilityListeners.add(listener)
  listener(activeMultiSelectBarCount > 0)
  return () => {
    visibilityListeners.delete(listener)
  }
}

export default memo(({ visible, selectedCount, actions }: MultiSelectActionBarProps) => {
  const theme = useTheme()

  useEffect(() => {
    if (!visible) return
    activeMultiSelectBarCount += 1
    notifyVisibility()
    return () => {
      activeMultiSelectBarCount = Math.max(0, activeMultiSelectBarCount - 1)
      notifyVisibility()
    }
  }, [visible])

  if (!visible) return null

  const isDisabledAll = selectedCount <= 0

  return (
    <View style={styles.outerWrap}>
      <View
        style={{
          ...styles.container,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
      >
        {actions.map(action => {
          const disabled = isDisabledAll || !!action.disabled
          const tintColor = action.danger ? '#E05252' : theme['c-font']
          return (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.7}
              disabled={disabled}
              onPress={action.onPress}
              style={{
                ...styles.actionBtn,
                opacity: disabled ? 0.35 : 1,
              }}
            >
              <Icon name={action.icon} size={18} color={tintColor} />
              <Text size={11} color={tintColor} numberOfLines={1} style={styles.actionLabel}>
                {action.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
})

const styles = createStyle({
  outerWrap: {
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 2,
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: BorderWidths.normal,
    elevation: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionLabel: {
    marginTop: 4,
  },
})
