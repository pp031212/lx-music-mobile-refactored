import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { TouchableOpacity, View } from 'react-native'

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
  onBackToOverview?: () => void
}
export interface ActiveListType {
  setVisibleBar: (visible: boolean) => void
}

export default forwardRef<ActiveListType, ActiveListProps>(({ onShowSearchBar, onScrollToTop, onBackToOverview }, ref) => {
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

  const handleBack = () => {
    if (onBackToOverview) onBackToOverview()
    else global.app_event.changeLoveListVisible(true)
  }

  useEffect(() => {
    if (listState.activeListId) return
    void getListPrevSelectId().then((id) => {
      setActiveList(id)
    })
  }, [])

  return (
    <View style={{ ...styles.currentList, opacity: visibleBar ? 1 : 0, borderBottomColor: theme['c-border-background'] }}>
      <TouchableOpacity style={styles.backBtn} activeOpacity={0.65} onPress={handleBack}>
        <Icon name="chevron-left" size={18} color={theme['c-font']} />
      </TouchableOpacity>
      {fetching ? <Loading color={theme['c-primary-font-active']} style={styles.loading} /> : null}
      <TouchableOpacity style={styles.titleWrap} activeOpacity={1} onLongPress={onScrollToTop}>
        <Text style={styles.currentListText} size={15} numberOfLines={1} color={theme['c-font']}>
          {currentListName}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.currentListBtns} onPress={onShowSearchBar}>
        <Icon color={theme['c-font-label']} name="search-2" size={16} />
      </TouchableOpacity>
    </View>
  )
})

const styles = createStyle({
  currentList: {
    flexDirection: 'row',
    paddingRight: 4,
    height: 46,
    alignItems: 'center',
    borderBottomWidth: BorderWidths.normal,
  },
  backBtn: {
    width: 44,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleWrap: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  currentListText: {
    paddingRight: 6,
    fontWeight: '500',
  },
  loading: {
    marginRight: 5,
  },
  currentListBtns: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
})
