import type { ParcelReport } from '../reportView'
import type { HousingPathwayRow, SourceObservation } from '../types'
import type { ScreeningScorecard } from './types'

export type ProjectHousingType = 'single_detached' | 'single_attached' | 'two_unit' | 'three_unit' | 'multi_unit' | 'unknown'
export type LandControl = 'owned' | 'optioned' | 'identified' | 'unknown'

export type ProjectBrief = {
  housingType: ProjectHousingType
  unitCount: number | null
  stories: number | null
  proposedFootprintSqft: number | null
  landControl: LandControl
  costAssumptionsProvided: boolean
}

export type ParcelChatSource = {
  sourceId: string
  sourceUrl: string
  sourceUpdatedAt: string | null
  retrievedAt: string | null
}

export type ParcelChatContext = {
  pin: string
  address: string
  scoreVersion: ScreeningScorecard['scoreVersion']
  screeningRag: ScreeningScorecard['screeningRag']
  pathwaySummary: ScreeningScorecard['pathwaySummary']
  housingPathways: HousingPathwayRow[]
  mappedConstraints: ScreeningScorecard['mappedConstraints']
  reviewTasks: ScreeningScorecard['reviewTasks']
  evidenceGaps: ScreeningScorecard['evidenceGaps']
  unassessed: string[]
  sources: ParcelChatSource[]
  assessor: {
    lotArea: number | null
    propertyClass: string | null
    useDescription: string | null
    saleDate: string | null
    salePrice: number | null
    assessedTotal: number | null
  }
  retrievedAt: string | null
  projectBrief: ProjectBrief
}

export type ProjectConceptStatus = 'MATCH_FOUND' | 'REVIEW_PATH' | 'NO_LISTED_PATH' | 'INSUFFICIENT_DATA' | 'OUT_OF_SCOPE'
export type ProjectConceptCheck = {
  status: ProjectConceptStatus
  housingType: string
  pathway: HousingPathwayRow['pathway'] | null
  useLabel: string | null
  explanation: string
  missingInputs: string[]
}

export const emptyProjectBrief = (): ProjectBrief => ({
  housingType: 'unknown', unitCount: null, stories: null, proposedFootprintSqft: null,
  landControl: 'unknown', costAssumptionsProvided: false,
})

const housingUseByProjectType: Record<Exclude<ProjectHousingType, 'unknown'>, HousingPathwayRow['useType']> = {
  single_detached: 'single_unit_detached',
  single_attached: 'single_unit_attached',
  two_unit: 'two_unit',
  three_unit: 'three_unit',
  multi_unit: 'multi_unit',
}

const supportedHousingTypes = new Set(Object.keys(housingUseByProjectType))
const landControls = new Set<LandControl>(['owned', 'optioned', 'identified', 'unknown'])

