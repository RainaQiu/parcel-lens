import type { PathwaySummary, ReviewTask, ScreeningRag } from './types'

export function combineScreeningRag(input: {
  identityVerified: boolean
  pathway: PathwaySummary
  requiredSourcesComplete: boolean
  tasks: ReviewTask[]
}): ScreeningRag {
  if (!input.identityVerified || input.pathway === 'UNKNOWN') return 'UNRATED'
  if (input.pathway === 'NO_LISTED_PATH') return 'RED'
  if (!input.requiredSourcesComplete) return 'UNRATED'
  if (input.pathway === 'REVIEW_PATH_ONLY' || input.tasks.some((task) => task.scoreEffect === 'triggered')) return 'AMBER'
  return 'GREEN'
}
