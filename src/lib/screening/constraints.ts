import { effectiveOverlap, isSliver } from '../ldes/geometry'
import type { FloodCategory, FloodHit, LdesEvidence, OverlapFact, SourceObservation } from '../types'
import type { EvidenceGap, MappedConstraint } from './types'

const layers = [
  ['slope', '25%+ steep slope'], ['landslide', 'Landslide-prone area'],
  ['undermined', 'Undermined area'], ['fema', 'FEMA flood hazard'],
  ['historicDistrict', 'Historic district'], ['historicSite', 'Historic site'],
] as const
const floodRank: Record<FloodCategory, number> = {
  NONE: 0, OUTSIDE: 0, PCT_0_2: 1, '0.2_PERCENT': 1, SFHA: 2, FLOODWAY: 3,
}

function sourceMeta(source: SourceObservation<unknown> | undefined): MappedConstraint['source'] {
  if (!source) return null
  return { sourceId: source.sourceId, sourceUrl: source.sourceUrl, sourceUpdatedAt: source.sourceUpdatedAt,
    retrievedAt: source.retrievedAt, joinMethod: source.joinMethod }
}

export function observeMappedConstraints(evidence: LdesEvidence): { constraints: MappedConstraint[]; gaps: EvidenceGap[] } {
  const gaps: EvidenceGap[] = []
  const constraints = layers.map(([id, label]): MappedConstraint => {
    const source = evidence.sources?.[id] as SourceObservation<OverlapFact | FloodHit[]> | undefined
    const base = { id, label, category: null, overlapPct: null, intersectionAreaSqft: null,
      boundaryUncertain: false, projectImpact: 'NOT_APPLICABLE' as const, source: sourceMeta(source) }
    if (!source || source.status === 'unavailable' || (source.status === 'available' && source.value === null)) {
      gaps.push({ id: `${id}-source`, dimension: label, reason: source?.nAReason || `${label} source is unavailable.`, sourceRefs: source ? [source.sourceId] : [id] })
      return { ...base, status: 'UNKNOWN' }
    }
    if (source.status === 'not_found') return { ...base, status: 'NOT_DETECTED' }
    if (id === 'fema') {
      const hits = (source.value as FloodHit[]).filter((hit) => hit.overlapPct > 0 && hit.intersectionAreaSqft > 0)
      const effective = hits.filter((hit) => !isSliver(hit.overlapPct, hit.intersectionAreaSqft))
      const strongest = [...effective].sort((a, b) => floodRank[b.category] - floodRank[a.category])[0]
      if (!strongest && hits.length) {
        const uncertain = [...hits].sort((a, b) => floodRank[b.category] - floodRank[a.category])[0]
        gaps.push({ id: 'fema-boundary', dimension: label, reason: 'A tiny FEMA polygon intersection needs boundary verification.', sourceRefs: [source.sourceId] })
        return { ...base, status: 'UNKNOWN', category: uncertain.category, overlapPct: uncertain.overlapPct,
          intersectionAreaSqft: uncertain.intersectionAreaSqft, boundaryUncertain: true }
      }
      if (!strongest) return { ...base, status: 'NOT_DETECTED' }
      return { ...base, status: 'DETECTED', category: strongest.category, overlapPct: strongest.overlapPct,
        intersectionAreaSqft: strongest.intersectionAreaSqft, projectImpact: 'UNKNOWN' }
    }
    const fact = source.value as OverlapFact
    const effective = effectiveOverlap(fact)
    return { ...base, status: effective.overlapPct > 0 && effective.intersectionAreaSqft > 0 ? 'DETECTED' : 'NOT_DETECTED',
      overlapPct: fact.parcelOverlapPct ?? fact.overlapPct, intersectionAreaSqft: fact.intersectionAreaSqft,
      boundaryUncertain: effective.sliver, projectImpact: effective.overlapPct > 0 ? 'UNKNOWN' : 'NOT_APPLICABLE' }
  })
  return { constraints, gaps }
}
