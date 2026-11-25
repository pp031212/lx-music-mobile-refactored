import { memo, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { useKeyboard } from '@/utils/hooks'

import Pic from './components/Pic'
import Title from './components/Title'
import PlayInfo from './components/PlayInfo'
import ControlBtn from './components/ControlBtn'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { useSettingValue } from '@/store/setting/hook'
import { BorderWidths } from '@/theme'
import { subscribeMultiSelectBarVisible } from '@/components/common/MultiSelectActionBar'

export default memo(({ isHome = false }: { isHome?: boolean }) => {
  const { keyboardShown } = useKeyboard()
  const theme = useTheme()
  const autoHidePlayBar = useSettingValue('common.autoHidePlayBar')
  const [hiddenByMultiSelect, setHiddenByMultiSelect] = useState(false)

  useEffect(() => {
    return subscribeMultiSelectBarVisible(setHiddenByMultiSelect)
  }, [])

  const playerComponent = useMemo(() => (
    <View style={{ ...styles.outerWrap, backgroundColor: 'transparent' }}>
      <View
        style={{
          ...styles.container,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
      >
        <Pic isHome={isHome} />
        <View style={styles.center}>
          <Title isHome={isHome} />
          <PlayInfo isHome={isHome} />
        </View>
        <View style={styles.right}>
          <ControlBtn />
        </View>
      </View>
    </View>
  ), [theme, isHome])

  if (hiddenByMultiSelect) return null
  return autoHidePlayBar && keyboardShown ? null : playerComponent
})

const styles = createStyle({
  outerWrap: {
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 2,
  },
  container: {
    width: '100%',
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 14,
    borderWidth: BorderWidths.normal,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
  },
  center: {
    flexDirection: 'column',
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    paddingLeft: 4,
  },
})
