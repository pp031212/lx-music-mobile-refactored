import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity } from 'react-native'

import { Icon } from '@/components/common/Icon'
import { BorderWidths } from '@/theme'
import { useTheme } from '@/store/theme/hook'
import { useActiveListId, useListFetching } from '@/store/list/hook'
import listState from '@/store/list/state'
import { createStyle } from '@/utils/tools'
import { getListPrevSelectId } from '@/utils/data'
import { setActiveList } from '@/core/list'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import Loading from '@/components/common/Loading'
import { useSettingValue } from '@/store/setting/hook'

export interface ActiveListProps {
  onShowSearchBar: () => void
  onScrollToTop: () => void
}
export interface ActiveListType {
  setVisibleBar: (visible: boolean) => void
}

export default forwardRef<ActiveListType, ActiveListProps>(({ onShowSearchBar, onScrollToTop }, ref) => {
  const theme = useTheme()
  const currentListId = useActiveListId()
  const fetching = useListFetching(currentListId)
  const langId = useSettingValue('common.langId')
  const currentListName = useMemo(() => {
    switch (currentListId) {
      case LIST_IDS.TEMP:
        return global.i18n.t('list_name_temp')
      case LIST_IDS.DEFAULT:
        return global.i18n.t('list_name_default')
      case LIST_IDS.LOVE:
        return global.i18n.t('list_name_love')
      default:
        return listState.allList.find(l => l.id === currentListId)?.name ?? ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentListId, langId])
  const [visibleBar, setVisibleBar] = useState(true)

  useImperativeHandle(ref, () => ({
    setVisibleBar(visible) {
      setVisibleBar(visible)
    },
  }))

  const showList = () => {
    global.app_event.changeLoveListVisible(true)
  }

  const jumpToPlaying = () => {
    global.app_event.jumpListPosition()
  }

  useEffect(() => {
    void getListPrevSelectId().then((id) => {
      setActiveList(id)
    })
  }, [])

  return (
    <TouchableOpacity onPress={showList} onLongPress={onScrollToTop} style={{ ...styles.currentList, opacity: visibleBar ? 1 : 0, borderBottomColor: theme['c-border-background'] }}>
      <Icon style={styles.currentListIcon} color={theme['c-button-font']} name="menu" size={15} />
      {fetching ? <Loading color={theme['c-button-font']} style={styles.loading} /> : null}
      <Text style={styles.currentListText} size={15} numberOfLines={1} color={theme['c-button-font']}>{currentListName}</Text>
      <TouchableOpacity style={styles.currentListBtns} onPress={jumpToPlaying}>
        <Icon color={theme['c-button-font']} name="play-outline" size={15} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.currentListBtns} onPress={onShowSearchBar}>
        <Icon color={theme['c-button-font']} name="search-2" size={16} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
})

const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    paddingRight: 4,
    height: 44,
    alignItems: 'center',
    borderBottomWidth: BorderWidths.normal,
  },
  currentListIcon: {
    paddingLeft: 16,
    paddingRight: 10,
  },
  currentListText: {
    flex: 1,
    paddingRight: 10,
    fontWeight: '500',
  },
  loading: {
    marginRight: 5,
  },
  currentListBtns: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
})
