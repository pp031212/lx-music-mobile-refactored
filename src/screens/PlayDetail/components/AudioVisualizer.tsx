import { useEffect, useState } from 'react'
import { AppState, StyleSheet, UIManager, requireNativeComponent, type ViewProps } from 'react-native'
import { hasAudioEffects, setSpectrumEnabled } from '@/plugins/player/audioEffects'
import { useIsPlay } from '@/store/player/hook'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

interface NativeSpectrumProps extends ViewProps {
  active: boolean
  barColor: string
  darkMode: boolean
}

const VIEW_NAME = 'SpectrumVisualizerView'
const hasNativeVisualizer = Boolean(UIManager.getViewManagerConfig?.(VIEW_NAME))
const NativeSpectrumVisualizer = hasNativeVisualizer
  ? requireNativeComponent<NativeSpectrumProps>(VIEW_NAME)
  : null

export default ({ visible }: { visible: boolean }) => {
  const enabled = useSettingValue('player.spectrumEnabled') && hasAudioEffects && hasNativeVisualizer
  const playing = useIsPlay()
  const theme = useTheme()
  const [foreground, setForeground] = useState(AppState.currentState === 'active')

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { setForeground(state === 'active') })
    setForeground(AppState.currentState === 'active')
    return () => { subscription.remove() }
  }, [])

  const capturing = enabled && visible && playing && foreground
  useEffect(() => {
    if (!capturing) return
    setSpectrumEnabled(true)
    return () => {
      setSpectrumEnabled(false)
    }
  }, [capturing])

  if (!enabled || !NativeSpectrumVisualizer) return null

  return (
    <NativeSpectrumVisualizer
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      active={capturing}
      barColor={theme['c-primary']}
      darkMode={theme.isDark}
      style={styles.visualizer}
    />
  )
}

const styles = createStyle({
  visualizer: {
    ...StyleSheet.absoluteFillObject,
  },
})
