import { memo, useEffect, useRef, useState } from 'react'
import { ScrollView, TouchableOpacity, View } from 'react-native'
import Modal, { type ModalType } from '@/components/common/Modal'
import Text from '@/components/common/Text'
import Badge from '@/components/common/Badge'
import Image from '@/components/common/Image'
import Input, { type InputType } from '@/components/common/Input'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useMusicExistsList, useMyList } from '@/store/list/hook'
import { createUserList } from '@/core/list'
import listState from '@/store/list/state'
import { LIST_IDS } from '@/config/constant'
import { BorderWidths } from '@/theme'
import { confirmDialog, createStyle } from '@/utils/tools'
import { getListExtraMeta, getListExtraMetaSync } from '@/utils/listMetaCache'

const PlaylistRow = memo(({ listInfo, musicInfo, isLast, onPress }: {
  listInfo: LX.List.MyListInfo
  musicInfo?: LX.Music.MusicInfo | null
  isLast: boolean
  onPress: (listInfo: LX.List.MyListInfo) => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  const isExists = useMusicExistsList(
    listInfo,
    musicInfo ?? ({ id: '' } as LX.Music.MusicInfo),
  )
  const alreadyAdded = Boolean(musicInfo && isExists)

  const onlineSource = 'source' in listInfo ? listInfo.source : undefined
  const sourceListId = 'sourceListId' in listInfo ? listInfo.sourceListId : undefined
  const isCollectedOnlineList = Boolean(onlineSource && sourceListId)

  const [coverUrl, setCoverUrl] = useState<string | undefined>(() => (
    isCollectedOnlineList ? getListExtraMetaSync(listInfo.id)?.img : undefined
  ))

  useEffect(() => {
    if (!isCollectedOnlineList) {
      setCoverUrl(undefined)
      return
    }
    let cancelled = false
    const syncImg = getListExtraMetaSync(listInfo.id)?.img
    if (syncImg) setCoverUrl(syncImg)
    void getListExtraMeta(listInfo.id).then((meta) => {
      if (!cancelled && meta?.img) setCoverUrl(meta.img)
    })
    return () => { cancelled = true }
  }, [isCollectedOnlineList, listInfo.id])

  const iconName = listInfo.id == LIST_IDS.LOVE
    ? 'love'
    : listInfo.id == LIST_IDS.DEFAULT
      ? 'play-outline'
      : 'album'

  const isEnglish = t('cancel') == 'Cancel'

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      disabled={alreadyAdded}
      onPress={() => { onPress(listInfo) }}
      style={{
        ...styles.row,
        borderBottomWidth: isLast ? 0 : BorderWidths.normal,
        borderBottomColor: theme['c-border-background'],
        opacity: alreadyAdded ? 0.52 : 1,
      }}
    >
      {isCollectedOnlineList && coverUrl ? (
        <View style={styles.coverThumbWrap}>
          <Image url={coverUrl} style={styles.coverThumb} />
        </View>
      ) : (
        <View style={{ ...styles.iconBadge, backgroundColor: theme['c-primary-input-background'] }}>
          <Icon name={iconName} size={16} color={theme['c-font-label']} />
        </View>
      )}
      <View style={styles.rowTitleWrap}>
        <Text size={15} color={theme['c-font']} numberOfLines={1} style={styles.rowTitle}>
          {listInfo.name}
        </Text>
        {onlineSource ? <Badge type="tertiary">{onlineSource.toUpperCase()}</Badge> : null}
      </View>
      {alreadyAdded ? (
        <View style={styles.addedTag}>
          <Icon name="checkbox-marked" size={14} color={theme['c-primary-font-active']} style={styles.addedIcon} />
          <Text size={12} color={theme['c-font-label']}>
            {isEnglish ? 'Added' : '已添加'}
          </Text>
        </View>
      ) : (
        <Icon name="chevron-right" size={14} color={theme['c-350']} />
      )}
    </TouchableOpacity>
  )
})

