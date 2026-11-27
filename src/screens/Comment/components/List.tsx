import { useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { FlatList, type FlatListProps, RefreshControl, View } from 'react-native'

import CommentFloor from './CommentFloor'
import { createStyle } from '@/utils/tools'
import { useTheme } from '@/store/theme/hook'
import { type Comment } from '../utils'
import { useI18n } from '@/lang'
import Text from '@/components/common/Text'

type FlatListType = FlatListProps<Comment>

export interface ListProps {
  onRefresh: () => void
  onLoadMore: () => void
}
export interface ListType {
  setList: (list: Comment[]) => void
  getList: () => Comment[]
  setStatus: (val: Status) => void
}
export type Status = 'loading' | 'refreshing' | 'end' | 'error' | 'idle'

const List = forwardRef<ListType, ListProps>(({
  onRefresh,
  onLoadMore,
}, ref) => {
  const theme = useTheme()
  const flatListRef = useRef<FlatList>(null)
  const [currentList, setListState] = useState<Comment[]>([])
  const currentListRef = useRef<Comment[]>([])
  const [status, setStatus] = useState<Status>('idle')

  useImperativeHandle(ref, () => ({
    setList(list) {
      currentListRef.current = list
      setListState(list)
    },
    getList() {
      return currentListRef.current
    },
    setStatus(val) {
      setStatus(val)
    },
  }))

  const handleLoadMore = () => {
    if (status != 'idle') return
    onLoadMore()
  }

  const renderItem: FlatListType['renderItem'] = ({ item }) => <CommentFloor comment={item} />

  const getkey: FlatListType['keyExtractor'] = (item, index) => (item.id != null ? String(item.id) : `c_${index}`)

  const refreshControl = useMemo(() => (
    <RefreshControl
      colors={[theme['c-primary']]}
      refreshing={status == 'refreshing'}
      onRefresh={onRefresh} />
  ), [status, onRefresh, theme])
  const footerComponent = useMemo(() => {
    let label: FooterLabel
    switch (status) {
      case 'refreshing': return null
      case 'loading':
        label = 'list_loading'
        break
      case 'end':
        label = 'list_end'
        break
      case 'error':
        label = 'list_error'
        break
      case 'idle':
        label = null
        break
    }
    return <Footer label={label} onLoadMore={onLoadMore} />
  }, [onLoadMore, status])

  return (
    <FlatList
      ref={flatListRef}
      style={styles.list}
      data={currentList}
      onEndReachedThreshold={0.5}
      removeClippedSubviews={false}
      renderItem={renderItem}
      keyExtractor={getkey}
      onEndReached={handleLoadMore}
      refreshControl={refreshControl}
      ListFooterComponent={footerComponent}
    />
  )
})

type FooterLabel = 'list_loading' | 'list_end' | 'list_error' | null
const Footer = ({ label, onLoadMore }: {
  label: FooterLabel
  onLoadMore: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const handlePress = () => {
    if (label != 'list_error') return
    onLoadMore()
  }
  return (
    label
      ? (
          <View>
            <Text onPress={handlePress} style={styles.footer} color={theme['c-font-label']}>{t(label)}</Text>
          </View>
        )
      : null
  )
}

const styles = createStyle({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 15,
    paddingRight: 15,
  },
  footer: {
    textAlign: 'center',
    padding: 10,
  },
})

export default List
