import { describe, expect, it } from 'vitest'
import { observeMappedConstraints } from './constraints'
import type { LdesEvidence, OverlapFact, SourceObservation } from '../types'

const fact = (overlapPct: number, intersectionAreaSqft = overlapPct * 100): OverlapFact => ({ overlapPct, intersectionAreaSqft })
function obs<T>(value: T | null, status: SourceObservation<T>['status'] = 'available'): SourceObservation<T> {
  return { status, value, sourceId: 'source', sourceUrl: 'https://example.org/map', sourceUpdatedAt: '2025-01-01',
    retrievedAt: '2026-09-27', joinMethod: 'polygon_clip', nAReason: status === 'unavailable' ? 'failed' : null }
}
function input(slope: SourceObservation<OverlapFact>): LdesEvidence {
  return { sources: { slope, landslide: obs(fact(0)), undermined: obs(fact(0)), fema: obs([]),
    historicDistrict: obs(fact(0)), historicSite: obs(fact(0)) } }
}
describe('mapped observations', () => {
  it('separates confirmed zero, confirmed no match and failed source', () => {
    expect(observeMappedConstraints(input(obs(fact(0)))).constraints[0].status).toBe('NOT_DETECTED')
    expect(observeMappedConstraints(input(obs<OverlapFact>(null, 'not_found'))).constraints[0].status).toBe('NOT_DETECTED')
    const failed = observeMappedConstraints(input(obs<OverlapFact>(null, 'unavailable')))
    expect(failed.constraints[0].status).toBe('UNKNOWN')
    expect(failed.constraints[0].overlapPct).toBeNull()
    expect(failed.gaps).toHaveLength(1)
  })
  it.each([2.208, 55])('keeps %s percent as a detected fact with unknown project impact', (pct) => {
    const result = observeMappedConstraints(input(obs(fact(pct))))
    expect(result.constraints[0]).toMatchObject({ status: 'DETECTED', overlapPct: pct, projectImpact: 'UNKNOWN' })
    expect(result.constraints[0].source?.sourceUrl).toBe('https://example.org/map')
    expect(result.constraints[0].source?.sourceUpdatedAt).toBe('2025-01-01')
  })
  it('retains a tiny sliver as uncertain without calling it detected', () => {
    expect(observeMappedConstraints(input(obs(fact(0.05, 5)))).constraints[0]).toMatchObject({
      status: 'NOT_DETECTED', overlapPct: 0.05, boundaryUncertain: true,
    })
  })
  it('keeps floodway distinct from ordinary flood areas', () => {
    const evidence = input(obs(fact(0)))
    evidence.sources!.fema = obs([{ category: 'SFHA', overlapPct: 3, intersectionAreaSqft: 30 },
      { category: 'FLOODWAY', overlapPct: 1, intersectionAreaSqft: 10 }])
    expect(observeMappedConstraints(evidence).constraints.find((item) => item.id === 'fema')).toMatchObject({
      status: 'DETECTED', category: 'FLOODWAY', projectImpact: 'UNKNOWN',
    })
  })
})
