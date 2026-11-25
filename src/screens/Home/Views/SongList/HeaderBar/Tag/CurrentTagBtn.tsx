import { forwardRef, useImperativeHandle, useState } from 'react'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'


export interface CurrentTagBtnProps {
  onShowList: () => void
}

export interface CurrentTagBtnType {
  setCurrentTagInfo: (name: string) => void
}

export default forwardRef<CurrentTagBtnType, CurrentTagBtnProps>(({ onShowList }, ref) => {
  const t = useI18n()
  const theme = useTheme()
  const [name, setName] = useState('')

  useImperativeHandle(ref, () => ({
    setCurrentTagInfo(name) {
      if (!name) name = t('songlist_tag_default')
      setName(name)
    },
  }))

  return (
    <Button
      style={{
        ...styles.btn,
        backgroundColor: theme['c-content-background'],
        borderColor: theme['c-border-background'],
      }}
      onPress={onShowList}
    >
      <Text size={13} numberOfLines={1} style={styles.tagText}>{name}</Text>
      <Text size={11} color={theme['c-font-label']} style={styles.dropdownTriangle}>▾</Text>
    </Button>
  )
})


const styles = createStyle({
  btn: {
    height: 28,
    paddingLeft: 10,
    paddingRight: 9,
    borderRadius: 14,
    borderWidth: BorderWidths.normal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    textAlign: 'center',
    maxWidth: 96,
  },
  dropdownTriangle: {
    marginLeft: 4,
    lineHeight: 14,
  },
})
