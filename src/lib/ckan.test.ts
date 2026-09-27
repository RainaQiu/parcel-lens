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

  it('paginates house-number records before ranking a normalized address', async () => {
    const records = Array.from({ length: 50 }, (_, index) => ({ PARID: `X${index}`, PROPERTYHOUSENUM: '2633', PROPERTYADDRESS: 'FORBES AVE', MUNICODE: 104 }))
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const offset = Number(new URL(url, 'http://localhost').searchParams.get('offset') ?? 0)
      return Promise.resolve({ ok: true, json: async () => ({ result: { total: 51, records: offset ? [{ PARID: 'TARGET', PROPERTYHOUSENUM: '2633', PROPERTYADDRESS: '5TH AVE', MUNICODE: 104 }] : records } }) })
    })
    vi.stubGlobal('fetch', fetchMock)
    const matches = await searchAssessments('2633 fifth avenue')
    expect(matches.map((item) => item.PARID)).toEqual(['TARGET'])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
