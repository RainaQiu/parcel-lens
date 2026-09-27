import { describe, expect, it } from 'vitest'
import suite from './fixtures/ease_score_test_cases.json'
import { combineEaseScore, scoreEvidence } from '../score'
import type { FloodHit, LdesEvidence, ParcelScore, Rag, ZoningScenarioPath } from '../types'

type CaseInput = Record<string, unknown>
type CaseExpect = Record<string, unknown>
type SuiteCase = { id: string; input: CaseInput; expect: CaseExpect }

const ASSESSED_AT = '2026-09-26T00:00:00.000Z'

function completeEvidence(): LdesEvidence {
  return {
    parcelId: 'TEST-1',
    parcelMatchCount: 1,
    cityVerified: true,
    polygonVerified: true,
    parcelGeometry: 'POLYGON',
    overlayPresent: false,
    overlayHandled: true,
    overlayDimensionsHandled: true,
    pathwayVerified: true,
    pathwaySource: 'verified-use-table',
    scenarioPath: 'P',
    districtPathways: ['P'],
    scenarioId: 'fourplex-4',
    targetUnits: 4,
    environmentalQueriesSuccessful: true,
    femaQueryStatus: 'OK',
    historicQueriesSuccessful: true,
    violationQueryStatus: 'OK',
    slopeOverlapPct: 0,
    landslideOverlapPct: 0,
    underminedOverlapPct: 0,
    floodCategory: 'NONE',
    floodOverlapPct: 0,
    floodIntersectionAreaSqft: 0,
    historicDistrict: false,
    individualHistoricSite: false,
    activeViolation: false,
    activeCondemned: false,
    assessmentGeometryType: 'PARCEL',
    geometryMethod: 'TRUE_POLYGON_CLIP',
    potential: {
      capacityLowerBound: 4,
      capacityUpperBound: 6,
      criticalInputsComplete: true,
      minLotHeuristicOnly: false,
      presentInputs: ['SETBACKS', 'COVERAGE', 'HEIGHT_FAR', 'PARKING', 'OPEN_SPACE', 'OVERLAY_DIMENSIONS', 'ACCESS'],
    },
  }
}

