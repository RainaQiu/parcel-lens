import type { SearchHit } from './types'

const ordinals: Record<string, string> = {
  FIRST: '1ST', SECOND: '2ND', THIRD: '3RD', FOURTH: '4TH', FIFTH: '5TH',
  SIXTH: '6TH', SEVENTH: '7TH', EIGHTH: '8TH', NINTH: '9TH', TENTH: '10TH',
  ELEVENTH: '11TH', TWELFTH: '12TH', THIRTEENTH: '13TH', FOURTEENTH: '14TH',
  FIFTEENTH: '15TH', SIXTEENTH: '16TH', SEVENTEENTH: '17TH', EIGHTEENTH: '18TH',
  NINETEENTH: '19TH', TWENTIETH: '20TH',
}
const suffixes: Record<string, string> = {
  AVENUE: 'AVE', AV: 'AVE', STREET: 'ST', ROAD: 'RD', BOULEVARD: 'BLVD',
  DRIVE: 'DR', LANE: 'LN', PLACE: 'PL', COURT: 'CT', TERRACE: 'TER',
  PARKWAY: 'PKWY', CIRCLE: 'CIR', ALLEY: 'ALY', WAY: 'WAY',
}

export function normalizeStreet(value: string): string {
  return value.toUpperCase().normalize('NFKC').replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean)
    .map((word) => ordinals[word] ?? suffixes[word] ?? word)
    .join(' ')
}

export function parseAddress(query: string): { house: string; street: string } | null {
  const match = query.trim().match(/^(\d{1,6})\s+(.+)$/)
  const street = match?.[2].split(',')[0].replace(/\s+(?:APT|UNIT|STE|#)\s*[A-Z0-9-]+$/i, '') ?? ''
  return match ? { house: match[1], street: normalizeStreet(street) } : null
}

function distance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0]
    previous[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j]
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = old
    }
  }
  return previous[b.length]
}

export function rankAddressCandidates(query: string, rows: SearchHit[]): SearchHit[] {
  const parsed = parseAddress(query)
  if (!parsed) return []
  return rows.map((row) => {
    const candidateStreet = normalizeStreet(row.PROPERTYADDRESS ?? '')
    const streetDistance = distance(parsed.street, candidateStreet)
    const houseDistance = Math.abs(Number(parsed.house) - Number(row.PROPERTYHOUSENUM))
    const streetMatch = candidateStreet === parsed.street ||
      candidateStreet.startsWith(`${parsed.street} `) ||
      parsed.street.startsWith(`${candidateStreet} `)
    const eligible = (streetMatch || streetDistance <= Math.max(2, Math.floor(parsed.street.length * 0.2))) && houseDistance <= 2
    const score = eligible ? 100 - streetDistance * 12 - houseDistance * 15 : -1
    return { row, score }
  }).filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.row.PARID.localeCompare(b.row.PARID))
    .map(({ row }) => row)
}
