import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import MusicList from './MusicList'
import MyList from './MyList'
import Popup, { type PopupType } from '@/components/common/Popup'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

export default () => {
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  useEffect(() => {
    const changeVisible = (visible: boolean) => {
      popupRef.current?.setVisible(visible)
    }

    global.app_event.on('changeLoveListVisible', changeVisible)
    return () => {
      global.app_event.off('changeLoveListVisible', changeVisible)
    }
  }, [])

  return (
    <View style={styles.container}>
      <MusicList />
      <Popup ref={popupRef} position="bottom" title={t('nav_love')}>
        <View style={styles.sheetBody}>
          <MyList />
        </View>
      </Popup>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  sheetBody: {
    maxHeight: '100%',
    paddingBottom: 12,
  },
})
