import { memo, useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { View, AppState } from 'react-native'

import Header from './components/Header'
import Player from './Player'
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import Pic from './Pic'
import Lyric from './Lyric'
import { screenkeepAwake, screenUnkeepAwake } from '@/utils/nativeModules/utils'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'

const LyricPage = ({ activeIndex }: { activeIndex: number }) => {
  const initedRef = useRef(false)
  const lyric = useMemo(() => <Lyric />, [])
  switch (activeIndex) {
    case 1:
      if (!initedRef.current) initedRef.current = true
      return lyric
    default:
      return initedRef.current ? lyric : null
  }
}

export default memo(({ componentId }: { componentId: string }) => {
  const theme = useTheme()
  const pagerViewRef = useRef<PagerView>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const showLyricRef = useRef(false)

  const onPageSelected = ({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    setPageIndex(nativeEvent.position)
    showLyricRef.current = nativeEvent.position == 1
    if (showLyricRef.current) {
      screenkeepAwake()
    } else {
      screenUnkeepAwake()
    }
  }

  const handleOpenLyric = useCallback(() => {
    pagerViewRef.current?.setPage(1)
  }, [])

  const handleOpenCover = useCallback(() => {
    pagerViewRef.current?.setPage(0)
  }, [])

  useEffect(() => {
    let appstateListener = AppState.addEventListener('change', (state) => {
      switch (state) {
        case 'active':
          if (showLyricRef.current && !commonState.componentIds.comment) screenkeepAwake()
          break
        case 'background':
          screenUnkeepAwake()
          break
      }
    })

    const handleComponentIdsChange = (ids: CommonState['componentIds']) => {
      if (ids.comment) screenUnkeepAwake()
      else if (AppState.currentState == 'active') screenkeepAwake()
    }

    global.state_event.on('componentIdsUpdated', handleComponentIdsChange)

    return () => {
      global.state_event.off('componentIdsUpdated', handleComponentIdsChange)
      appstateListener.remove()
      screenUnkeepAwake()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <Header showMiniCover={pageIndex == 1} onPressMiniCover={handleOpenCover} />
      <View style={styles.container}>
        <PagerView
          ref={pagerViewRef}
          onPageSelected={onPageSelected}
          style={styles.pagerView}
        >
          <View collapsable={false}>
            <Pic componentId={componentId} onPressLyric={handleOpenLyric} />
          </View>
          <View collapsable={false}>
            <LyricPage activeIndex={pageIndex} />
          </View>
        </PagerView>
        <View style={styles.pageIndicator}>
          <View style={{ ...styles.pageIndicatorItem, width: pageIndex == 0 ? 18 : 6, backgroundColor: pageIndex == 0 ? theme['c-primary-font-active'] : theme['c-primary-alpha-600'] }} />
          <View style={{ ...styles.pageIndicatorItem, width: pageIndex == 1 ? 18 : 6, backgroundColor: pageIndex == 1 ? theme['c-primary-font-active'] : theme['c-primary-alpha-600'] }} />
        </View>
        <Player />
      </View>
    </>
  )
})

const styles = createStyle({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  pagerView: {
    flex: 1,
  },
  pageIndicator: {
    flex: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  pageIndicatorItem: {
    height: 4,
    marginHorizontal: 3,
    borderRadius: 2,
  },
})
