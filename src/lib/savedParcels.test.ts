import { describe, expect, it } from 'vitest'
import { addSavedPin, canonicalPin, removeSavedPin, parseSavedPins, routeFromPath } from './savedParcels'

describe('saved parcel identity and routes', () => {
  it('stores distinct canonical PINs and caps the list at four', () => {
    const pins = ['0011M00146000000', '0028J00001000000']
    expect(addSavedPin(pins, '0011M00146000000')).toEqual(pins)
    expect(addSavedPin(pins, '0011M00147000000')).toHaveLength(3)
    expect(addSavedPin([...pins, '0011M00147000000', '0011M00149000000'], '0011M00060000000')).toHaveLength(4)
    expect(removeSavedPin(pins, '0028J00001000000')).toEqual(['0011M00146000000'])
  })

  it('rejects malformed stored IDs and parses direct parcel URLs', () => {
    expect(canonicalPin('')).toBeNull()
    expect(canonicalPin('123')).toBeNull()
    expect(parseSavedPins('["0011M00146000000","bad","","123","0011M00146000000"]')).toEqual(['0011M00146000000'])
    expect(routeFromPath('/parcels/0011M00146000000')).toEqual({ page: 'report', pin: '0011M00146000000' })
    expect(routeFromPath('/compare')).toEqual({ page: 'compare' })
    expect(routeFromPath('/parcels/bad')).toEqual({ page: 'invalid' })
  })
})
