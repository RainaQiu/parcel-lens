import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearLayerUpdatedAtCache, fetchLayerUpdatedAt, queryPghLayer } from './gis'
import type { ParcelFeature } from './types'

const feature: ParcelFeature = { type: 'Feature', properties: { PIN: '0051N00300000000' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }

afterEach(() => {
  vi.unstubAllGlobals()
  clearLayerUpdatedAtCache()
})

describe('GIS response validation', () => {
  it('rejects an ArcGIS error document even with HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: { message: 'Layer unavailable' } }) }))
    await expect(queryPghLayer('PGHWebSlope25', feature)).rejects.toThrow('Layer unavailable')
  })

  it('reads a layer publication date from ArcGIS editingInfo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ editingInfo: { dataLastEditDate: Date.UTC(2025, 2, 4) } }),
    }))
    await expect(fetchLayerUpdatedAt('/api/pgh/PGHWebSlope25?f=json')).resolves.toBe('2025-03-04T00:00:00.000Z')
  })
})
