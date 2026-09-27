import type { OverallResult, Rag } from '../types'

export function worstSuitability(rags: Rag[]): Rag {
  if (rags.includes('RED')) return 'RED'
  if (rags.includes('UNRATED')) return 'UNRATED'
  if (rags.includes('AMBER')) return 'AMBER'
  return 'GREEN'
}

export function worstColor(rags: Rag[]): Rag {
  if (rags.includes('UNRATED')) return 'UNRATED'
  if (rags.includes('RED')) return 'RED'
  if (rags.includes('AMBER')) return 'AMBER'
  return 'GREEN'
}

export function combineEaseScore(input: {
  suitabilityRag: Rag
  developmentPotentialRag: Rag
  useVarianceRequired: boolean
}): { easeScore: Rag; overallResult: OverallResult } {
  if (input.useVarianceRequired) {
    return { easeScore: 'RED', overallResult: 'CURRENT_SCENARIO_REQUIRES_VARIANCE' }
  }
  if (input.developmentPotentialRag === 'RED') {
    return { easeScore: 'RED', overallResult: 'SELECTED_SCENARIO_DOES_NOT_FIT' }
  }
  if (input.suitabilityRag === 'RED') {
    return { easeScore: 'RED', overallResult: 'MAJOR_CONSTRAINTS' }
  }
  if (input.suitabilityRag === 'UNRATED') {
    return { easeScore: 'UNRATED', overallResult: 'NEEDS_FURTHER_EVIDENCE' }
  }
  if (input.developmentPotentialRag === 'UNRATED') {
    if (input.suitabilityRag === 'AMBER') {
      return { easeScore: 'AMBER', overallResult: 'CANDIDATE_WITH_CONDITIONS' }
    }
    return { easeScore: 'GREEN', overallResult: 'STRONG_CANDIDATE' }
  }
  if (input.suitabilityRag === 'AMBER' || input.developmentPotentialRag === 'AMBER') {
    return { easeScore: 'AMBER', overallResult: 'CANDIDATE_WITH_CONDITIONS' }
  }
  return { easeScore: 'GREEN', overallResult: 'STRONG_CANDIDATE' }
}
