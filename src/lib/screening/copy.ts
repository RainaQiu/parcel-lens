import { mappedConstraintRag } from './hazards'
import type { ScreeningRag, ScreeningScorecard } from './types'

const meaning: Record<ScreeningRag, string> = {
  GREEN: 'No additional review task was found within the verified preliminary screen.',
  AMBER: 'Targeted review is needed before the next due diligence decision.',
  RED: 'A major verified screening constraint was found; resolve it before the next due diligence decision.',
  UNRATED: 'Key evidence is incomplete, so the preliminary screen cannot be reliably graded.',
}

export function screeningMeaning(rag: ScreeningRag): string { return meaning[rag] }

export function buildScreeningFallback(scorecard: ScreeningScorecard): string {
  const head = `Development Ease Score — Preliminary zoning & site screen: ${scorecard.screeningRag}. ${screeningMeaning(scorecard.screeningRag)}`
  const task = scorecard.reviewTasks.find((item) => item.scoreEffect === 'triggered')
  const redConstraint = scorecard.mappedConstraints.find((item) => mappedConstraintRag(item) === 'RED')
  const redTask = redConstraint ? scorecard.reviewTasks.find((item) => item.id === `mapped-${redConstraint.id}`) : undefined
  if (scorecard.screeningRag === 'RED' && scorecard.pathwaySummary === 'NO_LISTED_PATH') return `${head} This finding is limited to the five checked residential uses; it does not assess all development possibilities. Project feasibility is not assessed.`
  if (scorecard.screeningRag === 'RED') return `${head} First check: ${redTask?.trigger ?? task?.trigger ?? 'Verify the mapped constraint with the relevant professional.'} Parcel-level overlap does not locate a proposed project footprint. Project feasibility is not assessed.`
  if (scorecard.screeningRag === 'UNRATED') return `${head} Missing evidence: ${scorecard.evidenceGaps[0]?.reason ?? 'required source facts'}. Verified facts remain available below. Project feasibility is not assessed.`
  if (task) return `${head} First check: ${task.trigger} ${task.whyItMatters} Project feasibility is not assessed.`
  return `${head} Project size, location, land control, engineering cost, and financial feasibility are not assessed.`
}
