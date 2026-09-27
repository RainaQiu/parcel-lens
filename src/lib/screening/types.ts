import type { FloodCategory, HousingPathwayRow, Rag, SourceObservation } from '../types'

export type ScreeningRag = Rag
export type PathwaySummary = 'BY_RIGHT_PATH_IDENTIFIED' | 'REVIEW_PATH_ONLY' | 'NO_LISTED_PATH' | 'UNKNOWN'
export type EvidenceGap = { id: string; dimension: string; reason: string; sourceRefs: string[] }
export type MappedConstraint = {
  id: 'slope' | 'landslide' | 'undermined' | 'fema' | 'historicDistrict' | 'historicSite'
  label: string
  status: 'DETECTED' | 'NOT_DETECTED' | 'UNKNOWN'
  category: FloodCategory | null
  overlapPct: number | null
  intersectionAreaSqft: number | null
  boundaryUncertain: boolean
  projectImpact: 'UNKNOWN' | 'NOT_APPLICABLE'
  source: Pick<SourceObservation<unknown>, 'sourceId' | 'sourceUrl' | 'sourceUpdatedAt' | 'retrievedAt' | 'joinMethod'> | null
}
export type ReviewTask = {
  id: string
  trigger: string
  whyItMatters: string
  whoToConsult: string
  sourceRefs: string[]
  scoreEffect: 'triggered' | 'routine' | 'gap'
}
export type ScreeningScorecard = {
  parcelId: string | null
  scoreVersion: 'LDES-v3-screening-scorecard'
  screeningRag: ScreeningRag
  projectFeasibility: 'NOT_ASSESSED'
  pathwaySummary: PathwaySummary
  housingPathways: HousingPathwayRow[]
  mappedConstraints: MappedConstraint[]
  reviewTasks: ReviewTask[]
  evidenceGaps: EvidenceGap[]
  unassessed: string[]
  requiredSourceCoverage: Record<string, boolean>
  ruleVersions: string[]
}
