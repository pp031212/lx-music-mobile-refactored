import { forwardRef, useImperativeHandle, useRef } from 'react'
import { View } from 'react-native'

import SortTab, { type SortTabProps, type SortTabType } from './SortTab'
import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'
import SourceSelector, {
  type SourceSelectorType,
  type SourceSelectorProps,
} from './SourceSelector'
import { type Source } from '@/store/songlist/state'
import { useTheme } from '@/store/theme/hook'
import Tag, { type TagType, type TagProps } from './Tag'
import OpenList, { type OpenListType } from './OpenList'

export interface HeaderBarProps {
  onSortChange: SortTabProps['onSortChange']
  onTagChange: TagProps['onTagChange']
  onSourceChange: SourceSelectorProps['onSourceChange']
}

export interface HeaderBarType {
  setSource: (source: Source, sortId: string, tagName: string, tagId: string) => void
}


export default forwardRef<HeaderBarType, HeaderBarProps>(({ onSortChange, onTagChange, onSourceChange }, ref) => {
  const sortTabRef = useRef<SortTabType>(null)
  const tagRef = useRef<TagType>(null)
  const openListRef = useRef<OpenListType>(null)
  const sourceSelectorRef = useRef<SourceSelectorType>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    setSource(source, sortId, tagName, tagId) {
      sortTabRef.current?.setSource(source, sortId)
      tagRef.current?.setSelectedTagInfo(source, tagName, tagId)
      sourceSelectorRef.current?.setSource(source)
      openListRef.current?.setInfo(source)
    },
  }), [])


  return (
    <View style={{ ...styles.container, borderBottomColor: theme['c-border-background'] }}>
      <View style={styles.topRow}>
        <SourceSelector
          ref={sourceSelectorRef}
          onSourceChange={onSourceChange}
          style={{
            ...styles.sourcePill,
            backgroundColor: theme['c-content-background'],
            borderColor: theme['c-border-background'],
          }}
        />
        <OpenList ref={openListRef} />
      </View>
      <View style={styles.filterRow}>
        <Tag ref={tagRef} onTagChange={onTagChange} />
        <View style={styles.sortWrap}>
          <SortTab ref={sortTabRef} onSortChange={onSortChange} />
        </View>
      </View>
    </View>
  )
})

const styles = createStyle({
  container: {
    flexDirection: 'column',
    zIndex: 2,
    borderBottomWidth: BorderWidths.normal,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 32,
  },
  sourcePill: {
    height: 32,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    overflow: 'hidden',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  sortWrap: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
  },
})
