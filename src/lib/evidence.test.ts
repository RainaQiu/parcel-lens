import { describe, expect, it } from 'vitest'
import { observeQuery, sourceObservation } from './evidence'

describe('source observations', () => {
  const source = { sourceId: 'slope', sourceUrl: 'https://example.org/layer', sourceUpdatedAt: null, joinMethod: 'polygon_clip' as const }

  it('records a successful query with no intersection as available and zero overlap', () => {
    const result = sourceObservation(source, { overlapPct: 0, intersectionAreaSqft: 0 }, '2026-09-27T00:00:00Z')
    expect(result).toMatchObject({ status: 'available', value: { overlapPct: 0 }, sourceUpdatedAt: null })
  })

  it('records a failed query as unavailable without inventing a zero', async () => {
    const result = await observeQuery(Promise.reject(new Error('timeout')), source, '2026-09-27T00:00:00Z')
    expect(result).toMatchObject({ status: 'unavailable', value: null, nAReason: 'timeout', sourceUpdatedAt: null })
  })

  it('distinguishes an empty record lookup from a failed request', async () => {
    const result = await observeQuery(Promise.resolve(null), source, '2026-09-27T00:00:00Z')
    expect(result).toMatchObject({ status: 'not_found', value: null })
  })
})
