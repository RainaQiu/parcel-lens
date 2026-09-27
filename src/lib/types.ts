export type ParcelProperties = {
  PIN?: string
  MAPBLOCKLOT?: string
  MUNICODE?: number
  CALCACREAGE?: number
  MODIFIEDON?: string | null
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
  TAXYEAR?: number | string | null
  ASOFDATE?: string | null
}

export type ZoningInfo = {
  code: string
  description: string
  definitionUrl: string | null
  updatedAt: string | null
}

export type SearchHit = {
  PARID: string
  PROPERTYHOUSENUM?: string | number | null
  PROPERTYADDRESS?: string | null
  PROPERTYCITY?: string | null
  PROPERTYZIP?: string | number | null
  MUNIDESC?: string | null
}

export type HousingScenarioId = 'sf-1' | 'duplex-2' | 'fourplex-4' | 'multi-8'

export type Rag = 'GREEN' | 'AMBER' | 'RED' | 'UNRATED'

export type EvidenceConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_RATED'

export type ScoringMethod = 'RAG'

export type ScoreVersion = 'LDES-v2.3-parcel-screen'

export type GeometryMethod = 'TRUE_POLYGON_CLIP' | 'BBOX' | 'CENTROID'

export type AssessmentGeometryType = 'DEVELOPMENT_ENVELOPE' | 'PARCEL'

export type ParcelGeometryKind = 'POLYGON' | 'CENTROID_ONLY' | 'BBOX'

export type CriticalFlag =
  | 'USE_VARIANCE_REQUIRED'
  | 'REGULATORY_FLOODWAY_AFFECTS_SITE'
  | 'ACTIVE_CONDEMNED_STATUS'
  | 'MULTIPLE_GEOTECHNICAL_HAZARDS'
  | 'MAJORITY_STEEP_SLOPE'
  | 'SCENARIO_CAPACITY_SHORTFALL'
  | 'MULTIPLE_BASE_ZONING_DISTRICTS'
  | 'UNRESOLVED_GEOMETRY_BOUNDARY'

export type OverallResult =
  | 'CURRENT_SCENARIO_REQUIRES_VARIANCE'
  | 'SELECTED_SCENARIO_DOES_NOT_FIT'
  | 'NEEDS_FURTHER_EVIDENCE'
  | 'STRONG_CANDIDATE'
  | 'CANDIDATE_WITH_CONDITIONS'
  | 'MAJOR_CONSTRAINTS'
  | 'SCREENING_PATH_FOUND'
  | 'SCREENING_REVIEW_REQUIRED'
  | 'NO_LISTED_HOUSING_PATH'

export type ZoningScenarioPath = 'P' | 'A' | 'S' | 'C' | 'NOT_PERMITTED' | 'P_OR_S' | 'UNKNOWN'

export type PathwaySource = 'verified-use-table' | 'letter-group-heuristic'

export type HousingUseType =
  | 'single_unit_detached'
  | 'single_unit_attached'
  | 'two_unit'
  | 'three_unit'
  | 'multi_unit'

export type UsePathway = 'P' | 'A' | 'S' | 'C' | 'NOT_PERMITTED' | 'P_OR_S' | 'UNKNOWN'

export type UsePathwayCell = {
  districtKey: string
  useType: HousingUseType
  pathway: UsePathway
  standards: string[]
  sourceUrl: string
  codeAsOf: string
  ruleVersion: string
  reviewStatus: 'verified' | 'unverified'
  verifiedAt: string
  verifiedBy: string
}

export type HousingPathwayRow = {
  useType: HousingUseType
  useLabel: string
  rawDistrict: string
  districtKey: string
  pathway: UsePathway
  rag: Rag
  standards: string[]
  sourceUrl: string
  ruleVersion: string
  codeAsOf: string | null
  verifiedAt: string | null
  reviewStatus: 'verified' | 'unverified'
  notes: string
}

export type FloodCategory = 'NONE' | 'OUTSIDE' | 'PCT_0_2' | '0.2_PERCENT' | 'SFHA' | 'FLOODWAY'

export type DriverSource = {
  name: string
  field: string
  value: string
  url?: string
  version?: string
  retrievedAt?: string
  sourceUpdatedAt?: string | null
  joinMethod?: string
}

export type SourceObservation<T> = {
  status: 'available' | 'not_found' | 'unavailable'
  value: T | null
  sourceId: string
  sourceUrl: string
  sourceUpdatedAt: string | null
  retrievedAt: string
  joinMethod: 'polygon_clip' | 'parcel_id' | 'point_lookup'
  nAReason: string | null
}

export type SourceObservations = {
  zoning?: SourceObservation<string[]>
  slope?: SourceObservation<OverlapFact>
  landslide?: SourceObservation<OverlapFact>
  undermined?: SourceObservation<OverlapFact>
  fema?: SourceObservation<FloodHit[]>
  historicDistrict?: SourceObservation<OverlapFact>
  historicSite?: SourceObservation<OverlapFact>
  violations?: SourceObservation<number>
  condemned?: SourceObservation<number>
  assessment?: SourceObservation<AssessmentRow>
}

