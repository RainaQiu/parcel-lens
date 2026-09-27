import { describe, expect, it } from 'vitest'
import { createDailyBudget, createExplanation, validateExplanationInput } from './explanationCore.mjs'

const input = {
  pin: '0011M00146000000', scoreVersion: 'LDES-v2.3-parcel-screen', ruleVersion: '2.3',
  overallResult: 'MAJOR_CONSTRAINTS', fallbackSummary: 'Flood overlap is a screening constraint.',
  drivers: [{ id: 'flood', title: 'Flood hazard', detail: 'The parcel overlaps a mapped flood area.', nextStep: 'Verify with FEMA.', source: { name: 'FEMA', field: 'floodCategory', value: 'AE', url: 'https://hazards.fema.gov/example' } }],
  missingRequired: ['project setbacks'],
}

describe('server explanation boundary', () => {
  it('accepts a short grounded explanation and retains only known driver IDs', async () => {
    const result = await createExplanation(input, async () => JSON.stringify({ summary: 'The mapped flood area is the leading screening constraint.', drivers: [{ id: 'flood', explanation: 'Flood mapping may require a closer site review.', nextStep: 'Verify with FEMA.' }], unknowns: ['project setbacks'] }))
    expect(result.drivers[0].id).toBe('flood')
    expect(result.unknowns).toEqual(['project setbacks'])
  })

  it('rejects invented evidence and new numeric claims', async () => {
    await expect(createExplanation(input, async () => JSON.stringify({ summary: 'The parcel can hold 80 homes.', drivers: [{ id: 'invented', explanation: 'Guaranteed approval', nextStep: 'Build now' }], unknowns: [] }))).rejects.toThrow()
  })

  it('rejects malformed input before sending it to a model', () => {
    expect(() => validateExplanationInput({ ...input, pin: 'bad' })).toThrow()
    expect(() => validateExplanationInput({ ...input, ownerName: 'private' })).not.toThrow()
  })

  it('stops new provider calls after the daily request budget', () => {
    const budget = createDailyBudget(1)
    expect(budget.take('2026-09-27')).toBe(true)
    expect(budget.take('2026-09-27')).toBe(false)
    expect(budget.take('2026-09-28')).toBe(true)
  })
})
