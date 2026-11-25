import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import Content from './Content'
import TagList from './TagList'
import Popup, { type PopupType } from '@/components/common/Popup'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'

export default () => {
  const popupRef = useRef<PopupType>(null)
  const t = useI18n()

  useEffect(() => {
    const handleShow = () => {
      popupRef.current?.setVisible(true)
    }
    const handleHide = () => {
      popupRef.current?.setVisible(false)
    }

    global.app_event.on('showSonglistTagList', handleShow)
    global.app_event.on('hideSonglistTagList', handleHide)

    return () => {
      global.app_event.off('showSonglistTagList', handleShow)
      global.app_event.off('hideSonglistTagList', handleHide)
    }
  }, [])

  return (
    <View style={styles.container}>
      <Content />
      <Popup ref={popupRef} position="bottom" title={t('songlist_tags')}>
        <TagList />
      </Popup>
    </View>
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
})