export type Barrier = {
  id: string
  kind: 'driver' | 'context'
  factor: string
  title: string
  detail: string
  reason: string
  nextStep: string
  observedValue: string
  rag?: Rag
  severity: 'low' | 'medium' | 'high' | 'context'
  source: DriverSource
}

export type OverlapFact = {
  overlapPct: number
  parcelOverlapPct?: number
  intersectionAreaSqft: number
  parcelAreaSqft?: number
  assessmentGeometryType?: AssessmentGeometryType
  assessmentGeometryArea?: number
  assessmentOverlapArea?: number
  assessmentOverlapPct?: number
  geometryMethod?: GeometryMethod
  geometryVersion?: string
}

export type FloodHit = {
  category: FloodCategory
  overlapPct: number
  intersectionAreaSqft: number
}

export type SelectedParcel = {
  feature: ParcelFeature
  assessment: AssessmentRow | null
  zoning: ZoningInfo | null
  ldesLayers?: LdesLayerFacts
  scenarioId?: HousingScenarioId
  ldes?: LdesEvidence
}

export type LdesLayerFacts = {
  sources?: SourceObservations
  cityVerified?: boolean
  polygonVerified?: boolean
  parcelMatchCount?: number
  parcelGeometry?: ParcelGeometryKind
  allZoningDistrictsVerified?: boolean
  overlayPresent?: boolean
  overlayHandled?: boolean
  overlayRulesApplied?: boolean
  overlayWrittenExclusion?: boolean
  overlayDimensionsHandled?: boolean
  districts?: string[]
  districtKeys?: string[]
  overlays?: string[]
  assessmentGeometryType?: AssessmentGeometryType
  geometryMethod?: GeometryMethod
  geometryVersion?: string
  slope?: OverlapFact
  landslide?: OverlapFact
  undermined?: OverlapFact
  slopeOverlapPct?: number
  landslideOverlapPct?: number
  underminedOverlapPct?: number
  floodHits?: FloodHit[]
  floodCategory?: FloodCategory
  floodOverlapPct?: number
  floodIntersectionAreaSqft?: number
  environmentalQueriesSuccessful?: boolean
  femaQueryStatus?: 'OK' | 'FAILED'
  historicQueriesSuccessful?: boolean
  violationQueryStatus?: 'OK' | 'FAILED'
  historicDistrict?: boolean
  individualHistoricSite?: boolean
  historicDistrictOverlap?: OverlapFact
  historicSiteOverlap?: OverlapFact
  activeViolation?: boolean
  activeCondemned?: boolean
  closedViolationCount?: number
  closedViolationSummary?: string
  occupiedImproved?: boolean
  useDescription?: string
  classDescription?: string
  dataAsOf?: string
  retrievedAt?: string
}

export type CapacityInputs = {
  parcelArea?: number
  hardExclusionArea?: number
  setbackEnvelopeArea?: number
  maxLotCoverage?: number
  maxHeight?: number
  assumedFloorToFloor?: number
  zoningStoryCap?: number
  maxFar?: number
  parkingArea?: number
  accessArea?: number
  requiredOpenSpaceEffect?: number
  commonCirculationArea?: number
  assumedGrossAreaPerUnit?: number
}

export type LdesEvidence = LdesLayerFacts & {
  parcelId?: string | null
  scenarioPath?: ZoningScenarioPath
  districtPathways?: ZoningScenarioPath[]
  scenarioId?: HousingScenarioId | null
  useTableRuleVersion?: string
  targetUnits?: number
  ruleVersion?: string
  pathwayVerified?: boolean
  pathwaySource?: PathwaySource
  zoningOverlap?: OverlapFact & { pathwayIfApplied?: ZoningScenarioPath }
  housingPathways?: HousingPathwayRow[]
  districtKeys?: string[]
  potential?: {
    capacityLowerBound?: number
    capacityUpperBound?: number
    criticalInputsComplete?: boolean
    minLotHeuristicOnly?: boolean
    missingInputs?: string[]
    presentInputs?: string[]
    assumptions?: string[]
    inputs?: CapacityInputs
  }
}

export type ParcelScore = {
  scoreVersion: ScoreVersion
  scoringMethod: ScoringMethod
  parcelId: string | null
  scenarioId: HousingScenarioId | null
  scope: 'parcel_screening'
  ruleVersion: string
  dataAsOf: string | null
  assessedAt: string
  scoreStatus: 'ASSESSED' | 'INSUFFICIENT_DATA'
  zoningRag: Rag
  environmentalGeotechnicalRag: Rag
  historicConditionRag: Rag
  suitabilityRag: Rag
  developmentPotentialRag: Rag
  easeScore: Rag
  overallResult: OverallResult
  evidenceConfidence: EvidenceConfidence
  criticalFlags: CriticalFlag[]
  drivers: Barrier[]
  contextDrivers: Barrier[]
  missingRequired: string[]
  assumptions: string[]
  availabilityStatus: 'NOT_ASSESSED'
  financialFeasibilityStatus: 'NOT_ASSESSED'
  deliveryTimingStatus: 'NOT_ASSESSED'
  slopeRag: Rag
  landslideRag: Rag
  underminedRag: Rag
  floodRag: Rag
  intersectingDistricts: string[]
  overlays: string[]
  housingPathways: HousingPathwayRow[]
}
