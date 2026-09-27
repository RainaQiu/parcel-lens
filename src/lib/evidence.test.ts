import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeQuery, sourceObservation } from './evidence'
import { collectLdesLayers } from './ldes'
import { clearLayerUpdatedAtCache } from './gis'
import { scoreInputs } from './ldes'
import { scoreEvidence } from './score'
import type { ParcelFeature } from './types'

afterEach(() => {
  vi.unstubAllGlobals()
  clearLayerUpdatedAtCache()
})

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

  it('keeps successful zoning and other source facts when slope service fails', async () => {
    const feature: ParcelFeature = { type: 'Feature', properties: { PIN: '0052G00030000000', MUNICODE: 107 }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string) => {
      if (input.includes('PGHWebLandslideProne') && input.includes('f=json')) {
        return { ok: true, json: async () => ({ editingInfo: { lastEditDate: Date.UTC(2024, 5, 8) } }) }
      }
      if (input.includes('PGHWebSlope25')) throw new Error('slope timeout')
      if (input.includes('/api/ckan/')) return { ok: true, json: async () => ({ result: { records: [] } }) }
      const features = input.includes('PGHWebZoning') ? [{ properties: { zon_new: 'R1D-VL' }, geometry: feature.geometry }] : []
      return { ok: true, json: async () => ({ type: 'FeatureCollection', features }) }
    }))
    const layers = await collectLdesLayers(feature, null)
    const result = scoreEvidence(scoreInputs(feature, null, layers))
    expect(layers.sources?.slope).toMatchObject({ status: 'unavailable', value: null, nAReason: 'slope timeout' })
    expect(layers.sources?.landslide).toMatchObject({ status: 'available', value: { overlapPct: 0 }, sourceUpdatedAt: '2024-06-08T00:00:00.000Z' })
    expect(result.zoningRag).toBe('GREEN')
    expect(result.environmentalGeotechnicalRag).toBe('UNRATED')
    expect(result.easeScore).toBe('UNRATED')
  })

  it('does not treat a closed condemned record as an active constraint', async () => {
    const feature: ParcelFeature = { type: 'Feature', properties: { PIN: '0052G00030000000', MUNICODE: 107 }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (input: string) => {
      if (input.includes('0a963f26')) return { ok: true, json: async () => ({ result: { records: [{ parcel_id: feature.properties.PIN, inspection_status: 'Closed' }] } }) }
      if (input.includes('/api/ckan/')) return { ok: true, json: async () => ({ result: { records: [] } }) }
      const features = input.includes('PGHWebZoning') ? [{ properties: { zon_new: 'R1D-VL' }, geometry: feature.geometry }] : []
      return { ok: true, json: async () => ({ type: 'FeatureCollection', features }) }
    }))
    const layers = await collectLdesLayers(feature, null)
    expect(layers.activeCondemned).toBe(false)
  })
})