function finitePositive(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= max ? value : null
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function safeSources(report: ParcelReport): ParcelChatSource[] {
  const sources = new Map<string, ParcelChatSource>()
  const add = (sourceId: string | undefined, sourceUrl: string | undefined, sourceUpdatedAt?: string | null, retrievedAt?: string | null) => {
    if (!sourceId || !sourceUrl) return
    sources.set(sourceId, { sourceId, sourceUrl, sourceUpdatedAt: sourceUpdatedAt ?? null, retrievedAt: retrievedAt ?? null })
  }
  for (const row of report.scorecard.housingPathways) add(row.ruleVersion, row.sourceUrl, row.codeAsOf, row.verifiedAt)
  for (const item of report.scorecard.mappedConstraints) {
    if (item.source) add(item.source.sourceId, item.source.sourceUrl, item.source.sourceUpdatedAt, item.source.retrievedAt)
  }
  for (const task of report.scorecard.reviewTasks) for (const sourceRef of task.sourceRefs) {
    const observations = Object.values(report.selected.ldes?.sources ?? {}) as Array<SourceObservation<unknown>>
    const source = report.selected.ldes?.sources?.[sourceRef as keyof NonNullable<typeof report.selected.ldes.sources>] ?? observations.find((item) => item?.sourceId === sourceRef)
    if (source) add(source.sourceId, source.sourceUrl, source.sourceUpdatedAt, source.retrievedAt)
  }
  return [...sources.values()]
}

export function buildParcelChatContext(report: ParcelReport, projectBrief = emptyProjectBrief()): ParcelChatContext {
  const assessment = report.selected.assessment
  const ldes = report.selected.ldes ?? report.selected.ldesLayers
  const assessmentNumber = (key: 'LOTAREA' | 'SALEPRICE' | 'FAIRMARKETTOTAL') => numberOrNull(assessment?.[key])
  return {
    pin: report.pin,
    address: report.address,
    scoreVersion: report.scorecard.scoreVersion,
    screeningRag: report.scorecard.screeningRag,
    pathwaySummary: report.scorecard.pathwaySummary,
    housingPathways: report.scorecard.housingPathways,
    mappedConstraints: report.scorecard.mappedConstraints,
    reviewTasks: report.scorecard.reviewTasks,
    evidenceGaps: report.scorecard.evidenceGaps,
    unassessed: report.scorecard.unassessed,
    sources: safeSources(report),
    assessor: {
      lotArea: assessmentNumber('LOTAREA'),
      propertyClass: textOrNull(assessment?.CLASSDESC),
      useDescription: textOrNull(assessment?.USEDESC) ?? textOrNull(ldes?.useDescription),
      saleDate: textOrNull(assessment?.SALEDATE),
      salePrice: assessmentNumber('SALEPRICE'),
      assessedTotal: assessmentNumber('FAIRMARKETTOTAL'),
    },
    retrievedAt: textOrNull(ldes?.retrievedAt) ?? null,
    projectBrief: mergeProjectBrief(emptyProjectBrief(), projectBrief),
  }
}

export function checkProjectConcept(scorecard: ScreeningScorecard, projectBrief: ProjectBrief): ProjectConceptCheck {
  const housingType = String(projectBrief?.housingType ?? 'unknown')
  if (housingType === 'unknown' || !housingType) {
    return { status: 'INSUFFICIENT_DATA', housingType, pathway: null, useLabel: null,
      explanation: 'Choose the housing form before checking a project concept.', missingInputs: ['housingType'] }
  }
  if (!supportedHousingTypes.has(housingType)) {
    return { status: 'OUT_OF_SCOPE', housingType, pathway: null, useLabel: null,
      explanation: 'This use is outside the residential pathway rules currently verified by ParcelLens.', missingInputs: ['supported use-specific zoning rules'] }
  }
  if (scorecard.pathwaySummary === 'UNKNOWN') {
    return { status: 'INSUFFICIENT_DATA', housingType, pathway: null, useLabel: null,
      explanation: 'The parcel zoning pathway is incomplete, so the project concept cannot be checked reliably.', missingInputs: ['verified zoning pathway'] }
  }
  const useType = housingUseByProjectType[housingType as Exclude<ProjectHousingType, 'unknown'>]
  const row = scorecard.housingPathways.find((item) => item.useType === useType)
  if (!row || row.reviewStatus !== 'verified' || row.pathway === 'UNKNOWN') {
    return { status: 'INSUFFICIENT_DATA', housingType, pathway: row?.pathway ?? null, useLabel: row?.useLabel ?? null,
      explanation: 'The requested residential use row is not fully verified for this parcel.', missingInputs: ['verified use row'] }
  }
  if (row.pathway === 'P') return { status: 'MATCH_FOUND', housingType, pathway: row.pathway, useLabel: row.useLabel,
    explanation: 'A by-right path is listed for this housing form in the verified base-district table; dimensions and other project rules remain unassessed.', missingInputs: [] }
  if (row.pathway === 'NOT_PERMITTED') return { status: 'NO_LISTED_PATH', housingType, pathway: row.pathway, useLabel: row.useLabel,
    explanation: 'No listed path was found for this housing form in the checked base-district table.', missingInputs: ['alternative zoning or approval path'] }
  return { status: 'REVIEW_PATH', housingType, pathway: row.pathway, useLabel: row.useLabel,
    explanation: 'The housing form has a listed review or discretionary path; the required approval and standards review are not assessed here.', missingInputs: ['applicable review path and project standards'] }
}

export function mergeProjectBrief(current: ProjectBrief, patch: Partial<ProjectBrief>): ProjectBrief {
  const next = { ...emptyProjectBrief(), ...current }
  const candidateType = patch.housingType
  if (candidateType === 'unknown' || (typeof candidateType === 'string' && supportedHousingTypes.has(candidateType))) next.housingType = candidateType
  const unitCount = finitePositive(patch.unitCount, 10000)
  if (unitCount !== null) next.unitCount = Math.floor(unitCount)
  const stories = finitePositive(patch.stories, 200)
  if (stories !== null) next.stories = Math.floor(stories)
  const footprint = finitePositive(patch.proposedFootprintSqft, 1_000_000_000)
  if (footprint !== null) next.proposedFootprintSqft = footprint
  if (patch.landControl && landControls.has(patch.landControl)) next.landControl = patch.landControl
  if (typeof patch.costAssumptionsProvided === 'boolean') next.costAssumptionsProvided = patch.costAssumptionsProvided
  return next
}
