import { lookupHousingPathways, splitZoning } from './housingPathways'
import { USE_TABLE_RULE_VERSION } from '../data/pittsburgh-use-pathways-v1'
import type { AssessmentRow, HousingScenarioId, LdesEvidence, LdesLayerFacts, ParcelFeature } from './types'

export const DEFAULT_SCENARIO: null = null

export { splitZoning }

export function applyScenario(
  layers: LdesLayerFacts,
  _scenarioId: HousingScenarioId | null = DEFAULT_SCENARIO,
  _assessment: AssessmentRow | null,
  _feature: ParcelFeature,
): LdesEvidence {
  const overlays = layers.overlays ?? []
  const overlayPresent = overlays.length > 0
  const lookupCodes = (layers.districts ?? []).length > 0 ? layers.districts ?? [] : overlays
  const housingPathways = lookupHousingPathways(lookupCodes)
  const verified = housingPathways.some((row) => row.reviewStatus === 'verified')
  return {
    ...layers,
    scenarioId: _scenarioId,
    useTableRuleVersion: USE_TABLE_RULE_VERSION,
    pathwayVerified: verified,
    pathwaySource: verified ? 'verified-use-table' : 'letter-group-heuristic',
    overlayPresent,
    overlayHandled: overlayPresent
      ? Boolean(layers.overlayRulesApplied || layers.overlayWrittenExclusion)
      : true,
    overlayDimensionsHandled: overlayPresent ? false : true,
    housingPathways,
    districtKeys: layers.districtKeys,
    potential: {
      criticalInputsComplete: false,
      minLotHeuristicOnly: true,
      presentInputs: ['PARCEL_AREA', 'MIN_LOT_AREA'],
      missingInputs: overlayPresent
        ? ['SETBACKS', 'COVERAGE', 'HEIGHT_FAR', 'PARKING', 'OPEN_SPACE', 'OVERLAY_DIMENSIONS', 'ACCESS']
        : ['SETBACKS', 'COVERAGE', 'HEIGHT_FAR', 'PARKING', 'OPEN_SPACE', 'ACCESS'],
      assumptions: [
        'Setbacks, coverage, height/FAR, parking, open space, overlay dimensions, and access are not yet applied.',
        'Housing pathway colors describe §911.02 base-district use listing only, not permits, bulk, parking, or overall development ease.',
      ],
    },
  }
}
