import { useRef, forwardRef, useImperativeHandle } from 'react'
import { View } from 'react-native'
import { BorderWidths } from '@/theme'
import SourceSelector, {
  type SourceSelectorType as _SourceSelectorType,
  type SourceSelectorProps as _SourceSelectorProps,
} from '@/components/SourceSelector'
import SearchInput, { type SearchInputType, type SearchInputProps } from './SearchInput'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type Source as MusicSource } from '@/store/search/music/state'
import { type Source as SonglistSource } from '@/store/search/songlist/state'

type Sources = Readonly<Array<MusicSource | SonglistSource>>
type SourceSelectorProps = _SourceSelectorProps<Sources>
type SourceSelectorType = _SourceSelectorType<Sources>

export interface HeaderBarProps {
  onSourceChange: SourceSelectorProps['onSourceChange']
  onTipSearch: SearchInputProps['onChangeText']
  onSearch: SearchInputProps['onSubmit']
  onHideTipList: SearchInputProps['onBlur']
  onShowTipList: SearchInputProps['onTouchStart']
}

export interface HeaderBarType {
  setSourceList: SourceSelectorType['setSourceList']
  setText: SearchInputType['setText']
  blur: SearchInputType['blur']
}

export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSourceChange, onTipSearch, onSearch, onHideTipList, onShowTipList }, ref) => {
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const searchInputRef = useRef<SearchInputType>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setSourceList(list, source) {
      sourceSelectorRef.current?.setSourceList(list, source)
    },
    setText(text) {
      searchInputRef.current?.setText(text)
    },
    blur() {
      searchInputRef.current?.blur()
    },
  }), [])

  return (
    <View style={styles.outerWrap}>
      <View
        style={{
          ...styles.capsuleBar,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
      >
        <View style={{ ...styles.selector, borderRightColor: theme['c-border-background'] }}>
          <SourceSelector ref={sourceSelectorRef} onSourceChange={onSourceChange} center />
        </View>
        <View style={styles.inputWrap}>
          <SearchInput
            ref={searchInputRef}
            onChangeText={onTipSearch}
            onSubmit={onSearch}
            onBlur={onHideTipList}
            onTouchStart={onShowTipList}
          />
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  outerWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    zIndex: 2,
  },
  capsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  selector: {
    height: '66%',
    justifyContent: 'center',
    borderRightWidth: BorderWidths.normal,
    paddingRight: 4,
    marginRight: 4,
  },
  inputWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
})