function evidenceFrom(input: CaseInput): LdesEvidence {
  const evidence = completeEvidence()
  if (input.parcel_match_count !== undefined) evidence.parcelMatchCount = Number(input.parcel_match_count)
  if (input.inside_pittsburgh === false) evidence.cityVerified = false
  if (input.parcel_geometry === 'CENTROID_ONLY') {
    evidence.parcelGeometry = 'CENTROID_ONLY'
    evidence.polygonVerified = false
  }
  if (input.overlay_present === true) evidence.overlayPresent = true
  if (input.overlay_handled === false) evidence.overlayHandled = false
  if (input.overlay_dimensions_handled === false) evidence.overlayDimensionsHandled = false
  if (input.zoning_pathway_source === 'DISTRICT_PREFIX_HEURISTIC') {
    evidence.pathwaySource = 'letter-group-heuristic'
    evidence.pathwayVerified = false
  }
  if (input.fema_query_status === 'FAILED') {
    evidence.femaQueryStatus = 'FAILED'
    evidence.environmentalQueriesSuccessful = false
  }
  if (input.violation_query_status === 'FAILED') evidence.violationQueryStatus = 'FAILED'
  if (input.assessment_geometry_type === 'PARCEL' || input.assessment_geometry_type === 'DEVELOPMENT_ENVELOPE') {
    evidence.assessmentGeometryType = input.assessment_geometry_type
  }
  if (typeof input.zoning_pathway === 'string') {
    evidence.scenarioPath = input.zoning_pathway as ZoningScenarioPath
    evidence.districtPathways = [input.zoning_pathway as ZoningScenarioPath]
  }
  if (Array.isArray(input.district_pathways)) {
    evidence.districtPathways = input.district_pathways as ZoningScenarioPath[]
    evidence.districts = evidence.districtPathways.map((_, index) => `D${index + 1}`)
  }
  if (input.zoning_overlap_pct !== undefined) {
    evidence.zoningOverlap = {
      overlapPct: Number(input.zoning_overlap_pct),
      intersectionAreaSqft: Number(input.intersection_area_sqft ?? 5),
      pathwayIfApplied: (input.pathway_if_applied as ZoningScenarioPath) ?? 'S',
    }
  }
  if (input.slope_overlap_pct !== undefined) evidence.slopeOverlapPct = Number(input.slope_overlap_pct)
  if (input.landslide_overlap_pct !== undefined) evidence.landslideOverlapPct = Number(input.landslide_overlap_pct)
  if (input.undermined_overlap_pct !== undefined) evidence.underminedOverlapPct = Number(input.undermined_overlap_pct)
  if (input.constraint_type === 'LANDSLIDE') {
    evidence.landslide = {
      overlapPct: Number(input.constraint_overlap_pct),
      intersectionAreaSqft: Number(input.intersection_area_sqft ?? 5),
    }
  }
  if (typeof input.flood_category === 'string') evidence.floodCategory = input.flood_category as LdesEvidence['floodCategory']
  if (input.flood_overlap_pct !== undefined) evidence.floodOverlapPct = Number(input.flood_overlap_pct)
  if (input.intersection_area_sqft !== undefined && input.flood_category) {
    evidence.floodIntersectionAreaSqft = Number(input.intersection_area_sqft)
  }
  if (Array.isArray(input.flood_hits)) {
    evidence.floodHits = (input.flood_hits as Array<Record<string, unknown>>).map((hit) => ({
      category: hit.category as FloodHit['category'],
      overlapPct: Number(hit.overlap_pct ?? hit.overlapPct ?? 0),
      intersectionAreaSqft: Number(hit.intersection_area_sqft ?? hit.intersectionAreaSqft ?? 1000),
    }))
  }
  if (input.historic_district === true) evidence.historicDistrict = true
  if (input.individual_historic_site === true) evidence.individualHistoricSite = true
  if (input.active_violation === true) evidence.activeViolation = true
  if (input.active_condemned === true) evidence.activeCondemned = true
  if (input.closed_violation === true) {
    evidence.closedViolationCount = 1
    evidence.closedViolationSummary = '1 closed PLI record'
  }
  if (Array.isArray(input.potential_inputs)) {
    evidence.potential = {
      criticalInputsComplete: false,
      minLotHeuristicOnly: true,
      presentInputs: input.potential_inputs as string[],
      missingInputs: ['SETBACKS', 'COVERAGE', 'HEIGHT_FAR', 'PARKING', 'OPEN_SPACE', 'ACCESS'],
    }
  }
  if (Array.isArray(input.missing_potential_inputs)) {
    evidence.potential = {
      ...evidence.potential,
      criticalInputsComplete: false,
      missingInputs: input.missing_potential_inputs as string[],
    }
  }
  if (Array.isArray(input.capacity_range)) {
    const [lower, upper] = input.capacity_range as [number, number]
    evidence.potential = {
      capacityLowerBound: lower,
      capacityUpperBound: upper,
      criticalInputsComplete: true,
      minLotHeuristicOnly: false,
      presentInputs: evidence.potential?.presentInputs,
    }
  }
  if (input.amber_constraint_count === 3) {
    evidence.historicDistrict = true
    evidence.individualHistoricSite = true
    evidence.activeViolation = true
  }
  if (input.use_variance_required === true) {
    evidence.scenarioPath = 'NOT_PERMITTED'
    evidence.districtPathways = ['NOT_PERMITTED']
  }
  return evidence
}

function ragKeys(result: ParcelScore) {
  return {
    zoningRag: result.zoningRag,
    environmentalGeotechnicalRag: result.environmentalGeotechnicalRag,
    historicConditionRag: result.historicConditionRag,
    suitabilityRag: result.suitabilityRag,
    developmentPotentialRag: result.developmentPotentialRag,
    easeScore: result.easeScore,
    slopeRag: result.slopeRag,
    landslideRag: result.landslideRag,
    underminedRag: result.underminedRag,
    floodRag: result.floodRag,
    overallResult: result.overallResult,
    criticalFlags: result.criticalFlags,
  }
}

function scoreCase(input: CaseInput): ParcelScore {
  if (typeof input.suitability_rag === 'string' && typeof input.development_potential_rag === 'string') {
    const combined = combineEaseScore({
      suitabilityRag: input.suitability_rag as Rag,
      developmentPotentialRag: input.development_potential_rag as Rag,
      useVarianceRequired: input.use_variance_required === true,
    })
    const base = scoreEvidence(evidenceFrom(input), { assessedAt: ASSESSED_AT })
    return { ...base, easeScore: combined.easeScore, overallResult: combined.overallResult }
  }
  return scoreEvidence(evidenceFrom(input), { assessedAt: ASSESSED_AT })
}

