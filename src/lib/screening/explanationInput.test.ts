import { describe, expect, it } from 'vitest'
import { buildExplanationInput } from './explanationInput'
import type { ParcelReport } from '../reportView'

describe('v3 explanation request', () => {
  it('sends only the current scorecard and deterministic fallback', () => {
    const report = { pin: '0052P00130000000', fallbackSummary: 'Amber preliminary screen.',
      scorecard: { scoreVersion: 'LDES-v3-screening-scorecard', screeningRag: 'AMBER', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED',
        ruleVersions: ['v1'], mappedConstraints: [{ id: 'slope' }], reviewTasks: [{ id: 'mapped-slope' }], evidenceGaps: [] },
      score: { easeScore: 'RED' } } as unknown as ParcelReport
    expect(buildExplanationInput(report)).toMatchObject({ screeningRag: 'AMBER', reviewTasks: [{ id: 'mapped-slope' }] })
    expect(JSON.stringify(buildExplanationInput(report))).not.toContain('easeScore')
  })
})
