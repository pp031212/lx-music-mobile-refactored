import { memo } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import { pop } from '@/navigation'
import { createStyle } from '@/utils/tools'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT as _HEADER_HEIGHT } from '@/config/constant'
import commonState from '@/store/common/state'
import { useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { BorderWidths } from '@/theme'

const HEADER_HEIGHT = scaleSizeH(_HEADER_HEIGHT)

export default memo(({ componentId, title }: {
  componentId: string
  title?: string
}) => {
  const statusBarHeight = useStatusbarHeight()
  const theme = useTheme()
  const t = useI18n()

  const back = () => {
    void pop(componentId || commonState.componentIds.songlistDetail!)
  }

  return (
    <View
      style={{
        height: HEADER_HEIGHT + statusBarHeight,
        paddingTop: statusBarHeight,
        borderBottomWidth: BorderWidths.normal,
        borderBottomColor: theme['c-border-background'],
      }}
    >
      <View style={styles.container}>
        <TouchableOpacity onPress={back} style={{ ...styles.button, width: HEADER_HEIGHT }}>
          <Icon name="chevron-left" size={18} color={theme['c-font']} />
        </TouchableOpacity>
        <Text numberOfLines={1} size={15} style={styles.title}>
          {title || t('nav_songlist')}
        </Text>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingRight: 16,
  },
  button: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
})
