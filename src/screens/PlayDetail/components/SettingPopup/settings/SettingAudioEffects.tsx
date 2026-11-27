import { useMemo, useRef, useState } from 'react'
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native'
import Slider from '@/components/common/Slider'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import {
  EQ_CUSTOM_PRESET_LIMIT,
  EQ_PRESET_NAME_LIMIT,
  EQ_FREQUENCIES,
  EQ_GAIN_LIMIT,
  EQ_PRESETS,
  PANNER_MAX,
  PANNER_MIN,
  hasAudioEffects,
  parseCustomEqualizerPresets,
  parseEqualizerGains,
  setPitch as setNativePitch,
  setPanner as setNativePanner,
} from '@/plugins/player/audioEffects'
import settingState from '@/store/setting/state'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'
import settingStyles from './style'
import ToggleSwitch from './ToggleSwitch'

const presetNames = Object.keys(EQ_PRESETS) as Array<keyof typeof EQ_PRESETS>

const Band = ({ frequency, gain, onChange }: { frequency: number, gain: number, onChange: (value: number) => void }) => {
  const theme = useTheme()
  return (
    <View style={styles.band}>
      <Text size={12} style={styles.frequency} color={theme['c-font-label']}>
        {frequency >= 1000 ? `${frequency / 1000} kHz` : `${frequency} Hz`}
      </Text>
      <Slider
        value={gain}
        minimumValue={-EQ_GAIN_LIMIT}
        maximumValue={EQ_GAIN_LIMIT}
        step={1}
        onValueChange={onChange}
        onSlidingComplete={onChange}
      />
      <Text size={12} style={styles.level} color={theme['c-font-label']}>
        {gain > 0 ? '+' : ''}{gain} dB
      </Text>
    </View>
  )
}

