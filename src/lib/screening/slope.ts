import type { ScreeningRag } from './types'

// A small mapped overlap can be an edge effect and does not by itself justify
// a targeted review. These are screening thresholds, not engineering limits.
export const STEEP_SLOPE_AMBER_MIN_OVERLAP_PCT = 10
export const STEEP_SLOPE_RED_MIN_OVERLAP_PCT = 50

export function steepSlopeRag(overlapPct: number): ScreeningRag {
  if (overlapPct < STEEP_SLOPE_AMBER_MIN_OVERLAP_PCT) return 'GREEN'
  if (overlapPct < STEEP_SLOPE_RED_MIN_OVERLAP_PCT) return 'AMBER'
  return 'RED'
}
