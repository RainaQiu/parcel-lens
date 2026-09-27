import { describe, expect, it } from 'vitest'
import { lookupHousingPathways, normalizeDistrictKey, splitZoning } from './housingPathways'
import { applyScenario } from './scenarios'
import { scoreEvidence } from './score'
import { defaultHousingPathwayRag } from './ldes/zoning'
import type { LdesLayerFacts, ParcelFeature } from './types'

const dummyParcel: ParcelFeature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  },
}

function row(district: string, useType: string) {
  return lookupHousingPathways([district]).find((item) => item.useType === useType)
}

function scoredDistrict(districts: string[], extra: LdesLayerFacts = {}) {
  const layers: LdesLayerFacts = {
    cityVerified: true,
    polygonVerified: true,
    parcelMatchCount: 1,
    districts,
    overlays: [],
    overlayPresent: false,
    overlayHandled: true,
    overlayDimensionsHandled: true,
    environmentalQueriesSuccessful: true,
    femaQueryStatus: 'OK',
    historicQueriesSuccessful: true,
    violationQueryStatus: 'OK',
    slopeOverlapPct: 0,
    landslideOverlapPct: 0,
    underminedOverlapPct: 0,
    floodCategory: 'NONE',
    historicDistrict: false,
    individualHistoricSite: false,
    activeViolation: false,
    activeCondemned: false,
    ...extra,
  }
  return scoreEvidence(applyScenario(layers, null, null, dummyParcel), { parcelId: 'test' })
}

describe('§911.02 housing pathways', () => {
  it('maps GIS density suffixes onto base district keys', () => {
    expect(normalizeDistrictKey('R1D-L')).toEqual({ kind: 'base', districtKey: 'R1D', raw: 'R1D-L' })
    expect(normalizeDistrictKey('RM-M')).toEqual({ kind: 'base', districtKey: 'RM', raw: 'RM-M' })
    expect(normalizeDistrictKey('RIV-RM')).toEqual({ kind: 'base', districtKey: 'RIV-RM', raw: 'RIV-RM' })
    expect(normalizeDistrictKey('UC-E')).toEqual({ kind: 'base', districtKey: 'UC-E', raw: 'UC-E' })
    expect(normalizeDistrictKey('NDO')).toEqual({ kind: 'base', districtKey: 'NDO', raw: 'NDO' })
    expect(normalizeDistrictKey('SP-10').kind).toBe('special')
  })

  it('keeps special planned districts out of the live use table', () => {
    const split = splitZoning(['SP-10'])
    expect(split.districtKeys).toEqual([])
    expect(split.overlays).toContain('SP-10')
    const sp = row('SP-10', 'multi_unit')
    expect(sp?.pathway).toBe('UNKNOWN')
    expect(sp?.rag).toBe('UNRATED')
    expect(sp?.reviewStatus).toBe('unverified')
  })

  it('unlocks verified base-district pathways for the five housing uses', () => {
    expect(row('R1D-L', 'single_unit_detached')).toMatchObject({ pathway: 'P', rag: 'GREEN', reviewStatus: 'verified' })
    expect(row('R2-M', 'two_unit')).toMatchObject({ pathway: 'P', rag: 'GREEN' })
    expect(row('RM-M', 'multi_unit')).toMatchObject({ pathway: 'P', rag: 'GREEN' })
    expect(row('UI', 'multi_unit')).toMatchObject({ pathway: 'S', rag: 'AMBER' })
    expect(row('UC-E', 'multi_unit')).toMatchObject({
      pathway: 'A',
      rag: 'AMBER',
      standards: expect.arrayContaining(['§911.04A.85']),
    })
    expect(row('R1D-L', 'two_unit')).toMatchObject({ pathway: 'NOT_PERMITTED', rag: 'RED' })
    expect(row('R1D-L', 'single_unit_attached')).toMatchObject({
      pathway: 'P_OR_S',
      rag: 'AMBER',
    })
    expect(row('R1D-L', 'single_unit_attached')?.standards.join(' ')).toMatch(/35 ft/)
    expect(row('R1D-L', 'single_unit_attached')?.notes).toMatch(/lot width/)
    expect(row('R1D-L', 'two_unit')?.notes).toMatch(/Not listed in §911.02/)
  })

  it('screens all five uses without treating one prohibited use as a parcel variance', () => {
    const unc = scoredDistrict(['UNC'])
    expect(unc.zoningRag).toBe('GREEN')
    expect(unc.developmentPotentialRag).toBe('UNRATED')
    expect(unc.easeScore).toBe('GREEN')
    expect(unc.housingPathways).toHaveLength(5)

    const r1d = scoredDistrict(['R1D-L'])
    expect(r1d.zoningRag).toBe('GREEN')
    expect(r1d.easeScore).toBe('GREEN')
    expect(r1d.criticalFlags).not.toContain('USE_VARIANCE_REQUIRED')
    expect(r1d.scenarioId).toBeNull()
    expect(r1d.scope).toBe('parcel_screening')
  })

  it('uses amber when no housing use is P but at least one has an extra review path', () => {
    const result = scoredDistrict(['UI'])
    expect(result.zoningRag).toBe('AMBER')
  })

  it('requires all five verified cells and rates five prohibited uses red', () => {
    const rows = lookupHousingPathways(['R1D-L']).map((item) => ({ ...item, pathway: 'NOT_PERMITTED' as const }))
    expect(defaultHousingPathwayRag(rows)).toBe('RED')
    expect(defaultHousingPathwayRag(rows.slice(1))).toBe('UNRATED')
    expect(defaultHousingPathwayRag([{ ...rows[0], reviewStatus: 'unverified' }, ...rows.slice(1)])).toBe('UNRATED')
  })

  it('keeps unresolved overlays unrated even when one base use is permitted', () => {
    const result = scoredDistrict(['R1D-L'], { overlays: ['NDO'] })
    expect(result.zoningRag).toBe('UNRATED')
  })

  it('does not synthesize a zoning chip color for split-zoned parcels', () => {
    const rows = lookupHousingPathways(['R1D-L', 'R2-M']).filter((item) => item.useType === 'two_unit')
    expect(rows).toHaveLength(2)
    expect(rows.map((item) => item.pathway).sort()).toEqual(['NOT_PERMITTED', 'P'])
    expect(new Set(rows.map((item) => item.rag)).size).toBe(2)
    const split = scoredDistrict(['R1D-L', 'R2-M'])
    expect(split.zoningRag).toBe('UNRATED')
    expect(split.criticalFlags).toContain('MULTIPLE_BASE_ZONING_DISTRICTS')
  })

  it('treats historic slivers as no intersection instead of unrating the parcel', () => {
    const scored = scoredDistrict(['UNC'], {
      historicDistrict: true,
      historicDistrictOverlap: { overlapPct: 0.05, intersectionAreaSqft: 5 },
    })
    expect(scored.historicConditionRag).toBe('GREEN')
    expect(scored.criticalFlags).not.toContain('UNRESOLVED_GEOMETRY_BOUNDARY')
    expect(scored.contextDrivers.some((item) => item.id === 'POSSIBLE_BOUNDARY_SLIVER')).toBe(true)
  })

  it('leaves development potential unrated after pathways are verified', () => {
    const scored = scoredDistrict(['R1D-L'])
    expect(scored.developmentPotentialRag).toBe('UNRATED')
    expect(scored.housingPathways).toHaveLength(5)
    expect(scored.missingRequired.some((item) => /setback|parking|coverage|height/i.test(item))).toBe(true)
  })
})
