import { memo, useMemo } from 'react'
import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import Text from './Text'

const styles = createStyle({
  pill: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginRight: 6,
    alignSelf: 'center',
  },
  text: {
    fontWeight: '500',
  },
})

export type BadgeType = 'normal' | 'secondary' | 'tertiary'

export default memo(({ type = 'normal', children }: {
  type?: BadgeType
  children: string
}) => {
  const theme = useTheme()
  const colors = useMemo(() => {
    switch (type) {
      case 'secondary':
        return { textColor: theme['c-badge-secondary'], bgColor: theme['c-primary-input-background'] }
      case 'tertiary':
        return { textColor: theme['c-badge-tertiary'], bgColor: theme['c-primary-input-background'] }
      case 'normal':
      default:
        return { textColor: theme['c-badge-primary'], bgColor: theme['c-primary-alpha-900'] }
    }
  }, [type, theme])

  return (
    <View style={{ ...styles.pill, backgroundColor: colors.bgColor }}>
      <Text style={styles.text} size={9} color={colors.textColor}>{children}</Text>
    </View>
  )
})
