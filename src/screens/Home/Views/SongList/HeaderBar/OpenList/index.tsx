import { useRef, forwardRef, useImperativeHandle } from 'react'
import { Icon } from '@/components/common/Icon'
import Button from '@/components/common/Button'
import Modal, { type ModalType } from './Modal'
import { type Source } from '@/store/songlist/state'
import { createStyle } from '@/utils/tools'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { navigations } from '@/navigation'
import commonState from '@/store/common/state'

export interface OpenListType {
  setInfo: (source: Source) => void
}

export default forwardRef<OpenListType, {}>((props, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const modalRef = useRef<ModalType>(null)
  const songlistInfoRef = useRef<{ source: Source }>({ source: 'kw' })

  useImperativeHandle(ref, () => ({
    setInfo(source) {
      songlistInfoRef.current.source = source
    },
  }))

  const handleOpenSonglist = (id: string) => {
    navigations.pushSonglistDetailScreen(commonState.componentIds.home!, {
      play_count: undefined,
      id,
      author: '',
      name: '',
      img: undefined,
      desc: undefined,
      source: songlistInfoRef.current.source,
    })
  }

  return (
    <>
      <Button
        style={{
          ...styles.button,
          backgroundColor: theme['c-content-background'],
          borderColor: theme['c-border-background'],
        }}
        onPress={() => modalRef.current?.show(songlistInfoRef.current.source)}
      >
        <Icon name="share" size={13} color={theme['c-font-label']} style={styles.icon} />
        <Text size={13} color={theme['c-font']}>{t('songlist_open')}</Text>
      </Button>
      <Modal ref={modalRef} onOpenId={handleOpenSonglist} />
    </>
  )
})

const styles = createStyle({
  button: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 10,
    paddingRight: 11,
    borderRadius: 15,
    borderWidth: BorderWidths.normal,
  },
  icon: {
    marginRight: 4,
  },
})
