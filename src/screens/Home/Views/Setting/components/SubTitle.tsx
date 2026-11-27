import { memo } from 'react'

import { View } from 'react-native'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'

export default memo(({ title, children }: {
  title: string
  children: React.ReactNode | React.ReactNode[]
}) => {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      <Text style={styles.title} size={12} color={theme['c-font-label']}>{title}</Text>
      <View
        style={{
          ...styles.card,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
      >
        {children}
      </View>
    </View>
  )
})


const styles = createStyle({
  container: {
    marginTop: 6,
    marginBottom: 12,
  },
  title: {
    paddingLeft: 6,
    marginBottom: 6,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
