import { describe, expect, it } from 'vitest'
import { buildScreeningFallback, screeningMeaning } from './copy'
import type { ScreeningScorecard } from './types'

const card = (screeningRag: ScreeningScorecard['screeningRag']): ScreeningScorecard => ({
  parcelId: '0052P00130000000', scoreVersion: 'LDES-v3-screening-scorecard', screeningRag,
  projectFeasibility: 'NOT_ASSESSED', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED', housingPathways: [],
  mappedConstraints: [], reviewTasks: [], evidenceGaps: [], unassessed: [], requiredSourceCoverage: {}, ruleVersions: [],
})
describe('bounded deterministic copy', () => {
  it('has distinct fixed meanings for all four results', () => {
    expect(new Set(['GREEN', 'AMBER', 'RED', 'UNRATED'].map((rag) => screeningMeaning(rag as ScreeningScorecard['screeningRag']))).size).toBe(4)
  })
  it('limits Red to the five checked housing uses', () => {
    const result = buildScreeningFallback({ ...card('RED'), pathwaySummary: 'NO_LISTED_PATH' })
    expect(result).toContain('five checked residential uses')
    expect(result).not.toMatch(/unbuildable|cannot develop/i)
  })
  it('keeps Amber map overlap distinct from project impact', () => {
    const result = buildScreeningFallback({ ...card('AMBER'), reviewTasks: [{ id: 'mapped-slope', trigger: '25%+ slope map overlaps the parcel.',
      whyItMatters: 'Project impact is unknown.', whoToConsult: 'Planner', sourceRefs: ['slope'], scoreEffect: 'triggered' }] })
    expect(result).toContain('. Project impact is unknown')
    expect(result).not.toMatch(/whole parcel affected|permit denied/i)
  })
  it('names missing evidence for Unrated', () => {
    expect(buildScreeningFallback({ ...card('UNRATED'), evidenceGaps: [{ id: 'fema', dimension: 'FEMA', reason: 'Source failed', sourceRefs: ['fema'] }] })).toContain('Source failed')
  })
})