function assertExpect(result: ParcelScore, expected: CaseExpect) {
  const mapping: Record<string, unknown> = {
    ease_score: result.easeScore,
    overall_result: result.overallResult,
    evidence_confidence: result.evidenceConfidence,
    zoning_rag: result.zoningRag,
    environmental_geotechnical_rag: result.environmentalGeotechnicalRag,
    historic_condition_rag: result.historicConditionRag,
    development_potential_rag: result.developmentPotentialRag,
    slope_rag: result.slopeRag,
    landslide_rag: result.landslideRag,
    undermined_rag: result.underminedRag,
    flood_rag: result.floodRag,
    availability_status: result.availabilityStatus,
    financial_feasibility_status: result.financialFeasibilityStatus,
    delivery_timing_status: result.deliveryTimingStatus,
  }
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'critical_flags') {
      for (const flag of value as string[]) expect(result.criticalFlags).toContain(flag)
      continue
    }
    if (key === 'context_drivers') {
      const ids = result.contextDrivers.map((item) => item.id)
      for (const id of value as string[]) expect(ids).toContain(id)
      continue
    }
    if (key === 'driver_count') {
      expect(result.drivers.length).toBe(value)
      continue
    }
    if (key === 'constraint_rag') {
      expect(result.landslideRag).toBe(value)
      continue
    }
    if (key === 'deterministic_result' || key === 'rag_unchanged' || key === 'old_result_preserved') continue
    if (key === 'result_not_promoted_to_red') {
      expect(result.easeScore).not.toBe('RED')
      expect(result.environmentalGeotechnicalRag).not.toBe('RED')
      expect(result.historicConditionRag).not.toBe('RED')
      continue
    }
    if (key === 'all_drivers_preserved') {
      expect(result.drivers.length).toBeGreaterThanOrEqual(3)
      continue
    }
    if (key === 'closed_history_visible') {
      expect(result.contextDrivers.some((item) => item.id === 'CLOSED_VIOLATION')).toBe(true)
      continue
    }
    if (key === 'forbidden_fields') {
      const blob = JSON.stringify(result)
      for (const field of value as string[]) expect(blob).not.toContain(`"${field}"`)
      expect('suitabilityScore' in result).toBe(false)
      expect('weightsStatus' in result).toBe(false)
      continue
    }
    expect(mapping[key], key).toBe(value)
  }
}

describe('LDES-v2.2 RAG test cases', () => {
  for (const testCase of suite.cases as SuiteCase[]) {
    it(testCase.id, () => {
      if (testCase.input.repeat_same_versions) {
        const a = scoreCase({})
        const b = scoreCase({})
        expect(ragKeys(a)).toEqual(ragKeys(b))
        expect(JSON.stringify(a)).toBe(JSON.stringify(b))
        return
      }
      if (testCase.input.only_retrieved_at_changes) {
        const a = scoreEvidence({ ...evidenceFrom({}), retrievedAt: '2026-01-01' }, { assessedAt: ASSESSED_AT })
        const b = scoreEvidence({ ...evidenceFrom({}), retrievedAt: '2026-06-01' }, { assessedAt: ASSESSED_AT })
        expect(ragKeys(a)).toEqual(ragKeys(b))
        return
      }
      if (testCase.input.rule_version_changes) {
        const store: Record<string, ParcelScore> = {}
        const oldResult = scoreEvidence({ ...evidenceFrom({}), ruleVersion: 'LDES-v2.2-rag-rules' }, { assessedAt: ASSESSED_AT })
        store[oldResult.ruleVersion] = oldResult
        const next = scoreEvidence({ ...evidenceFrom({}), ruleVersion: 'LDES-v2.2-rag-rules-next' }, { assessedAt: ASSESSED_AT })
        store[next.ruleVersion] = next
        expect(store[oldResult.ruleVersion]).toEqual(oldResult)
        expect(store[next.ruleVersion].ruleVersion).not.toBe(oldResult.ruleVersion)
        return
      }
      assertExpect(scoreCase(testCase.input), testCase.expect)
    })
  }
})
