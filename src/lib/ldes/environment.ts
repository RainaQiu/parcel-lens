import type { Barrier, CriticalFlag, FloodCategory, FloodHit, LdesEvidence, OverlapFact, Rag } from '../types'
import { makeDriver } from './constants'
import { effectiveOverlap, isSliver, overlapRag } from './geometry'
import { worstColor } from './combine'

function normalizeFlood(category: FloodCategory | undefined): 'NONE' | 'PCT_0_2' | 'SFHA' | 'FLOODWAY' {
  if (!category || category === 'NONE' || category === 'OUTSIDE') return 'NONE'
  if (category === '0.2_PERCENT' || category === 'PCT_0_2') return 'PCT_0_2'
  if (category === 'FLOODWAY') return 'FLOODWAY'
  return 'SFHA'
}

function floodRagFor(category: ReturnType<typeof normalizeFlood>, overlapPct: number): Rag {
  if (category === 'NONE' || overlapPct <= 0) return 'GREEN'
  if (category === 'PCT_0_2') return 'AMBER'
  return overlapRag(overlapPct)
}

function factFromPct(overlapPct: number, intersectionAreaSqft?: number): OverlapFact {
  return {
    overlapPct,
    intersectionAreaSqft: intersectionAreaSqft ?? (overlapPct > 0 ? 1000 : 0),
  }
}

export function scoreEnvironment(evidence: LdesEvidence): {
  rag: Rag
  slopeRag: Rag
  landslideRag: Rag
  underminedRag: Rag
  floodRag: Rag
  flags: CriticalFlag[]
  drivers: Barrier[]
  context: Barrier[]
  missing: string[]
} {
  const flags: CriticalFlag[] = []
  const drivers: Barrier[] = []
  const context: Barrier[] = []
  const missing: string[] = []

  if (evidence.femaQueryStatus === 'FAILED' || evidence.environmentalQueriesSuccessful === false) {
    missing.push('slope, landslide, undermined, and FEMA queries')
    return {
      rag: 'UNRATED',
      slopeRag: 'UNRATED',
      landslideRag: 'UNRATED',
      underminedRag: 'UNRATED',
      floodRag: 'UNRATED',
      flags,
      drivers,
      context,
      missing,
    }
  }

  const slopeFact = evidence.slope ?? factFromPct(evidence.slopeOverlapPct ?? 0)
  const slideFact = evidence.landslide ?? factFromPct(evidence.landslideOverlapPct ?? 0)
  const mineFact = evidence.undermined ?? factFromPct(evidence.underminedOverlapPct ?? 0)

  const slope = effectiveOverlap(slopeFact)
  const slide = effectiveOverlap(slideFact)
  const mine = effectiveOverlap(mineFact)

  if (slope.sliver || slide.sliver || mine.sliver) {
    context.push(
      makeDriver({
        id: 'POSSIBLE_BOUNDARY_SLIVER',
        kind: 'context',
        factor: 'geometry_sliver',
        title: 'Possible boundary sliver',
        detail: 'A tiny polygon overlap is below the versioned engineering denoising threshold and does not change this RAG.',
        nextStep: 'Confirm the clip if the constraint could affect a buildable edge.',
        observedValue: 'sliver',
        field: 'parcel_overlap_pct',
      }),
    )
  }

  const slopeRag = overlapRag(slope.overlapPct)
  const landslideRag = overlapRag(slide.overlapPct)
  const underminedRag = overlapRag(mine.overlapPct)

  if (slopeRag !== 'GREEN') {
    drivers.push(
      makeDriver({
        id: 'slope',
        factor: 'slope_overlap',
        title: 'Steep-slope overlap',
        detail: `${slope.overlapPct}% of the assessment geometry overlaps the 25%+ slope layer.`,
        nextStep: 'Confirm buildable area with a site survey.',
        observedValue: `${slope.overlapPct}%`,
        rag: slopeRag,
        field: 'slopeOverlapPct',
      }),
    )
  }
  if (slope.overlapPct > 50) flags.push('MAJORITY_STEEP_SLOPE')

  if (landslideRag !== 'GREEN') {
    drivers.push(
      makeDriver({
        id: 'landslide',
        factor: 'landslide_overlap',
        title: 'Landslide-prone area overlap',
        detail: 'Professional geotechnical review is needed before relying on this result.',
        nextStep: 'Obtain geotechnical review before treating the site as unconstrained.',
        observedValue: `${slide.overlapPct}%`,
        rag: landslideRag,
        field: 'landslideOverlapPct',
      }),
    )
  }
  if (underminedRag !== 'GREEN') {
    drivers.push(
      makeDriver({
        id: 'undermined',
        factor: 'undermined_overlap',
        title: 'Undermined area overlap',
        detail: 'Historical mine information is a screening flag, not a structural safety conclusion.',
        nextStep: 'Verify mine maps with a qualified professional.',
        observedValue: `${mine.overlapPct}%`,
        rag: underminedRag,
        field: 'underminedOverlapPct',
      }),
    )
  }

  const hazardCount = [slopeRag, landslideRag, underminedRag].filter((item) => item === 'AMBER' || item === 'RED').length
  if (hazardCount >= 2) flags.push('MULTIPLE_GEOTECHNICAL_HAZARDS')

  const flood = scoreFlood(evidence)
  flags.push(...flood.flags)
  drivers.push(...flood.drivers)
  context.push(...flood.context)

  const rag = worstColor([slopeRag, landslideRag, underminedRag, flood.rag])
  return {
    rag,
    slopeRag,
    landslideRag,
    underminedRag,
    floodRag: flood.rag,
    flags,
    drivers,
    context,
    missing,
  }
}

