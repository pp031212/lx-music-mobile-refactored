import { View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT } from '@/config/constant'

const Header = () => {
  const id = useNavActiveId()
  const t = useI18n()
  const statusBarHeight = useStatusbarHeight()

  return (
    <>
      <StatusBar />
      <View
        style={{
          ...styles.container,
          height: scaleSizeH(HEADER_HEIGHT) + statusBarHeight,
          paddingTop: statusBarHeight,
        }}
      >
        <View style={styles.left}>
          <Text style={styles.title} size={18}>{t(id)}</Text>
        </View>
      </View>
    </>
  )
}

const styles = createStyle({
  container: {
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  title: {
    fontWeight: '500',
  },
})

export default Header
