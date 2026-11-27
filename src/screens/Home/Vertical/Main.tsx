import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import PagerView, { type PagerViewOnPageSelectedEvent, type PageScrollStateChangedNativeEvent } from 'react-native-pager-view'
import Search from '../Views/Search'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import Leaderboard from '../Views/Leaderboard'
import Setting from '../Views/Setting'
import Download from '../Views/Download'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { useNavActiveId } from '@/store/common/hook'
import { setNavActiveId } from '@/core/common'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

const MAIN_TABS = [
  'nav_search',
  'nav_songlist',
  'nav_top',
  'nav_love',
] as const

const hideKeys = [
  'list.isShowAlbumName',
  'list.isShowInterval',
  'theme.fontShadow',
] as Readonly<Array<keyof LX.AppSetting>>

let pagerLockHandler: ((locked: boolean) => void) | null = null

export const setHomePagerScrollLocked = (locked: boolean) => {
  pagerLockHandler?.(locked)
}

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
  const theme = useTheme()
  const pagerViewRef = useRef<PagerView>(null)
  const currentPageRef = useRef(Math.max(0, MAIN_TABS.indexOf(commonState.navActiveId as typeof MAIN_TABS[number])))
  const isUtilityPage = activeId === 'nav_download' || activeId === 'nav_setting'
  const isUtilityPageRef = useRef(isUtilityPage)
  isUtilityPageRef.current = isUtilityPage
  const [pagerScrollLocked, setPagerScrollLocked] = useState(false)

  useEffect(() => {
    global.lx.homePagerIdle = true
    pagerLockHandler = (locked: boolean) => {
      const enabled = !locked && !isUtilityPageRef.current
      pagerViewRef.current?.setScrollEnabled(enabled)
      setPagerScrollLocked(locked)
    }
    return () => {
      pagerLockHandler = null
    }
  }, [])

  useEffect(() => {
    const idx = MAIN_TABS.indexOf(activeId as typeof MAIN_TABS[number])
    if (idx >= 0 && idx !== currentPageRef.current) {
      currentPageRef.current = idx
      pagerViewRef.current?.setPage(idx)
    }
  }, [activeId])

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    const idx = nativeEvent.position
    if (idx === currentPageRef.current) return
    currentPageRef.current = idx
    const nextId = MAIN_TABS[idx]
    if (nextId && commonState.navActiveId !== nextId) {
      setNavActiveId(nextId)
    }
  }, [])

  const onPageScrollStateChanged = useCallback(({ nativeEvent }: PageScrollStateChangedNativeEvent) => {
    global.lx.homePagerIdle = nativeEvent.pageScrollState === 'idle'
  }, [])

  const searchPage = useLazyPage('nav_search', () => <Search />)
  const songListPage = useLazyPage('nav_songlist', () => <SongList />)
  const leaderboardPage = useLazyPage('nav_top', () => <Leaderboard />)
  const mylistPage = useLazyPage('nav_love', () => <Mylist />)
  const downloadPage = useLazyPage('nav_download', () => <Download />)
  const settingPage = useLazyPage('nav_setting', () => <Setting />)

  return (
    <View style={styles.container}>
      <PagerView
        ref={pagerViewRef}
        initialPage={currentPageRef.current}
        scrollEnabled={!isUtilityPage && !pagerScrollLocked}
        onPageSelected={onPageSelected}
        onPageScrollStateChanged={onPageScrollStateChanged}
        offscreenPageLimit={1}
        style={styles.pagerView}
      >
        <View key="nav_search" collapsable={false} style={styles.pageStyle}>
          {searchPage}
        </View>
        <View key="nav_songlist" collapsable={false} style={styles.pageStyle}>
          {songListPage}
        </View>
        <View key="nav_top" collapsable={false} style={styles.pageStyle}>
          {leaderboardPage}
        </View>
        <View key="nav_love" collapsable={false} style={styles.pageStyle}>
          {mylistPage}
        </View>
      </PagerView>

      {activeId === 'nav_download' ? (
        <View style={[styles.utilityOverlay, { backgroundColor: theme['c-main-background'] }]}>
          {downloadPage}
        </View>
      ) : null}

      {activeId === 'nav_setting' ? (
        <View style={[styles.utilityOverlay, { backgroundColor: theme['c-main-background'] }]}>
          {settingPage}
        </View>
      ) : null}
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  pagerView: {
    flex: 1,
  },
  pageStyle: {
    flex: 1,
    overflow: 'hidden',
  },
  utilityOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
})

export default Main
