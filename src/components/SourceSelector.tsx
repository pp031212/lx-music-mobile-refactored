import { forwardRef, type Ref, useImperativeHandle, useMemo, useState } from 'react'
import { View, Image, type ImageSourcePropType } from 'react-native'

import DorpDownMenu, { type DorpDownMenuProps as _DorpDownMenuProps } from '@/components/common/DorpDownMenu'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'

import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import { createStyle } from '@/utils/tools'

type Sources = Readonly<Array<LX.OnlineSource | 'all'>>

export const SOURCE_ICONS: Partial<Record<LX.OnlineSource | 'all', ImageSourcePropType>> = {
  kw: require('@/resources/images/sources/kw.png'),
  kg: require('@/resources/images/sources/kg.png'),
  tx: require('@/resources/images/sources/tx.png'),
  wy: require('@/resources/images/sources/wy.png'),
  mg: require('@/resources/images/sources/mg.png'),
}

export interface SourceSelectorProps<S extends Sources> {
  fontSize?: number
  center?: _DorpDownMenuProps<any>['center']
  compactIconOnly?: boolean
  onSourceChange: (source: S[number]) => void
}

export interface SourceSelectorType<S extends Sources> {
  setSourceList: (list: S, activeSource: S[number]) => void
}

export const useSourceListI18n = (list: Sources) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const t = useI18n()
  return useMemo(() => {
    return list.map(s => ({ label: t(`source_${sourceNameType}_${s}`), action: s, icon: SOURCE_ICONS[s] }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, sourceNameType, t])
}

const Component = <S extends Sources>({ fontSize = 15, center, compactIconOnly = true, onSourceChange }: SourceSelectorProps<S>, ref: Ref<SourceSelectorType<S>>) => {
  const sourceNameType = useSettingValue('common.sourceNameType')
  const theme = useTheme()
  const [list, setList] = useState([] as unknown as S)
  const [source, setSource] = useState<S[number]>('kw')
  const t = useI18n()

  useImperativeHandle(ref, () => ({
    setSourceList(list, activeSource) {
      setList(list)
      setSource(activeSource)
    },
  }), [])

  const sourceList_t = useSourceListI18n(list)

  type DorpDownMenuProps = _DorpDownMenuProps<typeof sourceList_t>

  const handleChangeSource: DorpDownMenuProps['onPress'] = ({ action }) => {
    onSourceChange(action)
    setSource(action)
  }

  const activeIcon = SOURCE_ICONS[source]
  const showIconOnly = compactIconOnly && Boolean(activeIcon)

  return (
    <DorpDownMenu
      menus={sourceList_t}
      center={center}
      onPress={handleChangeSource}
      fontSize={fontSize}
      activeId={source}
    >
      <View
        style={{
          ...(showIconOnly ? styles.sourceMenuCompact : styles.sourceMenu),
          justifyContent: center ? 'center' : 'flex-start',
        }}
      >
        {activeIcon ? (
          <Image
            source={activeIcon}
            style={showIconOnly ? styles.sourceIconCompact : styles.sourceIcon}
            resizeMode="contain"
          />
        ) : null}
        {!showIconOnly ? (
          <Text
            style={{ textAlign: center ? 'center' : 'left' }}
            numberOfLines={1}
            size={compactIconOnly ? 13 : fontSize}
          >
            {t(`source_${sourceNameType}_${source}`)}
          </Text>
        ) : null}
        <Text style={styles.dropdownTriangle} size={13} color={theme['c-font-label']}>▾</Text>
      </View>
    </DorpDownMenu>
  )
}

export default forwardRef(Component) as <S extends Sources>(p: SourceSelectorProps<S> & { ref?: Ref<SourceSelectorType<S>> }) => JSX.Element | null


const styles = createStyle({
  sourceMenu: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 10,
  },
  sourceMenuCompact: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 6,
  },
  sourceIcon: {
    width: 16,
    height: 16,
    borderRadius: 3,
    marginRight: 5,
  },
  sourceIconCompact: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  dropdownTriangle: {
    marginLeft: 4,
    lineHeight: 16,
  },
})
