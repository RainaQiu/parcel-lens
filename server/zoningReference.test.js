import { describe, expect, it } from 'vitest'
import { classifyParcelChatIntent, lookupZoningReference, parseZoningCode } from './zoningReference.mjs'

const context = {
  address: '5000 FORBES AVE',
  mappedConstraints: [],
  housingPathways: [],
  projectBrief: { housingType: 'unknown' },
}

const request = (question, overrides = {}) => ({
  messages: [{ role: 'user', content: question }],
  reportFacts: context,
  projectBrief: context.projectBrief,
  ...overrides,
})

describe('official Pittsburgh zoning reference', () => {
  it('parses a compound zoning code case-insensitively', () => {
    expect(parseZoningCode('r1d-vl')).toEqual({ baseCode: 'R1D', densityCode: 'VL', raw: 'R1D-VL' })
  })

  it('answers what R1D-VL means with official components and citations', () => {
    const result = lookupZoningReference('What does R1D-VL zoning mean?', context)
    expect(result).toMatchObject({ code: 'R1D-VL', answer: expect.stringContaining('Single-Unit Detached Residential') })
    expect(result.answer).toContain('Very Low-Density')
    expect(result.citations.map((citation) => citation.sourceId)).toEqual(expect.arrayContaining(['pittsburgh-chapter-902', 'pittsburgh-chapter-903']))
    expect(result.citations.every((citation) => citation.kind === 'official')).toBe(true)
  })

  it('answers a base district question without inventing a density suffix', () => {
    const result = lookupZoningReference('What is R1D?', context)
    expect(result).toMatchObject({ code: 'R1D' })
    expect(result.answer).toContain('Single-Unit Detached Residential')
  })

  it('keeps density wording neutral for non-detached districts', () => {
    const result = lookupZoningReference('What does R2-VL mean?', context)
    expect(result.answer).toContain('Two-Unit Residential')
    expect(result.answer).toContain('Very Low-Density')
    expect(result.answer).not.toContain('detached-residential')
  })

  it('returns null for an unknown code', () => {
    expect(lookupZoningReference('What does ZX9-Q mean?', context)).toBeNull()
  })

  it('distinguishes general definitions from parcel suitability questions', () => {
    const reference = lookupZoningReference('What does EMI mean?', context)
    expect(classifyParcelChatIntent(request('What does EMI mean?'), reference)).toBe('zoning_reference')
    expect(classifyParcelChatIntent(request('Is this parcel suitable for a school?'), null)).toBe('unsupported_suitability')
  })

  it('classifies report facts, scenarios, and current external questions', () => {
    expect(classifyParcelChatIntent(request('Why is this parcel Amber?'), null)).toBe('parcel_fact')
    expect(classifyParcelChatIntent(request('Could I build a 20-unit apartment here?'), null)).toBe('project_scenario')
    expect(classifyParcelChatIntent(request('What are the current city setback rules this year?'), null)).toBe('current_external')
  })
})
