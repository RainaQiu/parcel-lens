import { describe, expect, it } from 'vitest'
import cases from './fixtures/verified-parcels.json'
import { applyScenario } from '../scenarios'
import { scoreEvidence } from '../score'
import type { LdesLayerFacts, ParcelFeature, Rag } from '../types'

const feature: ParcelFeature = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }

function score(input: LdesLayerFacts) {
  return scoreEvidence(applyScenario(input, null, null, feature), { assessedAt: '2026-09-27T00:00:00Z' })
}

function layers(item: typeof cases[number]): LdesLayerFacts {
  return {
    cityVerified: true, polygonVerified: true, parcelMatchCount: 1,
    allZoningDistrictsVerified: true, districts: item.districts, overlays: [],
    environmentalQueriesSuccessful: true, femaQueryStatus: 'OK', historicQueriesSuccessful: true, violationQueryStatus: 'OK',
    slopeOverlapPct: item.slopePct, landslideOverlapPct: item.landslidePct, underminedOverlapPct: item.underminedPct,
    floodCategory: 'NONE', historicDistrict: false, individualHistoricSite: false, activeViolation: false, activeCondemned: false,
  }
}

describe('observed real parcel regression cases', () => {
  for (const item of cases) {
    it(`${item.pin} retains its scoped screening result`, () => {
      const result = score(layers(item))
      expect(result.zoningRag).toBe(item.expectedZoning)
      expect(result.environmentalGeotechnicalRag).toBe(item.expectedEnvironment)
      expect(result.easeScore).toBe(item.expectedHeadline)
      expect(result.developmentPotentialRag).toBe('UNRATED')
      expect(result.housingPathways).toHaveLength(item.districts.length * 5)
    })
  }

  it('missing a critical environmental source un-rates the result', () => {
    const result = score({ ...layers(cases[0]), environmentalQueriesSuccessful: false })
    expect(result.environmentalGeotechnicalRag).toBe('UNRATED')
    expect(result.easeScore).toBe('UNRATED')
  })

  it('adding a confirmed geotechnical obstacle cannot improve the rating', () => {
    const base = layers(cases[0])
    const rank: Record<Rag, number> = { GREEN: 0, AMBER: 1, RED: 2, UNRATED: 3 }
    expect(rank[score({ ...base, slopeOverlapPct: 75 }).easeScore]).toBeGreaterThanOrEqual(rank[score(base).easeScore])
  })

  it('never infers a four-unit target when no project scenario was selected', () => {
    const evidence = applyScenario(layers(cases[0]), null, null, feature)
    evidence.potential = { criticalInputsComplete: true, capacityLowerBound: 2, capacityUpperBound: 6, presentInputs: ['SETBACKS', 'COVERAGE', 'HEIGHT_FAR', 'PARKING', 'OPEN_SPACE', 'OVERLAY_DIMENSIONS', 'ACCESS'] }
    expect(scoreEvidence(evidence).developmentPotentialRag).toBe('UNRATED')
  })
})