const CreateRow = memo(() => {
  const theme = useTheme()
  const t = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<InputType>(null)

  const handleOpenEdit = () => {
    setName('')
    setIsEditing(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const handleConfirm = async() => {
    const trimmed = name.trim()
    setIsEditing(false)
    setName('')
    if (!trimmed.length) return
    if (listState.userList.some(l => l.name == trimmed) && !(await confirmDialog({
      message: global.i18n.t('list_duplicate_tip'),
    }))) return
    void createUserList(listState.userList.length, [{ id: `userlist_${Date.now()}`, name: trimmed, locationUpdateTime: null }])
  }

  if (isEditing) {
    return (
      <View
        style={{
          ...styles.createEditRow,
          borderBottomColor: theme['c-border-background'],
          backgroundColor: theme['c-primary-input-background'],
        }}
      >
        <View style={styles.createInputWrap}>
          <Input
            ref={inputRef}
            placeholder={t('list_create_input_placeholder')}
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => { void handleConfirm() }}
            style={styles.createInput}
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => { void handleConfirm() }}
          style={{ ...styles.createActionBtn, backgroundColor: theme['c-primary'] }}
        >
          <Text size={12} color="#fff" style={styles.createConfirmText}>{t('confirm_button_text')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => { setIsEditing(false); setName('') }}
          style={styles.createCancelBtn}
        >
          <Text size={12} color={theme['c-font-label']}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={handleOpenEdit}
      style={{
        ...styles.createRow,
        borderBottomColor: theme['c-border-background'],
      }}
    >
      <View style={{ ...styles.iconBadge, backgroundColor: theme['c-primary-alpha-900'] }}>
        <Icon name="add_folder" size={16} color={theme['c-primary-font-active']} />
      </View>
      <Text size={15} color={theme['c-primary-font-active']} style={styles.createLabel}>
        {t('list_create')}
      </Text>
    </TouchableOpacity>
  )
})

export default ({
  modalRef,
  title,
  subtitle,
  excludeListId,
  musicInfo,
  onSelect,
  onHide,
}: {
  modalRef: React.RefObject<ModalType>
  title: string
  subtitle?: string
  excludeListId?: string
  musicInfo?: LX.Music.MusicInfo | null
  onSelect: (listInfo: LX.List.MyListInfo) => void
  onHide?: () => void
}) => {
  const theme = useTheme()
  const allList = useMyList()
  const visibleLists = excludeListId ? allList.filter(l => l.id != excludeListId) : allList

  const handleClose = () => {
    modalRef.current?.setVisible(false)
  }

  return (
    <Modal ref={modalRef} onHide={onHide} bgColor="rgba(0,0,0,0.36)">
      <View style={styles.backdrop} pointerEvents="box-none">
        <View
          style={{
            ...styles.sheet,
            backgroundColor: theme['c-content-background'],
          }}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.grabberWrap}>
            <View style={{ ...styles.grabber, backgroundColor: theme['c-font-label'] }} />
          </View>
          <View style={{ ...styles.header, borderBottomColor: theme['c-border-background'] }}>
            <View style={styles.headerTextWrap}>
              <Text size={16} color={theme['c-font']} style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text size={12} color={theme['c-font-label']} numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={theme['c-font-label']} />
            </TouchableOpacity>
          </View>

          <CreateRow />

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="always">
            <View style={styles.listBody}>
              {visibleLists.map((info, idx) => (
                <PlaylistRow
                  key={info.id}
                  listInfo={info}
                  musicInfo={musicInfo}
                  isLast={idx === visibleLists.length - 1}
                  onPress={onSelect}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = createStyle({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '72%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  grabberWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 10,
    borderBottomWidth: BorderWidths.normal,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: BorderWidths.normal,
  },
  createLabel: {
    fontWeight: '500',
  },
  createEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 14,
    borderBottomWidth: BorderWidths.normal,
    gap: 8,
  },
  createInputWrap: {
    flex: 1,
  },
  createInput: {
    height: 34,
    fontSize: 14,
  },
  createActionBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createConfirmText: {
    fontWeight: '500',
  },
  createCancelBtn: {
    height: 30,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: '100%',
  },
  listBody: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 16,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coverThumbWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  coverThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  rowTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  rowTitle: {
    flexShrink: 1,
  },
  addedTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addedIcon: {
    marginRight: 4,
  },
})
