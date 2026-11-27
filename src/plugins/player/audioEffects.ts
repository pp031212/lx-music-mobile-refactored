import { NativeModules } from 'react-native'
import settingState from '@/store/setting/state'
import { log } from '@/utils/log'

const audioEffects = NativeModules.AudioEffectsModule as {
  setEqualizer: (enabled: boolean, bands: readonly number[]) => Promise<void>
  setPitch?: (pitch: number) => Promise<void>
  setPanner?: (enabled: boolean, speed: number, radius: number) => Promise<void>
  setSpectrumEnabled: (enabled: boolean) => void
  getSpectrum: () => Promise<number[]>
} | undefined

export interface CustomEQPreset {
  id: string
  name: string
  gains: number[]
}

export const hasAudioEffects = Boolean(audioEffects)
export const EQ_FREQUENCIES = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const
export const EQ_GAIN_LIMIT = 15
export const EQ_CUSTOM_PRESET_LIMIT = 31
export const EQ_PRESET_NAME_LIMIT = 20
export const PITCH_MIN = 0.5
export const PITCH_MAX = 1.5
export const PANNER_MIN = 1
export const PANNER_MAX = 10

// Preset values from LX Music Desktop (Apache-2.0).
export const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  pop: [6, 5, -3, -2, 5, 4, -4, -3, 6, 4],
  dance: [4, 3, -4, -6, 0, 0, 3, 4, 4, 5],
  rock: [7, 6, 2, 1, -3, -4, 2, 1, 4, 5],
  classical: [6, 7, 1, 2, -1, 1, -4, -6, -7, -8],
  vocal: [-5, -6, -4, -3, 3, 4, 5, 4, -3, -3],
  slow: [5, 4, 2, 0, -2, 0, 3, 6, 7, 8],
  electronic: [6, 5, 0, -5, -4, 0, 6, 8, 8, 7],
  subwoofer: [8, 7, 5, 4, 0, 0, 0, 0, 0, 0],
  soft: [-5, -5, -4, -4, 3, 2, 4, 4, 0, 0],
} as const

export const parseEqualizerGains = (stored: unknown): number[] => {
  if (typeof stored !== 'string') return [...EQ_PRESETS.flat]
  const values = stored.split(',').map(Number)
  if (values.length !== EQ_FREQUENCIES.length) return [...EQ_PRESETS.flat]
  return values.map(value => Number.isFinite(value) ? Math.max(-EQ_GAIN_LIMIT, Math.min(EQ_GAIN_LIMIT, value)) : 0)
}

export const parseCustomEqualizerPresets = (stored: unknown): CustomEQPreset[] => {
  if (typeof stored !== 'string' || !stored.trim()) return []
  try {
    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    const result: CustomEQPreset[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const id = typeof item.id === 'string' && item.id ? item.id : null
      const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : null
      const gains = Array.isArray(item.gains) && item.gains.length === EQ_FREQUENCIES.length
        ? item.gains.map((g: unknown) => {
            const n = Number(g)
            return Number.isFinite(n) ? Math.max(-EQ_GAIN_LIMIT, Math.min(EQ_GAIN_LIMIT, Math.round(n))) : 0
          })
        : null
      if (id && name && gains) result.push({ id, name, gains })
    }
    return result.slice(0, EQ_CUSTOM_PRESET_LIMIT)
  } catch {
    return []
  }
}

export const setSpectrumEnabled = (enabled: boolean) => { audioEffects?.setSpectrumEnabled(enabled) }
export const getSpectrum = async() => audioEffects?.getSpectrum() ?? []

export const setPitch = async(pitch: number) => {
  if (!audioEffects?.setPitch) return
  const clamped = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch))
  await audioEffects.setPitch(clamped)
}

export const setPanner = async(enabled: boolean, speed: number, radius: number) => {
  if (!audioEffects?.setPanner) return
  await audioEffects.setPanner(
    enabled,
    Math.max(PANNER_MIN, Math.min(PANNER_MAX, speed)),
    Math.max(PANNER_MIN, Math.min(PANNER_MAX, radius)),
  )
}

const EQ_KEYS: Array<keyof LX.AppSetting> = ['player.equalizerEnabled', 'player.equalizerGains']
const PITCH_KEYS: Array<keyof LX.AppSetting> = ['player.pitch']
const PANNER_KEYS: Array<keyof LX.AppSetting> = ['player.pannerEnabled', 'player.pannerSpeed', 'player.pannerSoundR']

export const initAudioEffects = () => {
  if (!audioEffects) return

  const applyEqualizer = () => {
    const settings = settingState.setting
    void audioEffects.setEqualizer(
      settings['player.equalizerEnabled'],
      parseEqualizerGains(settings['player.equalizerGains']),
    ).catch(error => {
      log.error('equalizer:', error instanceof Error ? error.message : String(error))
    })
  }

  const applyPitch = () => {
    const pitch = settingState.setting['player.pitch'] ?? 1
    void setPitch(pitch).catch(error => {
      log.error('pitch:', error instanceof Error ? error.message : String(error))
    })
  }

  const applyPanner = () => {
    const settings = settingState.setting
    void setPanner(
      Boolean(settings['player.pannerEnabled']),
      settings['player.pannerSpeed'] ?? 5,
      settings['player.pannerSoundR'] ?? 5,
    ).catch(error => {
      log.error('panner:', error instanceof Error ? error.message : String(error))
    })
  }

  applyEqualizer()
  applyPitch()
  applyPanner()

  global.state_event.on('configUpdated', keys => {
    if (keys.some(k => EQ_KEYS.includes(k))) applyEqualizer()
    if (keys.some(k => PITCH_KEYS.includes(k))) applyPitch()
    if (keys.some(k => PANNER_KEYS.includes(k))) applyPanner()
  })
}
