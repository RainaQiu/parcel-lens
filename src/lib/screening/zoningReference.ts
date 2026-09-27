import reference from '../../../server/data/pittsburgh-zoning-reference-v1.json'
import type { ChatCitation } from '../parcelChat'

type ParsedZoningCode = { baseCode: string; densityCode: string | null; raw: string }
type ReferenceData = typeof reference
type ReferenceEntry = { label: string; kind?: string; sourceIds: string[] }

const baseCodes = Object.keys(reference.baseDistricts).sort((a, b) => b.length - a.length)
const densityCodes = Object.keys(reference.developmentSubdistricts).sort((a, b) => b.length - a.length)
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const pattern = new RegExp(`(?<![A-Z0-9])(${baseCodes.map(escapeRegExp).join('|')})(?:[- ](${densityCodes.map(escapeRegExp).join('|')}))?(?![A-Z0-9])`, 'i')

export type ClientZoningReference = {
  code: string
  answer: string
  citations: ChatCitation[]
}

function parse(value: string): ParsedZoningCode | null {
  const match = String(value ?? '').toUpperCase().replace(/[‐–—]/g, '-').match(pattern)
  if (!match) return null
  const baseCode = match[1].toUpperCase()
  const densityCode = match[2]?.toUpperCase() ?? null
  return { baseCode, densityCode, raw: densityCode ? `${baseCode}-${densityCode}` : baseCode }
}

function citationsFor(sourceIds: string[]): ChatCitation[] {
  return [...new Set(sourceIds)].map((sourceId) => {
    const source = reference.sources.find((item) => item.sourceId === sourceId)
    return source ? { sourceId, reportSection: 'official zoning reference', kind: 'official' as const, url: source.url, title: source.title, retrievedAt: reference.retrievedAt, provider: 'Pittsburgh Code' } : null
  }).filter((citation): citation is Exclude<typeof citation, null> => Boolean(citation))
}

export function lookupClientZoningReference(question: string): ClientZoningReference | null {
  const parsed = parse(question)
  if (!parsed) return null
  const baseDistricts = (reference as ReferenceData).baseDistricts as Record<string, ReferenceEntry>
  const densitySubdistricts = (reference as ReferenceData).developmentSubdistricts as Record<string, ReferenceEntry>
  const base = baseDistricts[parsed.baseCode]
  const density = parsed.densityCode ? densitySubdistricts[parsed.densityCode] : null
  if (!base || (parsed.densityCode && !density)) return null
  const sourceIds = [...(base.sourceIds ?? []), ...(density?.sourceIds ?? [])]
  const answer = density
    ? `${parsed.baseCode}-${parsed.densityCode} combines ${parsed.baseCode}, ${base.label}, with ${parsed.densityCode}, ${density.label}. In plain English, it describes a detached-residential use subdistrict with a very-low-density development designation. The code alone does not confirm project approval; the applicable use table, site standards, overlays, and parcel-specific review still apply.`
    : `${parsed.baseCode} means ${base.label}. It is a ${base.kind} in the Pittsburgh zoning framework. The applicable use table, site standards, overlays, and parcel-specific review still determine what a particular project may do.`
  return { code: parsed.raw, answer, citations: citationsFor(sourceIds) }
}
