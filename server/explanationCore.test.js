import { describe, expect, it } from 'vitest'
import { createDailyBudget, createExplanation, validateExplanationInput } from './explanationCore.mjs'

const input = {
  pin: '0052P00130000000', scoreVersion: 'LDES-v3-screening-scorecard', ruleVersion: 'use-table-v1',
  screeningRag: 'AMBER', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED',
  fallbackSummary: 'AMBER preliminary screen. Project impact is unknown.',
  constraints: [{ id: 'slope', label: '25%+ steep slope', status: 'DETECTED', category: null, overlapPct: 2.208,
    intersectionAreaSqft: 220, boundaryUncertain: false, projectImpact: 'UNKNOWN', source: { sourceId: 'pgh-slope25', sourceUrl: 'https://example.org', retrievedAt: '2026-09-27', sourceUpdatedAt: null, joinMethod: 'polygon_clip' } }],
  reviewTasks: [{ id: 'mapped-slope', trigger: '25%+ steep slope map overlaps the parcel.', whyItMatters: 'Proposed footprint is unknown.',
    whoToConsult: 'Planning staff', sourceRefs: ['pgh-slope25'], scoreEffect: 'triggered' }], evidenceGaps: [],
}

describe('v3 explanation boundary', () => {
  it('accepts grounded task explanations and retains known IDs', async () => {
    const result = await createExplanation(input, async () => JSON.stringify({
      summary: 'The parcel has an AMBER preliminary screen because the steep slope map overlaps part of the parcel; project impact is unknown.',
      tasks: [{ id: 'mapped-slope', explanation: 'Check whether the proposed footprint touches that mapped area.' }], unknowns: [],
    }))
    expect(result.tasks[0].id).toBe('mapped-slope')
  })
  it('rejects invented numbers, approval claims, and task IDs', async () => {
    const output = (summary, id = 'mapped-slope') => JSON.stringify({ summary, tasks: [{ id, explanation: 'Check the mapped area.' }], unknowns: [] })
    await expect(createExplanation(input, async () => output('The site supports 80 units.'))).rejects.toThrow()
    await expect(createExplanation(input, async () => output('This project is guaranteed approval.'))).rejects.toThrow()
    await expect(createExplanation(input, async () => output('The mapped slope needs review.', 'invented'))).rejects.toThrow()
  })
  it('rejects malformed model output and invalid v3 input', async () => {
    await expect(createExplanation(input, async () => '{bad')).rejects.toThrow()
    expect(() => validateExplanationInput({ ...input, pin: 'bad' })).toThrow()
    expect(() => validateExplanationInput({ ...input, screeningRag: 'PURPLE' })).toThrow()
  })
  it('stops new provider calls after the daily budget', () => {
    const budget = createDailyBudget(1)
    expect(budget.take('2026-09-27')).toBe(true)
    expect(budget.take('2026-09-27')).toBe(false)
    expect(budget.take('2026-09-28')).toBe(true)
  })
})
