import type { HousingPathwayRow, LdesEvidence } from '../types'
import { normalizeDistrictKey } from '../housingPathways'
import type { EvidenceGap, PathwaySummary } from './types'

const uses = ['single_unit_detached', 'single_unit_attached', 'two_unit', 'three_unit', 'multi_unit']

export function summarizePathways(evidence: LdesEvidence): { status: PathwaySummary; rows: HousingPathwayRow[]; gaps: EvidenceGap[] } {
  const rows = evidence.housingPathways ?? []
  const gaps: EvidenceGap[] = []
  const add = (id: string, reason: string) => gaps.push({ id, dimension: 'housing pathways', reason, sourceRefs: [evidence.sources?.zoning?.sourceId ?? 'pgh-zoning'] })
  if (evidence.cityVerified !== true || evidence.polygonVerified !== true) add('identity', 'Pittsburgh jurisdiction or parcel boundary is not verified.')
  if (evidence.allZoningDistrictsVerified !== true || evidence.sources?.zoning?.joinMethod === 'point_lookup') add('zoning-geometry', 'Complete parcel zoning has not been verified by polygon.')
  if ((evidence.districts?.length ?? 0) !== 1) add('zoning-districts', 'The parcel does not have one verified base zoning district.')
  if (evidence.overlayPresent && (!evidence.overlayHandled || (!evidence.overlayRulesApplied && !evidence.overlayWrittenExclusion))) add('zoning-overlay', 'Applicable overlay rules have not been verified.')
  const district = evidence.districts?.length === 1 ? normalizeDistrictKey(evidence.districts[0]) : null
  if (district?.kind !== 'base' || rows.some((row) => row.districtKey !== district.districtKey)) add('use-table-district', 'The verified use rows do not match the parcel base district.')
  const distinct = new Set(rows.map((row) => row.useType))
  if (rows.length !== 5 || distinct.size !== 5 || uses.some((use) => !distinct.has(use as HousingPathwayRow['useType'])) || rows.some((row) => row.reviewStatus !== 'verified' || row.pathway === 'UNKNOWN')) {
    add('use-table', 'The five residential use listings are not all verified.')
  }
  if (gaps.length) return { status: 'UNKNOWN', rows, gaps }
  if (rows.some((row) => row.pathway === 'P')) return { status: 'BY_RIGHT_PATH_IDENTIFIED', rows, gaps }
  if (rows.some((row) => ['A', 'S', 'C', 'P_OR_S'].includes(row.pathway))) return { status: 'REVIEW_PATH_ONLY', rows, gaps }
  return { status: 'NO_LISTED_PATH', rows, gaps }
}
