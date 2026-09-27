import { describe, expect, it } from 'vitest'
import { normalizeStreet, rankAddressCandidates } from './addressSearch'
import type { SearchHit } from './types'

const hit = (pin: string, house: string, street: string): SearchHit => ({
  PARID: pin,
  PROPERTYHOUSENUM: house,
  PROPERTYADDRESS: street,
  PROPERTYCITY: 'PITTSBURGH',
  PROPERTYZIP: '15213',
  MUNICODE: 104,
})

describe('address candidate ranking', () => {
  it('treats spelled ordinals and street suffixes as retrieval aliases while preserving duplicate parcels', () => {
    expect(normalizeStreet('Fifth Avenue')).toBe('5TH AVE')
    const matches = rankAddressCandidates('2633 fifth avenue', [
      hit('A', '2633', '5TH AVE'), hit('B', '2633', '5TH AVE'), hit('C', '2633', 'FORBES AVE'),
    ])
    expect(matches.map((item) => item.PARID)).toEqual(['A', 'B'])
  })

  it('suggests a street typo but never silently chooses a different house number', () => {
    expect(rankAddressCandidates('2633 fith avenue', [hit('A', '2633', '5TH AVE')])).toHaveLength(1)
    expect(rankAddressCandidates('2634 fifth avenue', [hit('A', '2633', '5TH AVE')])[0].PARID).toBe('A')
  })

  it('does not match an unrelated street merely because its house number matches', () => {
    expect(rankAddressCandidates('2633 fifth avenue', [hit('A', '2633', 'FORBES AVE')])).toEqual([])
  })

  it('accepts a full address with city and ZIP without changing the street match', () => {
    expect(rankAddressCandidates('2633 Fifth Avenue, Pittsburgh, PA 15213', [hit('A', '2633', '5TH AVE')]).map((item) => item.PARID)).toEqual(['A'])
  })
})
