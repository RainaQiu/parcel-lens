import { describe, expect, it } from 'vitest'
import { isCurrentSelection, resolveSearchSubmission, assessmentMatchesParcel } from './selection'

describe('parcel selection', () => {
  it('submits only a parcel PIN directly and requires choosing an address candidate', () => {
    expect(resolveSearchSubmission('0051N00300000000', [])).toEqual({ kind: 'pin', pin: '0051N00300000000' })
    expect(resolveSearchSubmission('4750 Centre Ave', [{ PARID: '0051N00300000000' }])).toEqual({ kind: 'choose_candidate' })
    expect(resolveSearchSubmission('4750 Centre Ave', [])).toEqual({ kind: 'choose_candidate' })
    expect(resolveSearchSubmission(' ', [])).toEqual({ kind: 'empty' })
  })

  it('rejects stale requests and mismatched parcel IDs', () => {
    expect(isCurrentSelection(1, 2, '0051N00300000000', '0051N00300000000')).toBe(false)
    expect(isCurrentSelection(2, 2, '0051N00300000000', '0051N00400000000')).toBe(false)
    expect(isCurrentSelection(2, 2, '0051N00300000000', '0051N00300000000')).toBe(true)
    expect(assessmentMatchesParcel('0051N00300000000', '0051N00400000000')).toBe(false)
  })
})
