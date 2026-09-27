import { describe, expect, it } from 'vitest'
import { comparisonRows, screeningPresentation } from './presentation'
import type { ParcelReport } from '../reportView'
import type { ScreeningScorecard } from './types'

function card(rag: ScreeningScorecard['screeningRag']): ScreeningScorecard {
  return { parcelId: '0052P00130000000', scoreVersion: 'LDES-v3-screening-scorecard', screeningRag: rag,
    projectFeasibility: 'NOT_ASSESSED', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED', housingPathways: [], mappedConstraints: [],
    reviewTasks: [], evidenceGaps: [], unassessed: ['Land control'], requiredSourceCoverage: { fema: true }, ruleVersions: ['v1'] }
}
const report = (pin: string, scorecard: ScreeningScorecard) => ({ pin, address: pin, scorecard, selected: { ldes: {} } }) as unknown as ParcelReport
describe('shared scorecard presentation', () => {
  it('gives distinct Amber/Green language and labels Unrated as evidence incomplete', () => {
    expect(screeningPresentation(card('AMBER')).gradeText).not.toBe(screeningPresentation(card('GREEN')).gradeText)
    expect(screeningPresentation(card('UNRATED')).gradeText).toContain('Evidence incomplete')
  })
  it('exposes the top task and source for a detected map constraint', () => {
    const value = screeningPresentation({ ...card('AMBER'), reviewTasks: [{ id: 'slope', trigger: 'Slope mapped', whyItMatters: 'Check location', whoToConsult: 'Planner', sourceRefs: ['pgh-slope25'], scoreEffect: 'triggered' }] })
    expect(value.topTask?.trigger).toBe('Slope mapped')
    expect(value.topTask?.sourceRefs).toContain('pgh-slope25')
  })
  it('prioritizes the missing source for Unrated and planning alternatives for Red', () => {
    const unrated = screeningPresentation({ ...card('UNRATED'), reviewTasks: [{ id: 'slope', trigger: 'Slope mapped', whyItMatters: 'Check', whoToConsult: 'Planner', sourceRefs: ['slope'], scoreEffect: 'triggered' }],
      evidenceGaps: [{ id: 'fema', dimension: 'FEMA', reason: 'FEMA query failed', sourceRefs: ['fema'] }] })
    expect(unrated.firstAction).toContain('FEMA query failed')
    expect(screeningPresentation({ ...card('RED'), pathwaySummary: 'NO_LISTED_PATH' }).firstAction).toContain('planning staff')
  })
  it('keeps supplied parcel order and warns about different rule or source coverage', () => {
    const amber = report('A', card('AMBER'))
    const green = report('B', { ...card('GREEN'), requiredSourceCoverage: { fema: false } })
    const result = comparisonRows([amber, green])
    expect(result.reports.map((item) => item.pin)).toEqual(['A', 'B'])
    expect(result.warning).toContain('coverage')
    expect(result.rows.map((row) => row.label)).not.toContain('Data retrieved')
    expect(comparisonRows([amber, report('B', { ...card('GREEN'), ruleVersions: ['v2'] })]).warning).toContain('rule')
  })
})
