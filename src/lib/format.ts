import type { AssessmentRow } from './types'

export function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function formatDate(value: unknown): string {
  const date = parseDate(value)
  if (!date) return display(value)
  const hasTime =
    date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0
  return date.toLocaleString('en-US', hasTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' })
}

function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const text = String(value).trim()
  const dayOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dayOnly) {
    return new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3]))
  }
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatMoney(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n)
}

export function formatYear(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return String(Math.round(n))
}

export function formatNumber(value: unknown, digits = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export function siteAddress(row: AssessmentRow | null): {
  line1: string
  line2: string
  full: string
} {
  if (!row) {
    return { line1: 'Unknown address', line2: '', full: '' }
  }
  const house = [row.PROPERTYHOUSENUM, row.PROPERTYFRACTION]
    .filter((part) => part !== null && part !== undefined && String(part) !== '')
    .join(' ')
  const street = [house, row.PROPERTYADDRESS, row.PROPERTYUNIT]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const city = row.PROPERTYCITY ?? 'Pittsburgh'
  const state = row.PROPERTYSTATE ?? 'PA'
  const zip = row.PROPERTYZIP ? String(row.PROPERTYZIP) : ''
  const line2 = [city, state, zip].filter(Boolean).join(', ')
  return {
    line1: street || 'Unknown address',
    line2,
    full: [street, line2].filter(Boolean).join(', '),
  }
}

export function mailingAddress(row: AssessmentRow | null): string {
  if (!row) return '—'
  const lines = [
    row.CHANGENOTICEADDRESS1,
    row.CHANGENOTICEADDRESS2,
    row.CHANGENOTICEADDRESS3,
    row.CHANGENOTICEADDRESS4,
  ]
    .map((line) => (line ?? '').trim())
    .filter(Boolean)
  return lines.length ? lines.join('\n') : '—'
}

export function legalDescription(row: AssessmentRow | null): string {
  if (!row) return '—'
  return [row.LEGAL1, row.LEGAL2, row.LEGAL3]
    .map((line) => (line ?? '').trim())
    .filter(Boolean)
    .join(' ') || '—'
}

export function acresFrom(row: AssessmentRow | null, calcAcreage?: number): number | null {
  if (typeof calcAcreage === 'number' && Number.isFinite(calcAcreage)) {
    return calcAcreage
  }
  const sqft = Number(row?.LOTAREA)
  if (Number.isFinite(sqft) && sqft > 0) {
    return sqft / 43560
  }
  return null
}
