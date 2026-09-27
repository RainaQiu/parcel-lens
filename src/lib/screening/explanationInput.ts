import type { ParcelReport } from '../reportView'

export function buildExplanationInput(report: ParcelReport) {
  const { scorecard } = report
  return {
    pin: report.pin,
    scoreVersion: scorecard.scoreVersion,
    ruleVersion: scorecard.ruleVersions.join(', '),
    screeningRag: scorecard.screeningRag,
    pathwaySummary: scorecard.pathwaySummary,
    fallbackSummary: report.fallbackSummary,
    constraints: scorecard.mappedConstraints,
    reviewTasks: scorecard.reviewTasks,
    evidenceGaps: scorecard.evidenceGaps,
  }
}