export default () => {
  const t = useI18n()
  const theme = useTheme()
  const spectrum = useSettingValue('player.spectrumEnabled')
  const equalizer = useSettingValue('player.equalizerEnabled')
  const storedGains = useSettingValue('player.equalizerGains')
  const storedCustomPresets = useSettingValue('player.equalizerCustomPresets')
  const storedPitch = Math.round((useSettingValue('player.pitch') ?? 1) * 100)
  const pannerEnabled = useSettingValue('player.pannerEnabled')
  const storedPannerSpeed = useSettingValue('player.pannerSpeed') ?? 5
  const storedPannerRadius = useSettingValue('player.pannerSoundR') ?? 5

  const gains = useMemo(() => parseEqualizerGains(storedGains), [storedGains])
  const customPresets = useMemo(() => parseCustomEqualizerPresets(storedCustomPresets), [storedCustomPresets])

  const [expanded, setExpanded] = useState(false)
  const [addingPreset, setAddingPreset] = useState(false)
  const presetName = useRef('')
  const [slidingPitch, setSlidingPitch] = useState<number | null>(null)
  const [slidingSpeed, setSlidingSpeed] = useState<number | null>(null)
  const [slidingRadius, setSlidingRadius] = useState<number | null>(null)

  if (!hasAudioEffects) return null

  const selectPreset = (values: readonly number[]) => {
    updateSetting({ 'player.equalizerGains': values.join(',') })
  }

  const updateGain = (band: number, value: number) => {
    const settings = settingState.setting
    if (!settings['player.equalizerEnabled']) return
    const next = parseEqualizerGains(settings['player.equalizerGains'])
    const rounded = Math.round(value)
    if (next[band] === rounded) return
    next[band] = rounded
    updateSetting({ 'player.equalizerGains': next.join(',') })
  }

  const handleSaveCustomPreset = () => {
    const name = presetName.current.trim().slice(0, EQ_PRESET_NAME_LIMIT)
    presetName.current = ''
    setAddingPreset(false)
    const settings = settingState.setting
    if (!name || !settings['player.equalizerEnabled']) return
    const saved = parseCustomEqualizerPresets(settings['player.equalizerCustomPresets'])
    if (saved.length >= EQ_CUSTOM_PRESET_LIMIT) return
    const gains = parseEqualizerGains(settings['player.equalizerGains'])
    let timestamp = Date.now()
    while (saved.some(p => p.id === `custom_${timestamp}`)) timestamp++
    saved.push({ id: `custom_${timestamp}`, name, gains })
    updateSetting({ 'player.equalizerCustomPresets': JSON.stringify(saved) })
  }

  const handleDeleteCustomPreset = (id: string) => {
    const saved = parseCustomEqualizerPresets(settingState.setting['player.equalizerCustomPresets'])
    const next = saved.filter(p => p.id !== id)
    updateSetting({ 'player.equalizerCustomPresets': JSON.stringify(next) })
  }

  const isEqFlat = gains.every(g => g === 0)
  const displayPitch = slidingPitch ?? storedPitch
  const isPitchDefault = displayPitch === 100
  const displaySpeed = slidingSpeed ?? storedPannerSpeed
  const displayRadius = slidingRadius ?? storedPannerRadius

  const spectrumLabel = t('play_detail_audio_spectrum')
  const equalizerLabel = t('play_detail_equalizer')
  const pannerLabel = t('play_detail_panner')

  return (
    <View
      style={{
        ...settingStyles.card,
        backgroundColor: theme['c-main-background'],
        borderColor: theme['c-border-background'],
      }}
    >
      {/* Audio Spectrum */}
      <TouchableOpacity
        activeOpacity={0.72}
        accessibilityRole="switch"
        accessibilityLabel={spectrumLabel}
        accessibilityState={{ checked: spectrum }}
        onPress={() => { updateSetting({ 'player.spectrumEnabled': !spectrum }) }}
        style={settingStyles.switchRow}
      >
        <Text size={14} style={settingStyles.switchLabel}>{spectrumLabel}</Text>
        <ToggleSwitch value={spectrum} />
      </TouchableOpacity>

      <View style={{ ...settingStyles.divider, borderTopColor: theme['c-border-background'] }} />

      {/* 10-Band Equalizer */}
      <TouchableOpacity
        activeOpacity={0.72}
        accessibilityRole="switch"
        accessibilityLabel={equalizerLabel}
        accessibilityState={{ checked: equalizer }}
        onPress={() => {
          presetName.current = ''
          setAddingPreset(false)
          updateSetting({ 'player.equalizerEnabled': !equalizer })
        }}
        style={settingStyles.switchRow}
      >
        <Text size={14} style={settingStyles.switchLabel}>{equalizerLabel}</Text>
        <ToggleSwitch value={equalizer} />
      </TouchableOpacity>

      {equalizer ? (
        <View style={styles.eqBody}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
            {presetNames.map(preset => {
              const selected = EQ_PRESETS[preset].every((gain, index) => gain === gains[index])
              return (
                <TouchableOpacity
                  key={preset}
                  activeOpacity={0.72}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => { selectPreset(EQ_PRESETS[preset]) }}
                  style={{
                    ...styles.preset,
                    backgroundColor: selected ? theme['c-primary-alpha-900'] : theme['c-content-background'],
                    borderColor: selected ? theme['c-primary'] : theme['c-border-background'],
                  }}
                >
                  <Text size={12} color={selected ? theme['c-primary-font-active'] : theme['c-font']}>
                    {t(`play_detail_eq_${preset}`)}
                  </Text>
                </TouchableOpacity>
              )
            })}
            {customPresets.map(preset => {
              const selected = preset.gains.every((gain, index) => gain === gains[index])
              return (
                <View
                  key={preset.id}
                  style={{
                    ...styles.customPresetChip,
                    backgroundColor: selected ? theme['c-primary-alpha-900'] : theme['c-content-background'],
                    borderColor: selected ? theme['c-primary'] : theme['c-border-background'],
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.72}
                    onPress={() => { selectPreset(preset.gains) }}
                    style={styles.customPresetTap}
                  >
                    <Text size={12} color={selected ? theme['c-primary-font-active'] : theme['c-font']}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.65}
                    onPress={() => { handleDeleteCustomPreset(preset.id) }}
                    style={styles.customPresetDel}
                  >
                    <Icon name="close" size={10} color={theme['c-font-label']} />
                  </TouchableOpacity>
                </View>
              )
            })}
          </ScrollView>

          <View style={styles.eqActionsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => { setExpanded(current => !current) }}
              style={styles.expand}
            >
              <Text size={13} color={theme['c-primary-font-active']}>
                {t(expanded ? 'play_detail_eq_hide_bands' : 'play_detail_eq_show_bands')}
              </Text>
              <Icon
                name={expanded ? 'chevron-left' : 'chevron-right'}
                size={12}
                color={theme['c-primary-font-active']}
                style={{ transform: [{ rotate: '90deg' }] }}
              />
            </TouchableOpacity>

            <View style={styles.eqRightBtns}>
              {!isEqFlat ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { selectPreset(EQ_PRESETS.flat) }}
                  style={{ ...styles.miniPillBtn, backgroundColor: theme['c-content-background'], borderColor: theme['c-border-background'] }}
                >
                  <Text size={11} color={theme['c-font-label']}>{t('play_detail_setting_playback_rate_reset')}</Text>
                </TouchableOpacity>
              ) : null}
              {customPresets.length < EQ_CUSTOM_PRESET_LIMIT ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { setAddingPreset(v => !v) }}
                  style={{ ...styles.miniPillBtn, backgroundColor: theme['c-primary-alpha-900'], borderColor: theme['c-primary-alpha-700'] }}
                >
                  <Text size={11} color={theme['c-primary-font-active']}>{t('play_detail_eq_save_preset')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {addingPreset ? (
            <View style={styles.savePresetRow}>
              <TextInput
                autoFocus
                onChangeText={value => { presetName.current = value }}
                onBlur={handleSaveCustomPreset}
                placeholder={t('play_detail_eq_preset_name_placeholder')}
                placeholderTextColor={theme['c-font-label']}
                maxLength={EQ_PRESET_NAME_LIMIT}
                onSubmitEditing={handleSaveCustomPreset}
                style={{
                  ...styles.presetInput,
                  color: theme['c-font'],
                  backgroundColor: theme['c-content-background'],
                  borderColor: theme['c-border-background'],
                }}
              />
              <TouchableOpacity
                activeOpacity={0.72}
                onPress={handleSaveCustomPreset}
                style={{ ...styles.saveConfirmBtn, backgroundColor: theme['c-primary'] }}
              >
                <Text size={12} color="#ffffff" style={styles.saveConfirmText}>
                  {t('play_detail_eq_save_confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {expanded ? (
            <View style={styles.bandsWrap}>
              {EQ_FREQUENCIES.map((frequency, band) => (
                <Band key={frequency} frequency={frequency} gain={gains[band]} onChange={value => { updateGain(band, value) }} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ ...settingStyles.divider, borderTopColor: theme['c-border-background'] }} />

      {/* Native Pitch Shifter */}
      <View style={settingStyles.item}>
        <View style={settingStyles.headerRow}>
          <Text size={14}>{t('play_detail_pitch')}</Text>
          <View style={styles.rightActions}>
            <Text size={13} style={settingStyles.valueText} color={theme['c-font-label']}>
              {`${(displayPitch / 100).toFixed(2)}x`}
            </Text>
            {!isPitchDefault ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setSlidingPitch(null)
                  void setNativePitch(1)
                  updateSetting({ 'player.pitch': 1 })
                }}
                style={{ ...styles.resetBtn, backgroundColor: theme['c-primary-alpha-900'] }}
              >
                <Text size={11} color={theme['c-primary-font-active']}>
                  {t('play_detail_setting_playback_rate_reset')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        <View style={settingStyles.sliderWrap}>
          <Slider
            minimumValue={50}
            maximumValue={150}
            step={5}
            value={storedPitch}
            onSlidingStart={v => { setSlidingPitch(Math.round(v)) }}
            onValueChange={v => {
              const rounded = Math.round(v)
              setSlidingPitch(rounded)
              void setNativePitch(rounded / 100)
            }}
            onSlidingComplete={v => {
              const rounded = Math.round(v)
              setSlidingPitch(null)
              const next = rounded / 100
              void setNativePitch(next)
              if (rounded !== storedPitch) updateSetting({ 'player.pitch': next })
            }}
          />
        </View>
      </View>

      <View style={{ ...settingStyles.divider, borderTopColor: theme['c-border-background'] }} />

      {/* 3D Surround Panner */}
      <TouchableOpacity
        activeOpacity={0.72}
        accessibilityRole="switch"
        accessibilityLabel={pannerLabel}
        accessibilityState={{ checked: pannerEnabled }}
        onPress={() => { updateSetting({ 'player.pannerEnabled': !pannerEnabled }) }}
        style={settingStyles.switchRow}
      >
        <Text size={14} style={settingStyles.switchLabel}>{pannerLabel}</Text>
        <ToggleSwitch value={pannerEnabled} />
      </TouchableOpacity>

      {pannerEnabled ? (
        <View style={styles.pannerBody}>
          <View style={styles.subSliderBlock}>
            <View style={settingStyles.headerRow}>
              <Text size={12} color={theme['c-font-label']}>{t('play_detail_panner_speed')}</Text>
              <Text size={12} color={theme['c-font-label']}>{displaySpeed}</Text>
            </View>
            <View style={settingStyles.sliderWrap}>
              <Slider
                minimumValue={PANNER_MIN}
                maximumValue={PANNER_MAX}
                step={1}
                value={storedPannerSpeed}
                onSlidingStart={v => { setSlidingSpeed(Math.round(v)) }}
                onValueChange={v => {
                  const rounded = Math.round(v)
                  setSlidingSpeed(rounded)
                  void setNativePanner(true, rounded, displayRadius)
                }}
                onSlidingComplete={v => {
                  const rounded = Math.round(v)
                  setSlidingSpeed(null)
                  void setNativePanner(true, rounded, storedPannerRadius)
                  if (rounded !== storedPannerSpeed) updateSetting({ 'player.pannerSpeed': rounded })
                }}
              />
            </View>
          </View>
          <View style={styles.subSliderBlock}>
            <View style={settingStyles.headerRow}>
              <Text size={12} color={theme['c-font-label']}>{t('play_detail_panner_radius')}</Text>
              <Text size={12} color={theme['c-font-label']}>{displayRadius}</Text>
            </View>
            <View style={settingStyles.sliderWrap}>
              <Slider
                minimumValue={PANNER_MIN}
                maximumValue={PANNER_MAX}
                step={1}
                value={storedPannerRadius}
                onSlidingStart={v => { setSlidingRadius(Math.round(v)) }}
                onValueChange={v => {
                  const rounded = Math.round(v)
                  setSlidingRadius(rounded)
                  void setNativePanner(true, displaySpeed, rounded)
                }}
                onSlidingComplete={v => {
                  const rounded = Math.round(v)
                  setSlidingRadius(null)
                  void setNativePanner(true, storedPannerSpeed, rounded)
                  if (rounded !== storedPannerRadius) updateSetting({ 'player.pannerSoundR': rounded })
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = createStyle({
  eqBody: {
    paddingBottom: 10,
  },
  presets: {
    gap: 8,
    paddingTop: 2,
    paddingBottom: 6,
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: BorderWidths.normal,
  },
  customPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: BorderWidths.normal,
    overflow: 'hidden',
  },
  customPresetTap: {
    paddingLeft: 11,
    paddingRight: 5,
    paddingVertical: 6,
  },
  customPresetDel: {
    paddingLeft: 3,
    paddingRight: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eqActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 4,
  },
  expand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eqRightBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniPillBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 11,
    borderWidth: BorderWidths.normal,
  },
  savePresetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  presetInput: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 13,
  },
  saveConfirmBtn: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveConfirmText: {
    fontWeight: '600',
  },
  bandsWrap: {
    paddingTop: 4,
  },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequency: {
    width: 56,
  },
  level: {
    width: 47,
    textAlign: 'right',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pannerBody: {
    paddingBottom: 8,
  },
  subSliderBlock: {
    paddingTop: 4,
    paddingBottom: 4,
  },
})
