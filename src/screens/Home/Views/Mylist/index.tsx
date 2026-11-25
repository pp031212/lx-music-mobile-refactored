import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import MusicList from './MusicList'
import MyList from './MyList'
import { createStyle } from '@/utils/tools'

export default () => {
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('overview')

  const handleOpenDetail = useCallback(() => {
    setViewMode('detail')
  }, [])

  const handleBackOverview = useCallback(() => {
    setViewMode('overview')
  }, [])

  useEffect(() => {
    const changeVisible = (visible: boolean) => {
      setViewMode(visible ? 'overview' : 'detail')
    }
    const handleJumpPosition = () => {
      setViewMode('detail')
    }

    global.app_event.on('changeLoveListVisible', changeVisible)
    global.app_event.on('jumpListPosition', handleJumpPosition)
    return () => {
      global.app_event.off('changeLoveListVisible', changeVisible)
      global.app_event.off('jumpListPosition', handleJumpPosition)
    }
  }, [])

  return (
    <View style={styles.container}>
      {viewMode == 'overview' ? (
        <MyList onSelectList={handleOpenDetail} />
      ) : (
        <MusicList onBackToOverview={handleBackOverview} />
      )}
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
})
