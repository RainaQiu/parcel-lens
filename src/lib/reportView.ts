import { siteAddress } from './format'
import { canonicalPin } from './savedParcels'
import { scoreParcel } from './score'
import { scoreScreeningParcel } from './screening/scorecard'
import { buildScreeningFallback } from './screening/copy'
import type { ScreeningScorecard } from './screening/types'
import type { ParcelScore, SelectedParcel } from './types'

export type ParcelReport = {
  pin: string
  address: string
  selected: SelectedParcel
  score: ParcelScore
  scorecard: ScreeningScorecard
  fallbackSummary: string
}

const missingLabels: Record<string, string> = {
  SETBACKS: 'Required setbacks', COVERAGE: 'Maximum lot coverage', HEIGHT_FAR: 'Building height and floor-area ratio rules',
  PARKING: 'Parking requirements', OPEN_SPACE: 'Open-space requirements', ACCESS: 'Site access',
}
export function humanizeMissing(value: string): string { return missingLabels[value] ?? value }

export function buildFallbackSummary(score: ParcelScore): string {
  if (score.easeScore === 'UNRATED') {
    return `This parcel cannot be rated yet. Missing evidence: ${score.missingRequired.slice(0, 2).map(humanizeMissing).join('; ') || 'required source facts'}. Review the original sources before relying on the screening.`
  }
  const main = score.drivers[0]
  return main
    ? `${score.easeScore} parcel screening. Main constraint: ${main.title}. Next check: ${main.nextStep}`
    : `${score.easeScore} parcel screening. No major constraint driver was identified by the current rules. Check the evidence and unknowns below.`
}

export function makeParcelReport(selected: SelectedParcel): ParcelReport {
  const pin = canonicalPin(selected.feature.properties.PIN ?? '')
  if (!pin) throw new Error('Parcel boundary has no PIN')
  const score = scoreParcel(selected)
  const scorecard = scoreScreeningParcel(selected)
  return {
    pin,
    address: siteAddress(selected.assessment).line1,
    selected,
    score,
    scorecard,
    fallbackSummary: buildScreeningFallback(scorecard),
  }
}
