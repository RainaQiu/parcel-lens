import type { ParcelReport } from '../reportView'
import { screeningMeaning } from './copy'
import { mappedConstraintRag } from './hazards'
import type { ScreeningScorecard } from './types'

export function screeningPresentation(scorecard: ScreeningScorecard) {
  const topTask = scorecard.reviewTasks.find((task) => task.scoreEffect === 'triggered')
  const redConstraint = scorecard.mappedConstraints.find((item) => mappedConstraintRag(item) === 'RED')
  const redTask = redConstraint ? scorecard.reviewTasks.find((task) => task.id === `mapped-${redConstraint.id}`) : undefined
  const firstGap = scorecard.evidenceGaps[0]
  const firstAction = scorecard.screeningRag === 'UNRATED' ? (firstGap?.reason ?? 'Verify parcel identity and required sources.')
    : scorecard.screeningRag === 'RED' && scorecard.pathwaySummary === 'NO_LISTED_PATH' ? 'Ask planning staff to verify alternative paths beyond the five checked residential uses.'
      : redTask?.trigger ?? topTask?.trigger ?? 'Define the proposed project and complete routine due diligence.'
  return {
    gradeText: scorecard.screeningRag === 'UNRATED' ? 'UNRATED · Evidence incomplete' : `${scorecard.screeningRag} · ${screeningMeaning(scorecard.screeningRag)}`,
    pathwayText: {
      BY_RIGHT_PATH_IDENTIFIED: 'At least one checked residential use is listed P in the verified base district.',
      REVIEW_PATH_ONLY: 'The checked residential uses have review paths, but no verified P listing.',
      NO_LISTED_PATH: 'No listed path among the five checked residential uses.',
      UNKNOWN: 'The five-use zoning pathway could not be fully verified.',
    }[scorecard.pathwaySummary],
    topTask,
    firstGap,
    firstAction,
    scope: 'Preliminary zoning and site screen only. Project feasibility is not assessed.',
  }
}

export type ComparisonRow = { label: string; value: (report: ParcelReport) => string }
export function comparisonRows(reports: ParcelReport[]): { reports: ParcelReport[]; rows: ComparisonRow[]; warning: string | null } {
  const ruleSets = new Set(reports.map((report) => `${report.scorecard.scoreVersion}:${report.scorecard.ruleVersions.join(',')}`))
  const coverages = new Set(reports.map((report) => JSON.stringify(report.scorecard.requiredSourceCoverage)))
  const warning = ruleSets.size > 1 ? 'Different rule versions are present; compare source facts before interpreting grades.'
    : coverages.size > 1 ? 'Required source coverage differs; headline grades are not directly comparable.' : null
  return { reports, warning, rows: [
    { label: 'Development Ease Score — Preliminary', value: (r) => screeningPresentation(r.scorecard).gradeText },
    { label: 'Verified residential pathway', value: (r) => screeningPresentation(r.scorecard).pathwayText },
    { label: 'Mapped or record leads', value: (r) => r.scorecard.reviewTasks.filter((task) => task.scoreEffect === 'triggered').map((task) => task.trigger).join('; ') || 'No extra task identified in checked sources' },
    { label: 'First next check', value: (r) => screeningPresentation(r.scorecard).firstAction },
    { label: 'Evidence gaps', value: (r) => r.scorecard.evidenceGaps.map((gap) => gap.reason).join('; ') || 'No required source gap identified' },
    { label: 'Project feasibility', value: () => 'Not assessed' },
    { label: 'Rule version', value: (r) => `${r.scorecard.scoreVersion} · ${r.scorecard.ruleVersions.join(', ') || 'No verified use table'}` },
    { label: 'Source coverage', value: (r) => Object.entries(r.scorecard.requiredSourceCoverage).filter(([, okay]) => !okay).map(([source]) => source).join(', ') || 'All required sources available' },
    { label: 'Data retrieved', value: (r) => r.selected.ldes?.retrievedAt ? new Date(r.selected.ldes.retrievedAt).toLocaleString() : 'Not provided' },
  ] }
}
