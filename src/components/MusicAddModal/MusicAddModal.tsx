import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { type ModalType } from '@/components/common/Modal'
import { toast } from '@/utils/tools'
import PlaylistPickerSheet from './PlaylistPickerSheet'
import { useI18n } from '@/lang'
import { addListMusics, moveListMusics } from '@/core/list'
import settingState from '@/store/setting/state'

export interface SelectInfo {
  musicInfo: LX.Music.MusicInfo | null
  listId: string
  isMove: boolean
}
const initSelectInfo: SelectInfo = { musicInfo: null, listId: '', isMove: false }

export interface MusicAddModalProps {
  onAdded?: () => void
}
export interface MusicAddModalType {
  show: (info: SelectInfo) => void
}

export default forwardRef<MusicAddModalType, MusicAddModalProps>(({ onAdded }, ref) => {
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
      setSelectInfo(prev => ({ ...prev, musicInfo: null }))
    })
  }

  const handleSelect = (listInfo: LX.List.MyListInfo) => {
    modalRef.current?.setVisible(false)
    if (!selectInfo.musicInfo) return
    if (selectInfo.isMove) {
      void moveListMusics(selectInfo.listId, listInfo.id,
        [selectInfo.musicInfo],
        settingState.setting['list.addMusicLocationType'],
      ).then(() => {
        onAdded?.()
        toast(t('list_edit_action_tip_move_success'))
      }).catch(() => {
        toast(t('list_edit_action_tip_move_failed'))
      })
    } else {
      void addListMusics(listInfo.id,
        [selectInfo.musicInfo],
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
  const subtitle = selectInfo.musicInfo
    ? `${selectInfo.musicInfo.name}${selectInfo.musicInfo.singer ? ` - ${selectInfo.musicInfo.singer}` : ''}`
    : ''

  return (
    <PlaylistPickerSheet
      modalRef={modalRef}
      title={title}
      subtitle={subtitle}
      excludeListId={selectInfo.isMove ? selectInfo.listId : undefined}
      musicInfo={selectInfo.musicInfo}
      onSelect={handleSelect}
      onHide={handleHide}
    />
  )
})
