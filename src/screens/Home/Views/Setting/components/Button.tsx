import { memo } from 'react'

import Button, { type BtnProps } from '@/components/common/Button'
import Text from '@/components/common/Text'
import { useTheme } from '@/store/theme/hook'
import { BorderWidths } from '@/theme'
import { createStyle } from '@/utils/tools'

type ButtonProps = BtnProps

export default memo(({ disabled, onPress, children }: ButtonProps) => {
  const theme = useTheme()

  return (
    <Button
      style={{
        ...styles.button,
        backgroundColor: theme['c-primary-alpha-900'],
        borderColor: theme['c-primary-alpha-600'],
        opacity: disabled ? 0.45 : 1,
      }}
      onPress={onPress}
      disabled={disabled}
    >
      <Text size={13} color={theme['c-primary-font-active']} style={styles.text}>{children}</Text>
    </Button>
  )
})

const styles = createStyle({
  button: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: BorderWidths.normal,
    marginRight: 8,
    marginBottom: 6,
  },
  text: {
    fontWeight: '500',
  },
})
