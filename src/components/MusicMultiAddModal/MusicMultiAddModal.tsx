import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { type ModalType } from '@/components/common/Modal'
import { toast } from '@/utils/tools'
import PlaylistPickerSheet from '../MusicAddModal/PlaylistPickerSheet'
import { useI18n } from '@/lang'
import { addListMusics, moveListMusics } from '@/core/list'
import settingState from '@/store/setting/state'

export interface SelectInfo {
  selectedList: LX.Music.MusicInfo[]
  listId: string
  isMove: boolean
}
const initSelectInfo: SelectInfo = { selectedList: [], listId: '', isMove: false }

export interface MusicMultiAddModalProps {
  onAdded?: () => void
}
export interface MusicMultiAddModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<MusicMultiAddModalType, MusicMultiAddModalProps>(({ onAdded }, ref) => {
  const t = useI18n()
  const modalRef = useRef<ModalType>(null)
  const [selectInfo, setSelectInfo] = useState<SelectInfo>(initSelectInfo)

  useImperativeHandle(ref, () => ({
    show(info) {
      setSelectInfo(info)
      requestAnimationFrame(() => {
        modalRef.current?.setVisible(true)
      })
    },
  }))

  const handleHide = () => {
    requestAnimationFrame(() => {
      setSelectInfo(prev => ({ ...prev, selectedList: [] }))
    })
  }

  const handleSelect = (listInfo: LX.List.MyListInfo) => {
    modalRef.current?.setVisible(false)
    if (!selectInfo.selectedList.length) return
    if (selectInfo.isMove) {
      void moveListMusics(selectInfo.listId, listInfo.id,
        [...selectInfo.selectedList],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_move_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_move_failed'))
      })
    } else {
      void addListMusics(listInfo.id,
        [...selectInfo.selectedList],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_add_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_add_failed'))
      })
    }
  }

  const title = (selectInfo.isMove ? t('move_to') : t('add_to')).replace(/\.\.\.$/, '')
  const isEnglish = t('cancel') == 'Cancel'
  const subtitle = selectInfo.selectedList.length
    ? (isEnglish ? `${selectInfo.selectedList.length} tracks selected` : `已选 ${selectInfo.selectedList.length} 首歌曲`)
    : ''

  return (
    <PlaylistPickerSheet
      modalRef={modalRef}
      title={title}
      subtitle={subtitle}
      excludeListId={selectInfo.listId || undefined}
      onSelect={handleSelect}
      onHide={handleHide}
    />
  )
})
