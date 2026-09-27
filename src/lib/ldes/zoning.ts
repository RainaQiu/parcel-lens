import type { Barrier, CriticalFlag, HousingPathwayRow, LdesEvidence, Rag, ZoningScenarioPath } from '../types'
import { makeDriver } from './constants'
import { isSliver } from './geometry'

const PATH_RANK: Record<ZoningScenarioPath, number> = {
  UNKNOWN: 0,
  P: 1,
  A: 2,
  S: 3,
  C: 4,
  P_OR_S: 3,
  NOT_PERMITTED: 5,
}

const PATH_RAG: Record<Exclude<ZoningScenarioPath, 'UNKNOWN'>, Rag> = {
  P: 'GREEN',
  A: 'AMBER',
  S: 'AMBER',
  C: 'AMBER',
  P_OR_S: 'AMBER',
  NOT_PERMITTED: 'RED',
}

export function strictestPath(paths: ZoningScenarioPath[]): ZoningScenarioPath {
  let worst: ZoningScenarioPath = 'P'
  for (const path of paths) {
    if (PATH_RANK[path] > PATH_RANK[worst]) worst = path
  }
  return worst
}

export function defaultHousingPathwayRag(rows: HousingPathwayRow[]): Rag {
  if (rows.length !== 5 || rows.some((row) => row.reviewStatus !== 'verified' || row.pathway === 'UNKNOWN')) return 'UNRATED'
  if (new Set(rows.map((row) => row.useType)).size !== 5) return 'UNRATED'
  if (rows.some((row) => row.pathway === 'P')) return 'GREEN'
  if (rows.some((row) => row.pathway !== 'NOT_PERMITTED')) return 'AMBER'
  return 'RED'
}

export function overlayHandled(evidence: LdesEvidence): boolean {
  const overlays = evidence.overlays ?? []
  const present = evidence.overlayPresent ?? overlays.length > 0
  if (!present) return true
  if (evidence.overlayHandled === false) return false
  if (evidence.overlayDimensionsHandled === false) return false
  return Boolean(evidence.overlayRulesApplied || evidence.overlayWrittenExclusion || evidence.overlayHandled)
}

export function scoreZoning(evidence: LdesEvidence): {
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
  const districts = evidence.districts ?? []
  const paths = evidence.districtPathways?.length
    ? evidence.districtPathways
    : evidence.scenarioPath
      ? [evidence.scenarioPath]
      : []

  const verifiedRows = (evidence.housingPathways ?? []).filter((row) => row.reviewStatus === 'verified')
  const verifiedKeys = new Set(verifiedRows.map((row) => row.districtKey))
  const splitVerified = verifiedKeys.size >= 2
  const splitWithoutTable = verifiedRows.length === 0 && (districts.length >= 2 || paths.length >= 2)

  if (splitVerified || splitWithoutTable) {
    flags.push('MULTIPLE_BASE_ZONING_DISTRICTS')
    context.push(
      makeDriver({
        id: 'MULTIPLE_BASE_ZONING_DISTRICTS',
        kind: 'context',
        factor: 'intersecting_districts',
        title: 'Multiple zoning districts',
        detail: `Parcel intersects ${[...verifiedKeys].join(' and ') || districts.join(' and ') || `${paths.length} districts`}. Approvals may need to satisfy more than one district.`,
        nextStep: 'Confirm which district controls the use pathway.',
        observedValue: [...verifiedKeys].join(',') || districts.join(',') || paths.join(','),
        field: 'districts',
      }),
    )
  }

  const zoningOverlap = evidence.zoningOverlap
  if (
    zoningOverlap &&
    isSliver(zoningOverlap.overlapPct, zoningOverlap.intersectionAreaSqft) &&
    zoningOverlap.pathwayIfApplied &&
    zoningOverlap.pathwayIfApplied !== 'P'
  ) {
    flags.push('UNRESOLVED_GEOMETRY_BOUNDARY')
    missing.push('unresolved zoning geometry boundary')
    return { rag: 'UNRATED', flags, drivers, context, missing }
  }

  if (!overlayHandled(evidence)) {
    missing.push('overlay rules applied or written exclusion')
    return { rag: 'UNRATED', flags, drivers, context, missing }
  }

  if (splitVerified) {
    missing.push('split-zoned base districts require manual review')
    return { rag: 'UNRATED', flags, drivers, context, missing }
  }

  if (verifiedRows.length > 0) {
    const rag = defaultHousingPathwayRag(evidence.housingPathways ?? [])
    if (rag === 'UNRATED') missing.push('complete verified five-use zoning table')
    if (rag === 'RED') drivers.push(makeDriver({ id: 'NO_LISTED_HOUSING_PATH', factor: 'housing_pathways', title: 'No listed housing pathway', detail: 'None of the five screened housing uses is listed for this base district.', nextStep: 'Review the zoning use table and confirm any other applicable paths with the city.', observedValue: verifiedRows[0]?.districtKey ?? '', rag, field: 'housingPathways' }))
    if (rag === 'AMBER') drivers.push(makeDriver({ id: 'ADDITIONAL_USE_REVIEW', factor: 'housing_pathways', title: 'Additional use review', detail: 'At least one screened housing use has an additional review path; none is listed as P.', nextStep: 'Check the applicable use-specific standards and approval path.', observedValue: verifiedRows[0]?.districtKey ?? '', rag, field: 'housingPathways' }))
    return { rag, flags, drivers, context, missing }
  }

  const heuristic = evidence.pathwaySource === 'letter-group-heuristic' || evidence.pathwayVerified === false
  if (heuristic || paths.length === 0 || paths.includes('UNKNOWN') || !evidence.pathwayVerified) {
    missing.push('verified zoning use table')
    return { rag: 'UNRATED', flags, drivers, context, missing }
  }

  return finishPathway(strictestPath(paths), flags, drivers, context, missing)
}

function finishPathway(
  path: ZoningScenarioPath,
  flags: CriticalFlag[],
  drivers: Barrier[],
  context: Barrier[],
  missing: string[],
): { rag: Rag; flags: CriticalFlag[]; drivers: Barrier[]; context: Barrier[]; missing: string[] } {
  if (path === 'UNKNOWN') {
    missing.push('verified zoning use table')
    return { rag: 'UNRATED', flags, drivers, context, missing }
  }

  const rag = PATH_RAG[path]
  if (path === 'NOT_PERMITTED') {
    flags.push('USE_VARIANCE_REQUIRED')
    drivers.push(
      makeDriver({
        id: 'USE_VARIANCE_REQUIRED',
        factor: 'scenario_path',
        title: 'Use variance required',
        detail: 'The current use pathway is not permitted and requires a use variance. This is not a permanent ban on all development.',
        nextStep: 'Treat this as a hard stop for uses that are not listed in §911.02 for this base district.',
        observedValue: path,
        rag,
        field: 'scenarioPath',
      }),
    )
  } else if (path !== 'P') {
    drivers.push(
      makeDriver({
        id: `zoning-${path}`,
        factor: 'scenario_path',
        title: `${path} zoning pathway`,
        detail: 'This zoning pathway needs additional administrative review or conditions.',
        nextStep: 'Budget time for the extra zoning review path. Approval is not implied.',
        observedValue: path,
        rag,
        field: 'scenarioPath',
      }),
    )
  }

  return { rag, flags, drivers, context, missing }
}
