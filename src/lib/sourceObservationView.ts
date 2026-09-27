import { formatDate, formatNumber } from './format'
import type {
  AssessmentRow,
  FloodHit,
  OverlapFact,
  SourceObservation,
  SourceObservations,
} from './types'

export const SOURCE_ORDER = [
  'assessment',
  'zoning',
  'slope',
  'landslide',
  'undermined',
  'fema',
  'historicDistrict',
  'historicSite',
  'violations',
  'condemned',
] as const

const SOURCE_LABELS: Record<(typeof SOURCE_ORDER)[number], string> = {
  assessment: 'WPRDC assessments',
  zoning: 'Pittsburgh zoning',
  slope: '25%+ slope',
  landslide: 'Landslide-prone areas',
  undermined: 'Undermined areas',
  fema: 'FEMA flood hazard',
  historicDistrict: 'City historic districts',
  historicSite: 'Individual historic sites',
  violations: 'PLI violations',
  condemned: 'Condemned properties',
}

const JOIN_LABELS: Record<SourceObservation<unknown>['joinMethod'], string> = {
  polygon_clip: 'Parcel polygon intersection',
  parcel_id: 'Parcel ID match',
  point_lookup: 'Point lookup',
}

const FLOOD_LABELS: Record<string, string> = {
  FLOODWAY: 'Floodway',
  SFHA: 'Special flood hazard area',
  PCT_0_2: '0.2% annual-chance flood',
  '0.2_PERCENT': '0.2% annual-chance flood',
}

export type SourceObservationRow = {
  key: string
  label: string
  fact: string
  statusNote: string | null
  joinLabel: string
  publishedLabel: string | null
  sourceUrl: string
}

export function publishedLabel(sourceUpdatedAt: string | null | undefined): string | null {
  if (!sourceUpdatedAt) return null
  const formatted = formatDate(sourceUpdatedAt)
  if (!formatted || formatted === '—') return null
  return `Published ${formatted}`
}

export function sourceObservationRows(sources?: SourceObservations): SourceObservationRow[] {
  if (!sources) return []
  return SOURCE_ORDER.flatMap((key) => {
    const observation = sources[key] as SourceObservation<unknown> | undefined
    if (!observation) return []
    return [{
      key,
      label: SOURCE_LABELS[key],
      fact: formatObservationFact(key, observation),
      statusNote: statusNote(observation),
      joinLabel: JOIN_LABELS[observation.joinMethod],
      publishedLabel: publishedLabel(observation.sourceUpdatedAt),
      sourceUrl: observation.sourceUrl,
    }]
  })
}

function statusNote(observation: SourceObservation<unknown>): string | null {
  if (observation.status === 'unavailable') {
    return observation.nAReason ? `Unavailable · ${observation.nAReason}` : 'Unavailable'
  }
  if (observation.status === 'not_found') {
    return observation.nAReason && observation.nAReason !== 'No matching record'
      ? `No record found · ${observation.nAReason}`
      : 'No record found'
  }
  return null
}

function formatObservationFact(key: (typeof SOURCE_ORDER)[number], observation: SourceObservation<unknown>): string {
  if (observation.status === 'unavailable') {
    return observation.nAReason ?? 'Could not retrieve this source'
  }
  if (observation.status === 'not_found' || observation.value == null) {
    return observation.nAReason ?? 'No matching record'
  }
  if (key === 'zoning' && Array.isArray(observation.value)) {
    return observation.value.length ? observation.value.join(', ') : 'No district code'
  }
  if (key === 'fema' && Array.isArray(observation.value)) {
    return formatFloodHits(observation.value as FloodHit[])
  }
  if (isOverlapFact(observation.value)) return formatOverlap(observation.value)
  if (key === 'violations' || key === 'condemned') {
    const count = Number(observation.value)
    return Number.isFinite(count) ? `${formatNumber(count, 0)} record${count === 1 ? '' : 's'}` : 'No matching record'
  }
  if (key === 'assessment') return formatAssessment(observation.value as AssessmentRow)
  return String(observation.value)
}

function isOverlapFact(value: unknown): value is OverlapFact {
  return typeof value === 'object' && value !== null && 'overlapPct' in value && 'intersectionAreaSqft' in value
}

function formatOverlap(fact: OverlapFact): string {
  const pct = fact.parcelOverlapPct ?? fact.overlapPct
  if (!(pct > 0) || !(fact.intersectionAreaSqft > 0)) return 'No overlap'
  return `${formatNumber(pct, 3)}% of parcel (${formatNumber(fact.intersectionAreaSqft, 0)} sq ft)`
}

function formatFloodHits(hits: FloodHit[]): string {
  const present = hits.filter((hit) => hit.overlapPct > 0 && hit.intersectionAreaSqft > 0)
  if (!present.length) return 'No flood overlay'
  return present
    .map((hit) => `${FLOOD_LABELS[hit.category] ?? hit.category} · ${formatNumber(hit.overlapPct, 3)}% of parcel`)
    .join('; ')
}

function formatAssessment(row: AssessmentRow): string {
  const parid = row.PARID?.trim()
  return parid ? `Matched PARID ${parid}` : 'Assessment record matched'
}
