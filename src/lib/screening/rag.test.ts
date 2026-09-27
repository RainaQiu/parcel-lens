import { describe, expect, it } from 'vitest'
import { combineScreeningRag } from './rag'
import type { PathwaySummary, ReviewTask } from './types'

const task: ReviewTask = { id: 'slope', trigger: 'Slope mapped', whyItMatters: 'Check footprint', whoToConsult: 'Planner', sourceRefs: ['slope'], scoreEffect: 'triggered' }
const input = (pathway: PathwaySummary, requiredSourcesComplete = true, tasks: ReviewTask[] = []) => ({ identityVerified: true, pathway, requiredSourcesComplete, tasks })
describe('combined preliminary RAG precedence', () => {
  it('does not grade unverified identity or zoning', () => {
    expect(combineScreeningRag({ ...input('BY_RIGHT_PATH_IDENTIFIED'), identityVerified: false })).toBe('UNRATED')
    expect(combineScreeningRag(input('UNKNOWN'))).toBe('UNRATED')
  })
  it('marks a complete five-use no-path table Red even if another source failed', () => {
    expect(combineScreeningRag(input('NO_LISTED_PATH', false))).toBe('RED')
  })
  it('marks missing required source Unrated when a use path exists', () => {
    expect(combineScreeningRag(input('BY_RIGHT_PATH_IDENTIFIED', false, [task]))).toBe('UNRATED')
  })
  it('uses Amber for discretionary paths or verified review tasks, regardless of overlap size', () => {
    expect(combineScreeningRag(input('REVIEW_PATH_ONLY'))).toBe('AMBER')
    expect(combineScreeningRag(input('BY_RIGHT_PATH_IDENTIFIED', true, [task]))).toBe('AMBER')
  })
  it('stays Green with routine due diligence only', () => {
    expect(combineScreeningRag(input('BY_RIGHT_PATH_IDENTIFIED', true, [{ ...task, scoreEffect: 'routine' }]))).toBe('GREEN')
  })
})
