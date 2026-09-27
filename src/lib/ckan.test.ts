import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchAssessments } from './ckan'

afterEach(() => vi.unstubAllGlobals())

describe('assessment search', () => {
  it('treats compact-looking addresses as addresses, not parcel IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { records: [{ PARID: '0052G00030000000', PROPERTYHOUSENUM: '5051', PROPERTYADDRESS: 'CASTLEMAN ST', MUNICODE: 107 }] } }) })
    vi.stubGlobal('fetch', fetchMock)
    const results = await searchAssessments('5051 CASTLEMAN ST')
    expect(results).toHaveLength(1)
    const url = String(fetchMock.mock.calls[0][0])
    expect(new URL(url, 'http://localhost').searchParams.get('filters')).toContain('PROPERTYHOUSENUM')
  })
})
