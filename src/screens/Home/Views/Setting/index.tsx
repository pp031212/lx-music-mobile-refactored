import { useHorizontalMode } from '@/utils/hooks'
import Vertical, { type VerticalSettingType } from './Vertical'
import Horizontal from './Horizontal'
import { useBackHandler } from '@/utils/hooks/useBackHandler'
import { useCallback, useRef } from 'react'
import commonState from '@/store/common/state'
import { setNavActiveId } from '@/core/common'

export type { SettingScreenIds } from './Main'

export default () => {
  const isHorizontalMode = useHorizontalMode()
  const verticalRef = useRef<VerticalSettingType>(null)

  useBackHandler(useCallback(() => {
    if (Object.keys(commonState.componentIds).length == 1 && commonState.navActiveId == 'nav_setting') {
      if (!isHorizontalMode && verticalRef.current?.handleBack()) {
        return true
      }
      setNavActiveId(commonState.lastNavActiveId)
      return true
    }
    return false
  }, [isHorizontalMode]))

  return isHorizontalMode
    ? <Horizontal />
    : <Vertical ref={verticalRef} />
}
