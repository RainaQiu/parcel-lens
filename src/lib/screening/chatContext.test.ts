import { describe, expect, it } from 'vitest'
import { buildParcelChatContext, checkProjectConcept, mergeProjectBrief, type ProjectBrief } from './chatContext'
import type { HousingPathwayRow } from '../types'
import type { ScreeningScorecard } from './types'
import type { ParcelReport } from '../reportView'

const brief = (overrides: Partial<ProjectBrief> = {}): ProjectBrief => ({
  housingType: 'unknown', unitCount: null, stories: null, proposedFootprintSqft: null,
  landControl: 'unknown', costAssumptionsProvided: false, ...overrides,
})

function row(useType: HousingPathwayRow['useType'], pathway: HousingPathwayRow['pathway']): HousingPathwayRow {
  return { useType, useLabel: useType, rawDistrict: 'RM-H', districtKey: 'RM-H', pathway, rag: pathway === 'P' ? 'GREEN' : 'AMBER',
    standards: [], sourceUrl: 'https://example.test/code', ruleVersion: 'use-table-v1', codeAsOf: null,
    verifiedAt: '2026-09-27', reviewStatus: 'verified', notes: '' }
}

function scorecard(rows: HousingPathwayRow[]): ScreeningScorecard {
  return { parcelId: '0052P00130000000', scoreVersion: 'LDES-v3-screening-scorecard', screeningRag: 'AMBER',
    projectFeasibility: 'NOT_ASSESSED', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED', housingPathways: rows,
    mappedConstraints: [], reviewTasks: [], evidenceGaps: [], unassessed: ['Financial feasibility'],
    requiredSourceCoverage: { slope: true }, ruleVersions: ['use-table-v1'] }
}

function report(card: ScreeningScorecard): ParcelReport {
  return { pin: '0052P00130000000', address: '5000 FORBES AVE', scorecard: card, fallbackSummary: 'Amber summary',
    selected: { feature: { type: 'Feature', properties: { PIN: '0052P00130000000' }, geometry: { type: 'Polygon', coordinates: [] } },
      assessment: { PARID: '0052P00130000000', OWNERDESC: 'PRIVATE OWNER', CHANGENOTICEADDRESS1: 'PRIVATE MAILING ADDRESS', LOTAREA: 10000 },
      zoning: { code: 'RM-H', description: 'Residential', definitionUrl: 'https://example.test/zoning', updatedAt: null },
      ldes: { districts: ['RM-H'], retrievedAt: '2026-09-27T12:00:00Z' } } }
}

describe('parcel chat context', () => {
  it('builds an allowlisted context without owner or mailing fields', () => {
    const context = buildParcelChatContext(report(scorecard([row('multi_unit', 'P')])), brief())
    expect(context.pin).toBe('0052P00130000000')
    expect(context.assessor).toMatchObject({ lotArea: 10000, propertyClass: null, salePrice: null })
    expect(JSON.stringify(context)).not.toContain('PRIVATE OWNER')
    expect(JSON.stringify(context)).not.toContain('PRIVATE MAILING ADDRESS')
  })

  it('matches each supported housing type to its verified pathway', () => {
    const card = scorecard([row('single_unit_detached', 'P'), row('single_unit_attached', 'A'), row('two_unit', 'S'), row('three_unit', 'C'), row('multi_unit', 'NOT_PERMITTED')])
    expect(checkProjectConcept(card, brief({ housingType: 'single_detached' }))).toMatchObject({ status: 'MATCH_FOUND', pathway: 'P' })
    expect(checkProjectConcept(card, brief({ housingType: 'single_attached' })).status).toBe('REVIEW_PATH')
    expect(checkProjectConcept(card, brief({ housingType: 'multi_unit' })).status).toBe('NO_LISTED_PATH')
  })

  it('does not infer housing form from unit count alone', () => {
    const result = checkProjectConcept(scorecard([row('multi_unit', 'P')]), brief({ unitCount: 20 }))
    expect(result.status).toBe('INSUFFICIENT_DATA')
    expect(result.missingInputs).toContain('housingType')
  })

  it('marks unsupported non-residential uses out of scope', () => {
    const result = checkProjectConcept(scorecard([row('multi_unit', 'P')]), brief({ housingType: 'school' as ProjectBrief['housingType'] }))
    expect(result.status).toBe('OUT_OF_SCOPE')
  })

  it('keeps incomplete pathway evidence as insufficient data', () => {
    const card = { ...scorecard([row('multi_unit', 'P')]), pathwaySummary: 'UNKNOWN' as const }
    expect(checkProjectConcept(card, brief({ housingType: 'multi_unit' })).status).toBe('INSUFFICIENT_DATA')
  })

  it('merges only valid project brief patches', () => {
    expect(mergeProjectBrief(brief({ unitCount: 4 }), { unitCount: 20, stories: 4, landControl: 'optioned' })).toEqual(
      brief({ unitCount: 20, stories: 4, landControl: 'optioned' }),
    )
    expect(mergeProjectBrief(brief(), { unitCount: -2, stories: 0, housingType: 'school' as ProjectBrief['housingType'] })).toEqual(brief())
  })
})
