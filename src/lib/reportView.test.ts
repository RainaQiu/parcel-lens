import { describe, expect, it } from 'vitest'
import { buildFallbackSummary, humanizeMissing } from './reportView'
import type { ParcelScore } from './types'

describe('source-based summary', () => {
  it('leads with the main constraint and a next check without a long raw-data dump', () => {
    const score = { easeScore: 'RED', drivers: [{ title: 'Mapped flood area', nextStep: 'Check the FEMA map.' }], missingRequired: [] } as unknown as ParcelScore
    expect(buildFallbackSummary(score)).toBe('RED parcel screening. Main constraint: Mapped flood area. Next check: Check the FEMA map.')
  })
  it('names evidence gaps when a result is unrated', () => {
    const score = { easeScore: 'UNRATED', drivers: [], missingRequired: ['verified parcel polygon'] } as unknown as ParcelScore
    expect(buildFallbackSummary(score)).toContain('verified parcel polygon')
  })
  it('turns scoring input codes into readable missing-data labels', () => {
    expect(humanizeMissing('HEIGHT_FAR')).toBe('Building height and floor-area ratio rules')
    expect(humanizeMissing('verified parcel polygon')).toBe('verified parcel polygon')
  })
})
