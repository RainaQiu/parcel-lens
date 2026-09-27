import { describe, expect, it } from 'vitest'
import { ALL_ZONING_LABELS, ZONING_COLORS, ZONING_LEGEND, zoningCodesForLabels } from './zoning'

describe('zoningCodesForLabels', () => {
  it('returns every known zoning code when all legend groups are selected', () => {
    const codes = zoningCodesForLabels(ALL_ZONING_LABELS)
    expect(new Set(codes)).toEqual(new Set(Object.keys(ZONING_COLORS)))
  })

  it('returns only codes for the selected legend groups', () => {
    const park = ZONING_LEGEND.find((item) => item.label === 'Park')
    expect(park).toBeDefined()
    expect(zoningCodesForLabels(['Park'])).toEqual(park!.codes)
    expect(zoningCodesForLabels([])).toEqual([])
  })
})
