import { createStyle } from '@/utils/tools'
import { BorderWidths } from '@/theme'

export default createStyle({
  card: {
    borderRadius: 12,
    borderWidth: BorderWidths.normal,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  item: {
    paddingVertical: 11,
  },
  divider: {
    borderTopWidth: BorderWidths.normal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    lineHeight: 20,
  },
  sliderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -4,
  },
  valueText: {
    fontWeight: '500',
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 6,
  },
})
