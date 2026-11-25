import { useRef } from 'react'
import { createStyle } from '@/utils/tools'
import { View } from 'react-native'
import PlayModeBtn from './PlayModeBtn'
import MusicAddBtn from './MusicAddBtn'
import DesktopLyricBtn from './DesktopLyricBtn'
import CommentBtn from './CommentBtn'
import Btn from './Btn'
import PlayingQueuePopup, { type PlayingQueuePopupType } from '@/components/player/PlayingQueuePopup'

export default () => {
  const queuePopupRef = useRef<PlayingQueuePopupType>(null)

  return (
    <View style={styles.container}>
      <PlayModeBtn />
      <MusicAddBtn />
      <CommentBtn />
      <DesktopLyricBtn />
      <Btn icon="menu" onPress={() => queuePopupRef.current?.show()} />
      <PlayingQueuePopup ref={queuePopupRef} />
    </View>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
})
