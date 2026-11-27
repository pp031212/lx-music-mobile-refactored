import { useCallback, useEffect, useState } from 'react'
import { useHorizontalMode } from '@/utils/hooks'

import Vertical from './Vertical'
import Horizontal from './Horizontal'
import PageContent from '@/components/PageContent'
import StatusBar from '@/components/common/StatusBar'
import { setComponentId } from '@/core/common'
import { COMPONENT_IDS } from '@/config/constant'
import { usePlayerMusicInfo } from '@/store/player/hook'
import { useNavigationComponentDidAppear, useNavigationComponentDidDisappear } from '@/navigation'

export default ({ componentId }: { componentId: string }) => {
  const isHorizontalMode = useHorizontalMode()
  const musicInfo = usePlayerMusicInfo()
  const [visible, setVisible] = useState(false)
  useNavigationComponentDidAppear(componentId, useCallback(() => { setVisible(true) }, []))
  useNavigationComponentDidDisappear(componentId, useCallback(() => { setVisible(false) }, []))

  useEffect(() => {
    setComponentId(COMPONENT_IDS.playDetail, componentId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PageContent bgPic={musicInfo.pic}>
      <StatusBar />
      {
        isHorizontalMode
          ? <Horizontal componentId={componentId} visible={visible} />
          : <Vertical componentId={componentId} visible={visible} />
      }
    </PageContent>
  )
}
