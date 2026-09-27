import { describe, expect, it } from 'vitest'
import { buildFallbackSummary, humanizeMissing } from './reportView'
import { makeParcelReport } from './reportView'
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

describe('v3 report model', () => {
  it('binds scorecard identity to selected parcel PIN', () => {
    const parcel = { feature: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-80, 40], [-79.9, 40], [-79.9, 40.1], [-80, 40]]] }, properties: { PIN: '0052P00130000000' } }, assessment: null, zoning: null }
    const report = makeParcelReport(parcel as never)
    expect(report.pin).toBe('0052P00130000000')
    expect(report.scorecard.parcelId).toBe(report.pin)
    expect(report.scorecard.scoreVersion).toBe('LDES-v3-screening-scorecard')
    expect('score' in report).toBe(false)
  })
})
