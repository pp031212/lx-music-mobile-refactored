import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import Setting from '../Views/Setting'
import Download from '../Views/Download'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { useNavActiveId } from '@/store/common/hook'
import { createStyle } from '@/utils/tools'

const hideKeys = [
  'list.isShowAlbumName',
  'list.isShowInterval',
  'theme.fontShadow',
] as Readonly<Array<keyof LX.AppSetting>>

const useLazyPage = (targetId: CommonState['navActiveId'], renderView: () => JSX.Element) => {
  const [mounted, setMounted] = useState(commonState.navActiveId === targetId)
  const [component] = useState(renderView)

  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id === targetId) {
        requestAnimationFrame(() => {
          setMounted(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId !== 'nav_setting' || targetId === 'nav_setting') return
      setMounted(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some(k => hideKeys.includes(k))) handleHide()
    }

    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [targetId])

  return mounted ? component : null
}

const Main = () => {
  const activeId = useNavActiveId()

  useEffect(() => {
    global.lx.homePagerIdle = true
  }, [])

  const searchPage = useLazyPage('nav_search', () => <Search />)
  const songListPage = useLazyPage('nav_songlist', () => <SongList />)
  const leaderboardPage = useLazyPage('nav_top', () => <Leaderboard />)
  const mylistPage = useLazyPage('nav_love', () => <Mylist />)
  const downloadPage = useLazyPage('nav_download', () => <Download />)
  const settingPage = useLazyPage('nav_setting', () => <Setting />)

  return (
    <View style={styles.container}>
      <View style={activeId === 'nav_search' ? styles.pageActive : styles.pageHidden}>
        {searchPage}
      </View>
      <View style={activeId === 'nav_songlist' ? styles.pageActive : styles.pageHidden}>
        {songListPage}
      </View>
      <View style={activeId === 'nav_top' ? styles.pageActive : styles.pageHidden}>
        {leaderboardPage}
      </View>
      <View style={activeId === 'nav_love' ? styles.pageActive : styles.pageHidden}>
        {mylistPage}
      </View>
      <View style={activeId === 'nav_download' ? styles.pageActive : styles.pageHidden}>
        {downloadPage}
      </View>
      <View style={activeId === 'nav_setting' ? styles.pageActive : styles.pageHidden}>
        {settingPage}
      </View>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  pageActive: {
    flex: 1,
    display: 'flex',
  },
  pageHidden: {
    flex: 0,
    display: 'none',
    opacity: 0,
    overflow: 'hidden',
  },
})

export default Main
