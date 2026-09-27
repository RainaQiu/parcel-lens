/** Deterministic LDES v2.2 RAG scoring. See docs and Ease_Score_Upgrade_and_Test_Cases.md. */
import { combineEaseScore, worstSuitability } from './ldes/combine'
import { RULE_VERSION, SCORE_VERSION, uniqueFlags } from './ldes/constants'
import { scoreEnvironment } from './ldes/environment'
import { scoreHistoric } from './ldes/historic'
import { scorePotential } from './ldes/potential'
import { scoreZoning } from './ldes/zoning'
import type {
  Barrier,
  CriticalFlag,
  EvidenceConfidence,
  LdesEvidence,
  ParcelScore,
  Rag,
  SelectedParcel,
} from './types'

function parcelId(selected: SelectedParcel, evidence?: LdesEvidence): string | null {
  return (
    evidence?.parcelId ??
    selected.assessment?.PARID ??
    selected.feature.properties.PIN ??
    selected.feature.properties.MAPBLOCKLOT ??
    null
  )
}

function gateUnrated(evidence: LdesEvidence | undefined): { missing: string[]; confidence: EvidenceConfidence } | null {
  if (!evidence) return { missing: ['LDES evidence'], confidence: 'NOT_RATED' }
  const missing: string[] = []
  if (evidence.parcelMatchCount === 0) missing.push('unique parcel_id match')
  if ((evidence.parcelMatchCount ?? 1) > 1) missing.push('unique parcel_id (multiple matches)')
  if (evidence.cityVerified === false) missing.push('Pittsburgh city boundary verification')
  if (evidence.parcelGeometry === 'CENTROID_ONLY' || evidence.parcelGeometry === 'BBOX' || evidence.polygonVerified === false) {
    missing.push('verified parcel polygon')
  }
  if (!missing.length) return null
  return { missing, confidence: 'NOT_RATED' }
}

function evidenceConfidence(evidence: LdesEvidence, missing: string[], flags: CriticalFlag[]): EvidenceConfidence {
  if (missing.length || flags.includes('UNRESOLVED_GEOMETRY_BOUNDARY')) return 'NOT_RATED'
  if (evidence.geometryMethod === 'BBOX' || evidence.geometryMethod === 'CENTROID') return 'LOW'
  if (evidence.assessmentGeometryType === 'DEVELOPMENT_ENVELOPE' && (evidence.geometryMethod ?? 'TRUE_POLYGON_CLIP') === 'TRUE_POLYGON_CLIP') {
    return 'HIGH'
  }
  return 'MEDIUM'
}

function emptyDimension(missing: string[]): {
  rag: Rag
  flags: CriticalFlag[]
  drivers: Barrier[]
  context: Barrier[]
  missing: string[]
} {
  return { rag: 'UNRATED', flags: [], drivers: [], context: [], missing }
}

