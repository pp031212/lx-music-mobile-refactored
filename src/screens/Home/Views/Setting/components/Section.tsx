import { View } from 'react-native'

import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useHorizontalMode } from '@/utils/hooks'
import Text from '@/components/common/Text'


interface Props {
  title: string
  children: React.ReactNode | React.ReactNode[]
}

export default ({ title, children }: Props) => {
  const theme = useTheme()
  const isHorizontalMode = useHorizontalMode()

  return (
    <View style={styles.container}>
      {isHorizontalMode ? (
        <Text style={{ ...styles.title, borderLeftColor: theme['c-primary'] }} size={16}>{title}</Text>
      ) : null}
      <View>
        {children}
      </View>
    </View>
  )
}


const styles = createStyle({
  container: {},
  title: {
    borderLeftWidth: 5,
    paddingLeft: 12,
    marginBottom: 10,
  },
})
