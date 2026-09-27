import type { MappedConstraint, ScreeningRag } from './types'
import { steepSlopeRag } from './slope'

export const LANDSLIDE_AMBER_MIN_OVERLAP_PCT = 10
export const LANDSLIDE_RED_MIN_OVERLAP_PCT = 50

// Historic designation polygons are sensitive to parcel-boundary noise. Both
// conditions must be small before the hit is treated as routine context only.
export const HISTORIC_BOUNDARY_TOLERANCE_PCT = 1
export const HISTORIC_BOUNDARY_TOLERANCE_SQFT = 100

export const FEMA_PCT_0_2_AMBER_MIN_OVERLAP_PCT = 10
export const FEMA_SFHA_RED_MIN_OVERLAP_PCT = 50

function landslideRag(overlapPct: number): ScreeningRag {
  if (overlapPct < LANDSLIDE_AMBER_MIN_OVERLAP_PCT) return 'GREEN'
  if (overlapPct < LANDSLIDE_RED_MIN_OVERLAP_PCT) return 'AMBER'
  return 'RED'
}

function historicRag(overlapPct: number, intersectionAreaSqft: number): ScreeningRag {
  if (overlapPct < HISTORIC_BOUNDARY_TOLERANCE_PCT && intersectionAreaSqft < HISTORIC_BOUNDARY_TOLERANCE_SQFT) {
    return 'GREEN'
  }
  return 'AMBER'
}

function femaRag(constraint: MappedConstraint): ScreeningRag {
  const overlapPct = constraint.overlapPct ?? 0
  if (constraint.category === 'FLOODWAY') return 'RED'
  if (constraint.category === 'SFHA') return overlapPct >= FEMA_SFHA_RED_MIN_OVERLAP_PCT ? 'RED' : 'AMBER'
  if (constraint.category === 'PCT_0_2' || constraint.category === '0.2_PERCENT') {
    return overlapPct >= FEMA_PCT_0_2_AMBER_MIN_OVERLAP_PCT ? 'AMBER' : 'GREEN'
  }
  return 'GREEN'
}

export function mappedConstraintRag(constraint: MappedConstraint): ScreeningRag {
  if (constraint.status !== 'DETECTED') return 'GREEN'
  const overlapPct = constraint.overlapPct ?? 0
  if (constraint.id === 'slope') return steepSlopeRag(overlapPct)
  if (constraint.id === 'landslide') return landslideRag(overlapPct)
  if (constraint.id === 'undermined') return 'AMBER'
  if (constraint.id === 'fema') return femaRag(constraint)
  return historicRag(overlapPct, constraint.intersectionAreaSqft ?? 0)
}