export function scoreEvidence(evidence: LdesEvidence, opts?: { assessedAt?: string; parcelId?: string | null }): ParcelScore {
  const assessedAt = opts?.assessedAt ?? new Date().toISOString()
  const id = opts?.parcelId ?? evidence.parcelId ?? null
  const gated = gateUnrated(evidence)
  const zoning = gated ? emptyDimension(gated.missing) : scoreZoning(evidence)
  const env = gated
    ? {
        ...emptyDimension(gated.missing),
        slopeRag: 'UNRATED' as Rag,
        landslideRag: 'UNRATED' as Rag,
        underminedRag: 'UNRATED' as Rag,
        floodRag: 'UNRATED' as Rag,
      }
    : scoreEnvironment(evidence)
  const historic = gated ? emptyDimension(gated.missing) : scoreHistoric(evidence)
  const potential = gated ? emptyDimension(gated.missing) : scorePotential(evidence)

  const missing = [
    ...(gated?.missing ?? []),
    ...zoning.missing,
    ...env.missing,
    ...historic.missing,
    ...potential.missing,
  ]
  const confidenceMissing = [...(gated?.missing ?? []), ...zoning.missing, ...env.missing, ...historic.missing]
  const flags = uniqueFlags([...zoning.flags, ...env.flags, ...historic.flags, ...potential.flags])
  const drivers = [...zoning.drivers, ...env.drivers, ...historic.drivers, ...potential.drivers]
  const contextDrivers = [...zoning.context, ...env.context, ...historic.context]
  const suitabilityRag = worstSuitability([zoning.rag, env.rag, historic.rag])
  const combined = combineEaseScore({
    suitabilityRag,
    developmentPotentialRag: potential.rag,
    useVarianceRequired: flags.includes('USE_VARIANCE_REQUIRED'),
  })
  const screeningResult = evidence.scenarioId == null
    ? combined.easeScore === 'GREEN' ? 'SCREENING_PATH_FOUND'
      : combined.easeScore === 'AMBER' ? 'SCREENING_REVIEW_REQUIRED'
        : combined.easeScore === 'RED' && zoning.rag === 'RED' ? 'NO_LISTED_HOUSING_PATH'
          : combined.overallResult
    : combined.overallResult
  const confidence = gated?.confidence ?? evidenceConfidence(evidence, confidenceMissing, flags)

  return {
    scoreVersion: SCORE_VERSION,
    scoringMethod: 'RAG',
    parcelId: id,
    scenarioId: evidence.scenarioId ?? null,
    scope: 'parcel_screening',
    ruleVersion: evidence.ruleVersion ?? RULE_VERSION,
    dataAsOf: evidence.dataAsOf ?? null,
    assessedAt,
    scoreStatus: combined.easeScore === 'UNRATED' ? 'INSUFFICIENT_DATA' : 'ASSESSED',
    zoningRag: zoning.rag,
    environmentalGeotechnicalRag: env.rag,
    historicConditionRag: historic.rag,
    suitabilityRag,
    developmentPotentialRag: potential.rag,
    easeScore: combined.easeScore,
    overallResult: screeningResult,
    evidenceConfidence: confidence,
    criticalFlags: flags,
    drivers,
    contextDrivers,
    missingRequired: [...new Set(missing)],
    assumptions: evidence.potential?.assumptions ?? [],
    availabilityStatus: 'NOT_ASSESSED',
    financialFeasibilityStatus: 'NOT_ASSESSED',
    deliveryTimingStatus: 'NOT_ASSESSED',
    slopeRag: env.slopeRag,
    landslideRag: env.landslideRag,
    underminedRag: env.underminedRag,
    floodRag: env.floodRag,
    intersectingDistricts: evidence.districts ?? [],
    overlays: evidence.overlays ?? [],
    housingPathways: evidence.housingPathways ?? [],
  }
}

export function scoreParcel(selected: SelectedParcel): ParcelScore {
  return scoreEvidence(selected.ldes ?? {}, { parcelId: parcelId(selected, selected.ldes) })
}

export function scoreSummary(result: ParcelScore): string {
  if (result.easeScore === 'UNRATED') {
    const gap = result.missingRequired.find((item) => !/^(SETBACKS|COVERAGE|HEIGHT_FAR|PARKING|OPEN_SPACE|ACCESS|OVERLAY_DIMENSIONS)$/i.test(item))
    return `NEEDS FURTHER EVIDENCE — ${gap ?? result.missingRequired[0] ?? 'required evidence is missing'}.`
  }
  const scored = result.drivers.slice(0, 2).map((item) => item.title.toLowerCase())
  const extra = scored.length ? ` Main drivers: ${scored.join(' and ')}.` : ''
  const potentialNote =
    result.developmentPotentialRag === 'UNRATED'
      ? ' Headline uses rated suitability only; development potential is still unrated pending setbacks, coverage, height/FAR, parking, and access. Not a permit.'
      : ''
  return `Parcel screening ${result.easeScore}: zoning ${result.zoningRag}, environmental ${result.environmentalGeotechnicalRag}, historic ${result.historicConditionRag}.${extra}${potentialNote}`
}

export { combineEaseScore } from './ldes/combine'
export { computeCapacity } from './ldes/potential'
export { RULE_VERSION, SCORE_VERSION }
