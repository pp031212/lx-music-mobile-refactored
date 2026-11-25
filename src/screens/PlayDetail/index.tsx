import { useEffect } from 'react'
import { useHorizontalMode } from '@/utils/hooks'

import Vertical from './Vertical'
import Horizontal from './Horizontal'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { usePlayerMusicInfo } from '@/store/player/hook'

export default ({ componentId }: { componentId: string }) => {
  const isHorizontalMode = useHorizontalMode()
  const musicInfo = usePlayerMusicInfo()

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageContent bgPic={musicInfo.pic}>
      <StatusBar />
      {
        isHorizontalMode
          ? <Horizontal componentId={componentId} />
          : <Vertical componentId={componentId} />
      }
    </PageContent>
  )
}
