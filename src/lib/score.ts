/** Deterministic LDES v2.0 scoring. See docs/Development_Ease_Score.md. */
import type {
  Barrier,
  DevelopmentPotentialBand,
  LdesEvidence,
  OverallResult,
  ParcelScore,
  SelectedParcel,
  SuitabilityBand,
  ZoningScenarioPath,
} from './types'

const UNSCORED = [
  'Availability: owner willingness, site control, title, and tenancy',
  'Achievability / financial feasibility: price, comps, costs, and financing',
  'Delivery timing: approvals, clearance, financing, and construction schedule',
]

const PATH_POINTS: Record<ZoningScenarioPath, number> = {
  P: 45,
  A: 35,
  S: 23,
  C: 15,
  NOT_PERMITTED: 0,
  UNKNOWN: 0,
}

function source(field: string, value: string) {
  return { name: 'LDES v2 evidence', field, value }
}

function driver(
  id: string,
  title: string,
  detail: string,
  penalty: number,
  field: string,
  value: string,
  severity: Barrier['severity'] = penalty >= 20 ? 'high' : penalty >= 10 ? 'medium' : 'low',
): Barrier {
  return { id, title, detail, penalty, severity, source: source(field, value) }
}

function parcelId(selected: SelectedParcel): string | null {
  return selected.assessment?.PARID ?? selected.feature.properties.PIN ?? selected.feature.properties.MAPBLOCKLOT ?? null
}

function suitabilityBand(score: number): SuitabilityBand {
  return score >= 80 ? 'green' : score >= 60 ? 'amber' : 'red'
}

function potentialBand(evidence: LdesEvidence): DevelopmentPotentialBand {
  const potential = evidence.potential
  const target = evidence.targetUnits
  if (!potential || target === undefined || !potential.criticalInputsComplete) return 'unknown'
  if (potential.capacityLowerBound >= target) return 'green'
  if (potential.capacityUpperBound >= target) return 'amber'
  return 'red'
}

function missingRequired(selected: SelectedParcel, evidence: LdesEvidence | undefined): string[] {
  const missing: string[] = []
  if (!parcelId(selected)) missing.push('unique parcel_id')
  if (!evidence?.cityVerified) missing.push('Pittsburgh city boundary verification')
  if (!evidence?.polygonVerified) missing.push('verified parcel polygon')
  if (!evidence?.allZoningDistrictsVerified) missing.push('all intersecting zoning districts')
  if (!evidence?.overlayHandled) missing.push('zoning overlay handling')
  if (!evidence?.scenarioId || evidence.scenarioPath === undefined) missing.push('selected housing scenario and zoning pathway')
  if (!evidence?.environmentalQueriesSuccessful) missing.push('slope, landslide, undermined, and FEMA queries')
  if (!evidence?.historicQueriesSuccessful) missing.push('historic district/site queries')
  if (evidence?.activeViolation === undefined || evidence.activeCondemned === undefined) {
    missing.push('violation and condemned queries')
  }
  return missing
}

function zoningDriver(path: ZoningScenarioPath): Barrier | null {
  if (path === 'P') return null
  if (path === 'UNKNOWN') {
    return driver('zoning-unverified', 'Zoning pathway not verified', 'The selected scenario cannot be scored until district and use-table rules are verified.', 0, 'scenarioPath', 'UNKNOWN', 'high')
  }
  if (path === 'NOT_PERMITTED') {
    return driver('zoning-hard-stop', 'Current scenario is not permitted', 'The selected scenario requires a different pathway or use variance; this is a hard stop for the current scenario.', 45, 'scenarioPath', path, 'high')
  }
  return driver('zoning-pathway', `${path} zoning pathway`, 'The selected scenario may proceed only through the identified additional review pathway; approval is not guaranteed.', 45 - PATH_POINTS[path], 'scenarioPath', path)
}

function environmentalDrivers(evidence: LdesEvidence): { points: number; barriers: Barrier[] } {
  const barriers: Barrier[] = []
  const slope = evidence.slopeOverlapPct ?? 0
  const slopePenalty = slope <= 0 ? 0 : slope <= 10 ? 4 : slope <= 30 ? 8 : 12
  if (slopePenalty > 0) barriers.push(driver('slope', 'Steep-slope overlap', `${slope}% of the checked area overlaps the 25%+ slope layer.`, slopePenalty, 'slopeOverlapPct', `${slope}%`))
  const landslidePenalty = evidence.landslideIntersects ? 10 : 0
  if (landslidePenalty) barriers.push(driver('landslide', 'Landslide-prone area overlap', 'Professional geotechnical review is needed before relying on this result.', landslidePenalty, 'landslideIntersects', 'true'))
  const underminedPenalty = evidence.underminedIntersects ? 10 : 0
  if (underminedPenalty) barriers.push(driver('undermined', 'Undermined area overlap', 'Historical mine information is a screening flag, not a structural safety conclusion.', underminedPenalty, 'underminedIntersects', 'true'))
  const terrainPenalty = Math.min(25, slopePenalty + landslidePenalty + underminedPenalty)
  const floodPenalty = evidence.floodCategory === 'FLOODWAY' ? 15 : evidence.floodCategory === 'SFHA' ? 10 : evidence.floodCategory === '0.2_PERCENT' ? 4 : 0
  if (floodPenalty) barriers.push(driver('flood', 'FEMA flood-hazard overlap', 'Use the latest FEMA NFHL classification and obtain formal floodplain review when applicable.', floodPenalty, 'floodCategory', evidence.floodCategory ?? 'unknown'))
  return { points: Math.max(0, 40 - terrainPenalty - floodPenalty), barriers }
}

