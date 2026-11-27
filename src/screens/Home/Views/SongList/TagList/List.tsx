import { useEffect, useState, useRef } from 'react'
import { View, ScrollView } from 'react-native'

import { createStyle } from '@/utils/tools'
import TagGroup, { type TagGroupProps } from './TagGroup'
import { useI18n } from '@/lang'
import { type TagInfo, type Source } from '@/store/songlist/state'
import { getTags } from '@/core/songlist'
import Text from '@/components/common/Text'

export interface ListProps {
  source: Source
  activeId: string
  onTagChange: TagGroupProps['onTagChange']
}

export default ({ source, activeId, onTagChange }: ListProps) => {
  const [list, setList] = useState<TagInfo['tags']>([])
  const [loading, setLoading] = useState(false)
  const t = useI18n()
  const prevSource = useRef('')

  useEffect(() => {
    let cancelled = false
    if (source == prevSource.current && list.length > 1) return

    const defaultGroup = {
      name: '',
      list: [{ name: t('songlist_tag_default'), id: '', parent_id: '', parent_name: '', source }],
    }
    setList([defaultGroup])
    setLoading(true)

    void getTags(source).then(tagInfo => {
      if (cancelled) return
      prevSource.current = source
      setList([
        defaultGroup,
        { name: t('songlist_tag_hot'), list: [...tagInfo.hotTag] },
        ...tagInfo.tags,
      ].filter(item => item.list.length))
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, t])

  return (
    <ScrollView style={{ flexShrink: 1, flexGrow: 0 }} keyboardShouldPersistTaps={'always'}>
      <View style={styles.tagContainer} onStartShouldSetResponder={() => true}>
        {
          list.map((type, index) => (
            <TagGroup
              key={index}
              name={type.name}
              list={type.list}
              activeId={activeId}
              onTagChange={onTagChange}
            />
          ))
        }
        {
          loading
            ? (
                <View style={styles.blankView}>
                  <Text>{t('list_loading')}</Text>
                </View>
              )
            : null
        }
      </View>
    </ScrollView>
  )
}


const styles = createStyle({
  tagContainer: {
    paddingTop: 15,
    paddingLeft: 15,
    paddingRight: 15,
    paddingBottom: 15,
  },
  blankView: {
    paddingTop: '15%',
    paddingBottom: '15%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
