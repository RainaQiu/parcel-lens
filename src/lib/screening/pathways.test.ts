import { describe, expect, it } from 'vitest'
import { summarizePathways } from './pathways'
import type { HousingPathwayRow, LdesEvidence, UsePathway } from '../types'

const uses = ['single_unit_detached', 'single_unit_attached', 'two_unit', 'three_unit', 'multi_unit'] as const
function evidence(paths: UsePathway[], overrides: Partial<LdesEvidence> = {}): LdesEvidence {
  const housingPathways = paths.map((pathway, index): HousingPathwayRow => ({
    useType: uses[index], useLabel: uses[index], rawDistrict: 'EMI', districtKey: 'EMI', pathway,
    rag: pathway === 'P' ? 'GREEN' : pathway === 'NOT_PERMITTED' ? 'RED' : 'AMBER', standards: [],
    sourceUrl: 'https://example.org/code', ruleVersion: 'use-table-v1', codeAsOf: '2026-01-01',
    verifiedAt: '2026-01-01', reviewStatus: 'verified', notes: '',
  }))
  return { cityVerified: true, polygonVerified: true, allZoningDistrictsVerified: true,
    overlayHandled: true, districts: ['EMI'], housingPathways, ...overrides }
}

describe('v3 housing pathway summary', () => {
  it('identifies one verified by-right listing in EMI without treating other rows as a combined RED', () => {
    const result = summarizePathways(evidence(['P', 'NOT_PERMITTED', 'NOT_PERMITTED', 'NOT_PERMITTED', 'A']))
    expect(result.status).toBe('BY_RIGHT_PATH_IDENTIFIED')
    expect(result.rows).toHaveLength(5)
    expect(result.rows[0].ruleVersion).toBe('use-table-v1')
  })
  it('distinguishes review-only and no-listed-path tables', () => {
    expect(summarizePathways(evidence(['A', 'S', 'C', 'P_OR_S', 'NOT_PERMITTED'])).status).toBe('REVIEW_PATH_ONLY')
    expect(summarizePathways(evidence(Array(5).fill('NOT_PERMITTED'))).status).toBe('NO_LISTED_PATH')
  })
  it.each([
    ['missing cell', { housingPathways: evidence(['P', 'A', 'S', 'C', 'NOT_PERMITTED']).housingPathways?.slice(0, 4) }],
    ['split district', { districts: ['EMI', 'RM-M'] }],
    ['overlay', { overlayPresent: true, overlayHandled: false }],
    ['point lookup', { allZoningDistrictsVerified: false }],
    ['city', { cityVerified: false }],
  ])('marks %s unknown with a named gap', (_name, override) => {
    const result = summarizePathways(evidence(['P', 'A', 'S', 'C', 'NOT_PERMITTED'], override as Partial<LdesEvidence>))
    expect(result.status).toBe('UNKNOWN')
    expect(result.gaps.length).toBeGreaterThan(0)
  })
})
