import type { ScreeningRag, ScreeningScorecard } from './types'

const meaning: Record<ScreeningRag, string> = {
  GREEN: 'No additional review task was found within the verified preliminary screen.',
  AMBER: 'Targeted review is needed before the next due diligence decision.',
  RED: 'No listed pathway was found among the five checked residential uses; verify alternatives with planning staff.',
  UNRATED: 'Key evidence is incomplete, so the preliminary screen cannot be reliably graded.',
}

export function screeningMeaning(rag: ScreeningRag): string { return meaning[rag] }

export function buildScreeningFallback(scorecard: ScreeningScorecard): string {
  const head = `Development Ease Score — Preliminary zoning & site screen: ${scorecard.screeningRag}. ${screeningMeaning(scorecard.screeningRag)}`
  if (scorecard.screeningRag === 'RED') return `${head} This finding is limited to the five checked residential uses; it does not assess all development possibilities. Project feasibility is not assessed.`
  if (scorecard.screeningRag === 'UNRATED') return `${head} Missing evidence: ${scorecard.evidenceGaps[0]?.reason ?? 'required source facts'}. Verified facts remain available below. Project feasibility is not assessed.`
  const task = scorecard.reviewTasks.find((item) => item.scoreEffect === 'triggered')
  if (task) return `${head} First check: ${task.trigger} ${task.whyItMatters} Project feasibility is not assessed.`
  return `${head} Project size, location, land control, engineering cost, and financial feasibility are not assessed.`
}