function historicDrivers(evidence: LdesEvidence): { points: number; barriers: Barrier[] } {
  const barriers: Barrier[] = []
  let penalty = 0
  if (evidence.historicDistrict) {
    penalty += 6
    barriers.push(driver('historic-district', 'Historic district', 'Historic review may add design and approval requirements.', 6, 'historicDistrict', 'true'))
  }
  if (evidence.individualHistoricSite) {
    penalty += 10
    barriers.push(driver('historic-site', 'Individual historic site', 'The individual site designation requires additional historic review.', 10, 'individualHistoricSite', 'true'))
  }
  if (evidence.activeViolation) {
    penalty += 5
    barriers.push(driver('active-violation', 'Active unresolved violation', 'Resolve or verify the violation before relying on redevelopment assumptions.', 5, 'activeViolation', 'true'))
  }
  if (evidence.activeCondemned) {
    penalty += 15
    barriers.push(driver('condemned', 'Active condemned status', 'A condemned status is a major existing-condition constraint requiring official review.', 15, 'activeCondemned', 'true', 'high'))
  }
  const cappedPenalty = Math.min(15, penalty)
  return { points: 15 - cappedPenalty, barriers }
}

export function scoreParcel(selected: SelectedParcel): ParcelScore {
  const evidence = selected.ldes
  const missing = missingRequired(selected, evidence)
  const base: Omit<ParcelScore, 'score' | 'band' | 'barriers' | 'suitabilityScore' | 'suitabilityBand' | 'developmentPotentialBand' | 'overallResult' | 'missingRequired' | 'assumptions'> = {
    scoreVersion: 'LDES-v2.0',
    scoreStatus: 'INSUFFICIENT_DATA',
    unscored: UNSCORED,
    availabilityStatus: 'NOT_ASSESSED',
    financialFeasibilityStatus: 'NOT_ASSESSED',
    deliveryTimingStatus: 'NOT_ASSESSED',
  }

  if (!evidence || missing.length > 0 || evidence.scenarioPath === undefined || evidence.scenarioPath === 'UNKNOWN') {
    const barriers = missing.map((item, index) => driver(`missing-${index}`, 'Required evidence missing', item, 0, 'missing_required', item, 'high'))
    return {
      ...base,
      score: null,
      band: 'unrated',
      barriers,
      suitabilityScore: null,
      suitabilityBand: 'unrated',
      developmentPotentialBand: evidence ? potentialBand(evidence) : 'unknown',
      overallResult: null,
      missingRequired: missing,
      assumptions: evidence?.potential?.assumptions ?? [],
    }
  }

  const zoningPoints = PATH_POINTS[evidence.scenarioPath]
  const zoningBarrier = zoningDriver(evidence.scenarioPath)
  const environmental = environmentalDrivers(evidence)
  const historic = historicDrivers(evidence)
  const score = zoningPoints + environmental.points + historic.points
  const suitability = suitabilityBand(score)
  const potential = potentialBand(evidence)
  const hardStop = evidence.scenarioPath === 'NOT_PERMITTED'
  const overall: OverallResult = hardStop
    ? 'CURRENTLY_UNSUITABLE'
    : potential === 'red'
      ? 'SELECTED_SCENARIO_DOES_NOT_FIT'
      : potential === 'unknown'
        ? 'NEEDS_FURTHER_EVIDENCE'
        : suitability === 'green' && potential === 'green'
          ? 'STRONG_CANDIDATE'
          : suitability !== 'red' && (suitability === 'amber' || potential === 'amber')
            ? 'CANDIDATE_WITH_CONDITIONS'
            : 'MAJOR_CONSTRAINTS'
  const barriers = [zoningBarrier, ...environmental.barriers, ...historic.barriers].filter((item): item is Barrier => item !== null)
  return {
    ...base,
    score: hardStop ? Math.min(score, 49) : score,
    band: suitability === 'green' ? 'easier' : suitability === 'amber' ? 'mixed' : 'harder',
    barriers: barriers.sort((a, b) => b.penalty - a.penalty),
    suitabilityScore: hardStop ? Math.min(score, 49) : score,
    suitabilityBand: suitability,
    developmentPotentialBand: potential,
    overallResult: overall,
    missingRequired: [],
    assumptions: evidence.potential?.assumptions ?? [],
    scoreStatus: 'ASSESSED',
  }
}

export function scoreSummary(result: ParcelScore): string {
  if (result.scoreStatus === 'INSUFFICIENT_DATA') {
    return `LDES v2 is unrated because ${result.missingRequired.length} required evidence item(s) are missing. Availability, financial feasibility, and delivery timing are not assessed.`
  }
  const top = result.barriers.slice(0, 2)
  const details = top.length ? ` Main drivers: ${top.map((item) => item.title.toLowerCase()).join(' and ')}.` : ' No scored suitability drivers were flagged.'
  return `${result.overallResult?.replaceAll('_', ' ') ?? 'Screened'} — Suitability ${result.suitabilityBand}.${details} Availability, financial feasibility, and delivery timing are not assessed.`
}
