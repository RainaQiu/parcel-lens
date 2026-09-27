import type { OverlapFact } from '../types'

export const SLIVER_AREA_SQFT = 10
export const SLIVER_OVERLAP_PCT = 0.1

export function isSliver(overlapPct: number, intersectionAreaSqft: number): boolean {
  return intersectionAreaSqft < SLIVER_AREA_SQFT && overlapPct < SLIVER_OVERLAP_PCT
}

export function factIsSliver(fact: OverlapFact): boolean {
  return isSliver(fact.parcelOverlapPct ?? fact.overlapPct, fact.intersectionAreaSqft)
}

export function effectiveOverlap(fact: OverlapFact | undefined): {
  overlapPct: number
  intersectionAreaSqft: number
  sliver: boolean
} {
  if (!fact) return { overlapPct: 0, intersectionAreaSqft: 0, sliver: false }
  const sliver = factIsSliver(fact)
  return {
    overlapPct: sliver ? 0 : fact.overlapPct,
    intersectionAreaSqft: sliver ? 0 : fact.intersectionAreaSqft,
    sliver,
  }
}

export function overlapRag(overlapPct: number): 'GREEN' | 'AMBER' | 'RED' {
  if (overlapPct <= 0) return 'GREEN'
  if (overlapPct <= 50) return 'AMBER'
  return 'RED'
}
