import { describe, expect, it } from 'vitest'
import { lookupHousingPathways } from '../housingPathways'
import cases from '../ldes/fixtures/verified-parcels.json'
import type { FloodHit, LdesEvidence, OverlapFact, SelectedParcel, SourceObservation } from '../types'
import { scoreScreeningParcel } from './scorecard'

const pin = '0052P00130000000'
const fact = (pct: number): OverlapFact => ({ overlapPct: pct, intersectionAreaSqft: pct * 100 })
const obs = <T,>(value: T | null, status: SourceObservation<T>['status'] = 'available'): SourceObservation<T> => ({
  status, value, sourceId: 'test-source', sourceUrl: 'https://example.org', sourceUpdatedAt: null,
  retrievedAt: '2026-09-27', joinMethod: 'polygon_clip', nAReason: status === 'unavailable' ? 'fetch failed' : null,
})
function evidence(slope = 2.208): LdesEvidence {
  return { cityVerified: true, polygonVerified: true, parcelMatchCount: 1, parcelGeometry: 'POLYGON',
    allZoningDistrictsVerified: true, overlayHandled: true, districts: ['EMI'], housingPathways: lookupHousingPathways(['EMI']),
    sources: { zoning: obs(['EMI']), slope: obs(fact(slope)), landslide: obs(fact(0)), undermined: obs(fact(0)),
      fema: obs([]), historicDistrict: obs(fact(0)), historicSite: obs(fact(0)),
      violations: obs<number>(null, 'not_found'), condemned: obs<number>(null, 'not_found') } }
}
function selected(parcelId = pin, ldes = evidence()): SelectedParcel {
  return { feature: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[-80, 40], [-79.9, 40], [-79.9, 40.1], [-80, 40]]] },
    properties: { PIN: parcelId, MUNICODE: 101 } }, assessment: { PARID: parcelId, PROPERTYADDRESS: 'FORBES AVE', PROPERTYHOUSENUM: 5000, MUNICODE: 101 }, zoning: null, ldes }
}
describe('v3 parcel scorecard', () => {
  it('keeps the documented CMU EMI parcel Green for a sub-10% mapped slope, with project impact unknown', () => {
    const result = scoreScreeningParcel(selected())
    expect(result.parcelId).toBe(pin)
    expect(result.pathwaySummary).toBe('BY_RIGHT_PATH_IDENTIFIED')
    expect(result.housingPathways.map((row) => row.pathway)).toEqual(['P', 'NOT_PERMITTED', 'NOT_PERMITTED', 'NOT_PERMITTED', 'A'])
    expect(result.mappedConstraints.find((item) => item.id === 'slope')).toMatchObject({ status: 'DETECTED', overlapPct: 2.208, projectImpact: 'UNKNOWN' })
    expect(result.screeningRag).toBe('GREEN')
    expect(result.projectFeasibility).toBe('NOT_ASSESSED')
  })
  it('uses Amber for 10% to under 50% slope overlap', () => {
    expect(scoreScreeningParcel(selected(pin, evidence(10))).screeningRag).toBe('AMBER')
    expect(scoreScreeningParcel(selected(pin, evidence(49.999))).screeningRag).toBe('AMBER')
  })
  it('uses Red at 50% slope overlap when required evidence is complete', () => {
    expect(scoreScreeningParcel(selected(pin, evidence(50))).screeningRag).toBe('RED')
    expect(scoreScreeningParcel(selected(pin, evidence(55))).screeningRag).toBe('RED')
  })
  it('uses the same 10% and 50% boundaries for landslide overlap', () => {
    const below = evidence(0)
    below.sources!.landslide = obs(fact(9.999))
    expect(scoreScreeningParcel(selected(pin, below)).screeningRag).toBe('GREEN')
    const amber = evidence(0)
    amber.sources!.landslide = obs(fact(10))
    expect(scoreScreeningParcel(selected(pin, amber)).screeningRag).toBe('AMBER')
    const red = evidence(0)
    red.sources!.landslide = obs(fact(50))
    expect(scoreScreeningParcel(selected(pin, red)).screeningRag).toBe('RED')
  })
  it('keeps any effective undermined overlap Amber', () => {
    const data = evidence(0)
    data.sources!.undermined = obs(fact(0.101))
    expect(scoreScreeningParcel(selected(pin, data)).screeningRag).toBe('AMBER')
  })
  it('does not promote a tiny historic boundary hit to Amber', () => {
    const small = evidence(0)
    small.sources!.historicDistrict = obs({ overlapPct: 0.5, intersectionAreaSqft: 50 })
    expect(scoreScreeningParcel(selected(pin, small)).screeningRag).toBe('GREEN')
    const meaningful = evidence(0)
    meaningful.sources!.historicDistrict = obs({ overlapPct: 1, intersectionAreaSqft: 50 })
    expect(scoreScreeningParcel(selected(pin, meaningful)).screeningRag).toBe('AMBER')
  })
  it('grades FEMA 0.2%, SFHA and floodway separately', () => {
    const pct02 = evidence(0)
    pct02.sources!.fema = obs([{ category: 'PCT_0_2', overlapPct: 9.999, intersectionAreaSqft: 1000 }])
    expect(scoreScreeningParcel(selected(pin, pct02)).screeningRag).toBe('GREEN')
    const sfha = evidence(0)
    sfha.sources!.fema = obs([{ category: 'SFHA', overlapPct: 10, intersectionAreaSqft: 1000 }])
    expect(scoreScreeningParcel(selected(pin, sfha)).screeningRag).toBe('AMBER')
    const floodway = evidence(0)
    floodway.sources!.fema = obs([{ category: 'FLOODWAY', overlapPct: 1, intersectionAreaSqft: 100 }])
    expect(scoreScreeningParcel(selected(pin, floodway)).screeningRag).toBe('RED')
  })
  it('keeps separate PINs independent even with the same address', () => {
    const first = scoreScreeningParcel(selected(pin, evidence(2.208)))
    const second = scoreScreeningParcel(selected('0052P00140000000', evidence(0)))
    expect(second.parcelId).not.toBe(first.parcelId)
    expect(second.screeningRag).toBe('GREEN')
  })
  it('retains successful facts when FEMA fails and marks the listed-path result Unrated', () => {
    const data = evidence()
    data.sources!.fema = obs<FloodHit[]>(null, 'unavailable')
    const result = scoreScreeningParcel(selected(pin, data))
    expect(result.screeningRag).toBe('UNRATED')
    expect(result.mappedConstraints.find((item) => item.id === 'slope')?.status).toBe('DETECTED')
    expect(result.evidenceGaps.some((gap) => gap.id === 'fema-source')).toBe(true)
  })
  it('does not infer by-right from point lookup or split zoning', () => {
    const point = evidence(0)
    point.allZoningDistrictsVerified = false
    expect(scoreScreeningParcel(selected(pin, point)).screeningRag).toBe('UNRATED')
    const split = evidence(0)
    split.districts = ['EMI', 'RM-M']
    expect(scoreScreeningParcel(selected(pin, split)).screeningRag).toBe('UNRATED')
  })
  it('returns the same grade and facts for identical inputs', () => {
    expect(scoreScreeningParcel(selected())).toEqual(scoreScreeningParcel(selected()))
  })
  it.each(cases)('reinterprets observed geospatial facts for $pin under v3 with other required sources confirmed', (item) => {
    const data = evidence(item.slopePct)
    data.districts = item.districts
    data.housingPathways = item.districts.flatMap((district) => lookupHousingPathways([district]))
    data.sources!.landslide = obs(fact(item.landslidePct))
    data.sources!.undermined = obs(fact(item.underminedPct))
    const result = scoreScreeningParcel(selected(item.pin, data))
    const expected = item.districts.length > 1 ? 'UNRATED'
      : item.slopePct >= 50 || item.landslidePct >= 50 ? 'RED'
        : item.slopePct >= 10 || item.landslidePct >= 10 || item.underminedPct ? 'AMBER' : 'GREEN'
    expect(result.screeningRag).toBe(expected)
  })
  it('does not quietly turn an uncertain floodway sliver into Green', () => {
    const data = evidence(0)
    data.sources!.fema = obs([{ category: 'FLOODWAY', overlapPct: 0.05, intersectionAreaSqft: 5 }])
    const result = scoreScreeningParcel(selected(pin, data))
    expect(result.mappedConstraints.find((item) => item.id === 'fema')).toMatchObject({ status: 'UNKNOWN', boundaryUncertain: true, category: 'FLOODWAY' })
    expect(result.screeningRag).toBe('UNRATED')
    expect(result.evidenceGaps.map((gap) => gap.id)).toContain('fema-boundary')
    expect(result.evidenceGaps.map((gap) => gap.id)).not.toContain('fema-source')
  })
})
