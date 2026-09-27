import type { Barrier, CriticalFlag, LdesEvidence, Rag } from '../types'
import { makeDriver } from './constants'
import { worstSuitability } from './combine'
import { effectiveOverlap } from './geometry'

export function scoreHistoric(evidence: LdesEvidence): {
  rag: Rag
  flags: CriticalFlag[]
  drivers: Barrier[]
  context: Barrier[]
  missing: string[]
} {
  const flags: CriticalFlag[] = []
  const drivers: Barrier[] = []
  const context: Barrier[] = []
  const missing: string[] = []

  if (evidence.violationQueryStatus === 'FAILED' || evidence.historicQueriesSuccessful === false) {
    missing.push('historic district/site and violation queries')
    return { rag: 'UNRATED', flags, drivers, context, missing }
  }

  const rags: Rag[] = ['GREEN']

  const districtOverlap = effectiveOverlap(evidence.historicDistrictOverlap)
  const siteOverlap = effectiveOverlap(evidence.historicSiteOverlap)
  if (districtOverlap.sliver || siteOverlap.sliver) {
    context.push(
      makeDriver({
        id: 'POSSIBLE_BOUNDARY_SLIVER',
        kind: 'context',
        factor: 'historic_sliver',
        title: 'Possible historic polygon sliver',
        detail: 'A tiny historic-layer overlap is below the versioned engineering denoising threshold and is treated as no intersection.',
        nextStep: 'Confirm the clip if historic designation could change.',
        observedValue: 'sliver',
        field: 'historicDistrictOverlap',
      }),
    )
  }

  const inHistoricDistrict = Boolean(evidence.historicDistrict) && !districtOverlap.sliver && (evidence.historicDistrictOverlap ? districtOverlap.overlapPct > 0 : true)
  const onHistoricSite = Boolean(evidence.individualHistoricSite) && !siteOverlap.sliver && (evidence.historicSiteOverlap ? siteOverlap.overlapPct > 0 : true)

  if (inHistoricDistrict) {
    rags.push('AMBER')
    drivers.push(
      makeDriver({
        id: 'historic-district',
        factor: 'historic_district',
        title: 'Historic district',
        detail: 'Historic review may add design and approval requirements.',
        nextStep: 'Confirm historic district design review before locking a prototype.',
        observedValue: 'true',
        rag: 'AMBER',
        field: 'historicDistrict',
      }),
    )
  }
  if (onHistoricSite) {
    rags.push('AMBER')
    drivers.push(
      makeDriver({
        id: 'historic-site',
        factor: 'individual_historic_site',
        title: 'Individual historic site',
        detail: 'The individual site designation requires additional historic review.',
        nextStep: 'Confirm individual landmark obligations.',
        observedValue: 'true',
        rag: 'AMBER',
        field: 'individualHistoricSite',
      }),
    )
  }
  if (evidence.activeViolation) {
    rags.push('AMBER')
    drivers.push(
      makeDriver({
        id: 'active-violation',
        factor: 'active_violation',
        title: 'Active unresolved violation',
        detail: 'Resolve or verify the violation before relying on redevelopment assumptions.',
        nextStep: 'Check PLI status and close-out requirements.',
        observedValue: 'true',
        rag: 'AMBER',
        field: 'activeViolation',
      }),
    )
  }
  if (evidence.activeCondemned) {
    rags.push('RED')
    flags.push('ACTIVE_CONDEMNED_STATUS')
    drivers.push(
      makeDriver({
        id: 'ACTIVE_CONDEMNED_STATUS',
        factor: 'active_condemned',
        title: 'Active condemned status',
        detail: 'A condemned status is a major existing-condition constraint requiring official review.',
        nextStep: 'Confirm condemned status with the city before any reuse assumption.',
        observedValue: 'true',
        rag: 'RED',
        field: 'activeCondemned',
      }),
    )
  }
  const closed = evidence.closedViolationCount ?? 0
  if (closed > 0 || evidence.closedViolationSummary) {
    context.push(
      makeDriver({
        id: 'CLOSED_VIOLATION',
        kind: 'context',
        factor: 'closed_violations',
        title: 'Closed PLI history',
        detail: `${evidence.closedViolationSummary ?? `${closed} closed/resolved PLI records`}. Closed records do not change the RAG; the site is not a blank compliance file.`,
        nextStep: 'Review recent closed case types before relying on a clean-site assumption.',
        observedValue: String(closed || evidence.closedViolationSummary),
        field: 'closedViolationCount',
      }),
    )
  }

  return { rag: worstSuitability(rags), flags, drivers, context, missing }
}
