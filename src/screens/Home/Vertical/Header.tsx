import { useMemo } from 'react'
import { TouchableOpacity, View } from 'react-native'
import { useNavActiveId, useStatusbarHeight } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import { useDownloads } from '@/store/download/hook'
import { setNavActiveId } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import StatusBar from '@/components/common/StatusBar'
import { scaleSizeH } from '@/utils/pixelRatio'
import { HEADER_HEIGHT } from '@/config/constant'

const Header = () => {
  const id = useNavActiveId()
  const t = useI18n()
  const theme = useTheme()
  const statusBarHeight = useStatusbarHeight()
  const { tasks } = useDownloads()

  const activeDownloadCount = useMemo(() => {
    let count = 0
    for (const task of tasks) {
      if (task.status == 'run' || task.status == 'waiting') count += 1
    }
    return count
  }, [tasks])

  const isDownloadActive = id == 'nav_download'
  const isSettingActive = id == 'nav_setting'

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
          <Text style={styles.title} size={20}>{t(id)}</Text>
        </View>
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t('nav_download')}
            onPress={() => { if (!isDownloadActive) setNavActiveId('nav_download') }}
          >
            <Icon
              name="download-2"
              size={19}
              color={isDownloadActive ? theme['c-primary-font-active'] : theme['c-font']}
            />
            {activeDownloadCount > 0 ? (
              <View style={{ ...styles.badge, backgroundColor: theme['c-primary'] }}>
                <Text size={9} color="#fff" style={styles.badgeText}>
                  {activeDownloadCount > 99 ? '99+' : String(activeDownloadCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.65}
            accessibilityRole="button"
            accessibilityLabel={t('nav_setting')}
            onPress={() => { if (!isSettingActive) setNavActiveId('nav_setting') }}
          >
            <Icon
              name="setting"
              size={19}
              color={isSettingActive ? theme['c-primary-font-active'] : theme['c-font']}
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  )
}

const styles = createStyle({
  container: {
    paddingLeft: 16,
    paddingRight: 8,
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
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  iconBtn: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 3,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: '600',
  },
})

export default Header
