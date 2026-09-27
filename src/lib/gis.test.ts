import { afterEach, describe, expect, it, vi } from 'vitest'
import { queryPghLayer } from './gis'
import type { ParcelFeature } from './types'

const feature: ParcelFeature = { type: 'Feature', properties: { PIN: '0051N00300000000' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] } }

afterEach(() => vi.unstubAllGlobals())

describe('GIS response validation', () => {
  it('rejects an ArcGIS error document even with HTTP 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: { message: 'Layer unavailable' } }) }))
    await expect(queryPghLayer('PGHWebSlope25', feature)).rejects.toThrow('Layer unavailable')
  })
})
