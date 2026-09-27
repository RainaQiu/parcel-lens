import { canonicalPin } from '../savedParcels'
import type { LdesEvidence, SelectedParcel, SourceObservation } from '../types'
import { observeMappedConstraints } from './constraints'
import { mappedConstraintRag } from './hazards'
import { summarizePathways } from './pathways'
import { combineScreeningRag } from './rag'
import { deriveReviewTasks } from './tasks'
import type { EvidenceGap, ScreeningScorecard } from './types'

export const SCREENING_SCORE_VERSION = 'LDES-v3-screening-scorecard' as const
export const REQUIRED_SCREENING_SOURCES = ['slope', 'landslide', 'undermined', 'fema', 'historicDistrict', 'historicSite', 'violations', 'condemned'] as const
const unassessed = [
  'Project housing use, size, and proposed construction location',
  'Land control and availability',
  'Site engineering and mitigation cost',
  'Financial feasibility',
]

function complete(source: SourceObservation<unknown> | undefined): boolean {
  return Boolean(source && (source.status === 'available' || source.status === 'not_found'))
}

export function scoreScreeningParcel(selected: SelectedParcel): ScreeningScorecard {
  const evidence: LdesEvidence = selected.ldes ?? selected.ldesLayers ?? {}
  const parcelId = canonicalPin(selected.feature.properties.PIN ?? '')
  const identityVerified = Boolean(parcelId && evidence.cityVerified && evidence.polygonVerified && evidence.parcelMatchCount === 1 &&
    evidence.parcelGeometry === 'POLYGON' && (!selected.assessment || canonicalPin(selected.assessment.PARID) === parcelId))
  const pathway = summarizePathways(evidence)
  const mapped = observeMappedConstraints(evidence)
  const evidenceGaps: EvidenceGap[] = [...pathway.gaps, ...mapped.gaps]
  const requiredSourceCoverage: Record<string, boolean> = {}
  for (const id of REQUIRED_SCREENING_SOURCES) {
    const source = evidence.sources?.[id]
    requiredSourceCoverage[id] = complete(source) && !mapped.constraints.some((constraint) => constraint.id === id && constraint.status === 'UNKNOWN')
    if (!requiredSourceCoverage[id] && !evidenceGaps.some((gap) => gap.id === `${id}-source` || gap.id === `${id}-boundary`)) {
      evidenceGaps.push({ id: `${id}-source`, dimension: id, reason: source?.nAReason || `${id} source is unavailable.`,
        sourceRefs: [source?.sourceId ?? id] })
    }
  }
  if (!parcelId || !identityVerified) evidenceGaps.unshift({ id: 'parcel-identity', dimension: 'parcel identity',
    reason: 'A unique Pittsburgh parcel ID and polygon boundary are not verified.', sourceRefs: ['parcel-boundary'] })
  const reviewTasks = deriveReviewTasks(evidence, pathway.status, mapped.constraints, evidenceGaps)
  const redConstraint = mapped.constraints.some((constraint) => mappedConstraintRag(constraint) === 'RED')
  const screeningRag = combineScreeningRag({ identityVerified, pathway: pathway.status,
    requiredSourcesComplete: Object.values(requiredSourceCoverage).every(Boolean), tasks: reviewTasks, redConstraint })
  return { parcelId, scoreVersion: SCREENING_SCORE_VERSION, screeningRag, projectFeasibility: 'NOT_ASSESSED',
    pathwaySummary: pathway.status, housingPathways: pathway.rows, mappedConstraints: mapped.constraints,
    reviewTasks, evidenceGaps, unassessed: [...unassessed], requiredSourceCoverage,
    ruleVersions: [...new Set(pathway.rows.map((row) => row.ruleVersion).filter(Boolean))].sort() }
}
