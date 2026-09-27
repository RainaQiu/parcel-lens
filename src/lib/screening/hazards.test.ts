import { describe, expect, it } from 'vitest'
import { mappedConstraintRag } from './hazards'
import type { MappedConstraint } from './types'

function constraint(
  id: MappedConstraint['id'],
  overlapPct: number,
  intersectionAreaSqft = overlapPct * 100,
  category: MappedConstraint['category'] = null,
): MappedConstraint {
  return { id, label: id, status: 'DETECTED', category, overlapPct, intersectionAreaSqft,
    boundaryUncertain: false, projectImpact: 'UNKNOWN', source: null }
}

describe('mapped constraint grading thresholds', () => {
  it('grades landslide overlap at 10% and 50% boundaries', () => {
    expect(mappedConstraintRag(constraint('landslide', 9.999))).toBe('GREEN')
    expect(mappedConstraintRag(constraint('landslide', 10))).toBe('AMBER')
    expect(mappedConstraintRag(constraint('landslide', 49.999))).toBe('AMBER')
    expect(mappedConstraintRag(constraint('landslide', 50))).toBe('RED')
  })

  it('keeps any effective undermined overlap Amber', () => {
    expect(mappedConstraintRag(constraint('undermined', 0.101, 11))).toBe('AMBER')
    expect(mappedConstraintRag(constraint('undermined', 100, 10000))).toBe('AMBER')
  })

  it('suppresses only historic hits that are small by both percent and area', () => {
    expect(mappedConstraintRag(constraint('historicDistrict', 0.999, 99))).toBe('GREEN')
    expect(mappedConstraintRag(constraint('historicDistrict', 1, 99))).toBe('AMBER')
    expect(mappedConstraintRag(constraint('historicSite', 0.5, 100))).toBe('AMBER')
  })

  it('grades FEMA categories separately', () => {
    expect(mappedConstraintRag(constraint('fema', 9.999, 1000, 'PCT_0_2'))).toBe('GREEN')
    expect(mappedConstraintRag(constraint('fema', 10, 1000, 'PCT_0_2'))).toBe('AMBER')
    expect(mappedConstraintRag(constraint('fema', 49.999, 1000, 'SFHA'))).toBe('AMBER')
    expect(mappedConstraintRag(constraint('fema', 50, 1000, 'SFHA'))).toBe('RED')
    expect(mappedConstraintRag(constraint('fema', 0.101, 11, 'FLOODWAY'))).toBe('RED')
  })
})