function scoreFlood(evidence: LdesEvidence): {
  rag: Rag
  flags: CriticalFlag[]
  drivers: Barrier[]
  context: Barrier[]
} {
  const flags: CriticalFlag[] = []
  const drivers: Barrier[] = []
  const context: Barrier[] = []
  const hits: FloodHit[] = evidence.floodHits?.length
    ? evidence.floodHits
    : [
        {
          category: evidence.floodCategory ?? 'NONE',
          overlapPct: evidence.floodOverlapPct ?? 0,
          intersectionAreaSqft: evidence.floodIntersectionAreaSqft ?? ((evidence.floodOverlapPct ?? 0) > 0 ? 1000 : 0),
        },
      ]

  let worst: Rag = 'GREEN'
  let floodwayAffects = false
  let floodwaySliver = false
  let ordinarySliver = false

  for (const hit of hits) {
    const category = normalizeFlood(hit.category)
    const sliver = isSliver(hit.overlapPct, hit.intersectionAreaSqft)
    if (sliver && (category === 'FLOODWAY' || category === 'SFHA')) {
      floodwaySliver = category === 'FLOODWAY' || floodwaySliver
      if (category === 'FLOODWAY') {
        flags.push('UNRESOLVED_GEOMETRY_BOUNDARY')
        worst = 'UNRATED'
        continue
      }
      ordinarySliver = true
      continue
    }
    if (sliver) {
      ordinarySliver = true
      continue
    }
    const rag = floodRagFor(category, hit.overlapPct)
    if (category === 'FLOODWAY' && hit.overlapPct > 0) floodwayAffects = true
    if (rag === 'UNRATED') worst = 'UNRATED'
    else if (worst !== 'UNRATED' && rag === 'RED') worst = 'RED'
    else if (worst === 'GREEN' && rag === 'AMBER') worst = 'AMBER'
  }

  if (ordinarySliver) {
    context.push(
      makeDriver({
        id: 'POSSIBLE_BOUNDARY_SLIVER',
        kind: 'context',
        factor: 'flood_sliver',
        title: 'Possible flood polygon sliver',
        detail: 'A tiny flood-layer overlap is below the versioned engineering denoising threshold.',
        nextStep: 'Confirm the clip if the flood classification could change.',
        observedValue: 'sliver',
        field: 'flood_overlap_pct',
      }),
    )
  }
  if (floodwaySliver && worst === 'UNRATED') {
    drivers.push(
      makeDriver({
        id: 'UNRESOLVED_GEOMETRY_BOUNDARY',
        factor: 'floodway_sliver',
        title: 'Unresolved floodway boundary',
        detail: 'A floodway sliver could change the regulatory classification and is not resolved.',
        nextStep: 'Resolve the geometry before issuing a flood RAG.',
        observedValue: 'floodway sliver',
        rag: 'UNRATED',
        field: 'flood_overlap_pct',
      }),
    )
  }
  if (floodwayAffects) flags.push('REGULATORY_FLOODWAY_AFFECTS_SITE')
  if (worst !== 'GREEN' && worst !== 'UNRATED') {
    drivers.push(
      makeDriver({
        id: 'flood',
        factor: 'flood_hazard',
        title: 'FEMA flood-hazard overlap',
        detail: 'Use the latest FEMA NFHL classification and obtain formal floodplain review when applicable.',
        nextStep: 'Check the current NFHL map and floodplain review requirements.',
        observedValue: String(evidence.floodCategory ?? hits.map((hit) => hit.category).join(',')),
        rag: worst,
        field: 'floodCategory',
      }),
    )
  }
  return { rag: worst, flags, drivers, context }
}
