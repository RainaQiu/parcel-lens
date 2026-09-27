import { normalizePin } from './arcgis'
import type { SearchHit } from './types'

export type SearchSubmission = { kind: 'pin'; pin: string } | { kind: 'choose_candidate' } | { kind: 'empty' }

export function resolveSearchSubmission(raw: string, _hits: SearchHit[]): SearchSubmission {
  const compact = raw.trim().replace(/[-\s]/g, '').toUpperCase()
  if (!compact) return { kind: 'empty' }
  if (/^(?:\d{4}[A-Z]\d{11}|\d{16})$/.test(compact)) return { kind: 'pin', pin: normalizePin(compact) }
  return { kind: 'choose_candidate' }
}

export function isCurrentSelection(requestId: number, activeRequestId: number, returnedPin: string, selectedPin: string): boolean {
  return requestId === activeRequestId && Boolean(returnedPin) && normalizePin(returnedPin) === normalizePin(selectedPin)
}

export function assessmentMatchesParcel(assessmentParid: string, parcelPin: string): boolean {
  return Boolean(assessmentParid && parcelPin) && normalizePin(assessmentParid) === normalizePin(parcelPin)
}
