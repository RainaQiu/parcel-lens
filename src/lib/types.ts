export type ParcelProperties = {
  PIN?: string
  MAPBLOCKLOT?: string
  MUNICODE?: number
  CALCACREAGE?: number
}

export type ParcelFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParcelProperties
>

export type AssessmentRow = {
  PARID: string
  PROPERTYHOUSENUM?: string | number | null
  PROPERTYFRACTION?: string | null
  PROPERTYADDRESS?: string | null
  PROPERTYCITY?: string | null
  PROPERTYSTATE?: string | null
  PROPERTYUNIT?: string | null
  PROPERTYZIP?: string | number | null
  MUNICODE?: number | string | null
  MUNIDESC?: string | null
  SCHOOLCODE?: string | null
  SCHOOLDESC?: string | null
  LEGAL1?: string | null
  LEGAL2?: string | null
  LEGAL3?: string | null
  NEIGHCODE?: string | null
  NEIGHDESC?: string | null
  TAXCODE?: string | null
  TAXDESC?: string | null
  OWNERCODE?: number | string | null
  OWNERDESC?: string | null
  CLASS?: string | null
  CLASSDESC?: string | null
  USECODE?: string | number | null
  USEDESC?: string | null
  LOTAREA?: number | string | null
  SALEDATE?: string | null
  SALEPRICE?: number | string | null
  SALEDESC?: string | null
  DEEDBOOK?: string | null
  DEEDPAGE?: string | null
  CHANGENOTICEADDRESS1?: string | null
  CHANGENOTICEADDRESS2?: string | null
  CHANGENOTICEADDRESS3?: string | null
  CHANGENOTICEADDRESS4?: string | null
  COUNTYBUILDING?: number | string | null
  COUNTYLAND?: number | string | null
  COUNTYTOTAL?: number | string | null
  FAIRMARKETBUILDING?: number | string | null
  FAIRMARKETLAND?: number | string | null
  FAIRMARKETTOTAL?: number | string | null
}

export type ZoningInfo = {
  code: string
  description: string
}

export type SearchHit = {
  PARID: string
  PROPERTYHOUSENUM?: string | number | null
  PROPERTYADDRESS?: string | null
  PROPERTYCITY?: string | null
  PROPERTYZIP?: string | number | null
  MUNIDESC?: string | null
}

export type SelectedParcel = {
  feature: ParcelFeature
  assessment: AssessmentRow | null
  zoning: ZoningInfo | null
  ldes?: LdesEvidence
}

export type Barrier = {
  id: string
  severity: 'low' | 'medium' | 'high'
  title: string
  detail: string
  penalty: number
  source: { name: string; field: string; value: string }
}

export type ParcelScore = {
  score: number | null
  band: 'easier' | 'mixed' | 'harder' | 'unrated'
  barriers: Barrier[]
  unscored: string[]
  scoreVersion: 'LDES-v2.0'
  scoreStatus: 'ASSESSED' | 'INSUFFICIENT_DATA'
  suitabilityScore: number | null
  suitabilityBand: SuitabilityBand
  developmentPotentialBand: DevelopmentPotentialBand
  overallResult: OverallResult | null
  availabilityStatus: 'NOT_ASSESSED'
  financialFeasibilityStatus: 'NOT_ASSESSED'
  deliveryTimingStatus: 'NOT_ASSESSED'
  missingRequired: string[]
  assumptions: string[]
}

export type SuitabilityBand = 'green' | 'amber' | 'red' | 'unrated'

export type DevelopmentPotentialBand = 'green' | 'amber' | 'red' | 'unknown'

export type OverallResult =
  | 'CURRENTLY_UNSUITABLE'
  | 'SELECTED_SCENARIO_DOES_NOT_FIT'
  | 'NEEDS_FURTHER_EVIDENCE'
  | 'STRONG_CANDIDATE'
  | 'CANDIDATE_WITH_CONDITIONS'
  | 'MAJOR_CONSTRAINTS'

export type ZoningScenarioPath = 'P' | 'A' | 'S' | 'C' | 'NOT_PERMITTED' | 'UNKNOWN'

export type FloodCategory = 'OUTSIDE' | '0.2_PERCENT' | 'SFHA' | 'FLOODWAY'

/** Optional verified evidence collected by the v2 GIS/rules pipeline. */
export type LdesEvidence = {
  cityVerified?: boolean
  polygonVerified?: boolean
  allZoningDistrictsVerified?: boolean
  overlayHandled?: boolean
  scenarioPath?: ZoningScenarioPath
  scenarioId?: string
  targetUnits?: number
  slopeOverlapPct?: number
  landslideIntersects?: boolean
  underminedIntersects?: boolean
  floodCategory?: FloodCategory
  environmentalQueriesSuccessful?: boolean
  historicQueriesSuccessful?: boolean
  historicDistrict?: boolean
  individualHistoricSite?: boolean
  activeViolation?: boolean
  activeCondemned?: boolean
  potential?: {
    capacityLowerBound: number
    capacityUpperBound: number
    criticalInputsComplete: boolean
    assumptions?: string[]
  }
}

export type JevEvidenceCandidate = {
  parcelId: string
  recordId: string
  sourceUrl: string
  recordDate: string | null
  category: 'permit' | 'zba' | 'violation' | 'other'
  issueCode: string | null
  excerpt: string
  confidence: number
  modelVersion: string
  requiresHumanReview: true
}
