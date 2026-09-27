import { normalizePin } from './arcgis'
import { parseAddress, rankAddressCandidates } from './addressSearch'
import type { AssessmentRow, SearchHit } from './types'

const RESOURCE_ID = '65855e14-549e-4992-b5be-d629afc676fa'

const SEARCH_FIELDS = [
  'PARID',
  'PROPERTYHOUSENUM',
  'PROPERTYADDRESS',
  'PROPERTYCITY',
  'PROPERTYZIP',
  'MUNIDESC',
  'MUNICODE',
].join(',')

type DatastoreResponse = {
  success?: boolean
  error?: { message?: string }
  result?: { records?: SearchHit[]; total?: number }
}

async function datastoreSearch(
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<DatastoreResponse> {
  const search = new URLSearchParams({
    resource_id: RESOURCE_ID,
    fields: SEARCH_FIELDS,
    ...params,
  })
  const res = await fetch(`/api/ckan/datastore_search?${search}`, { signal })
  if (!res.ok) {
    throw new Error(`Search failed (${res.status})`)
  }
  return res.json()
}

function inPittsburgh(muni: number | string | null | undefined): boolean {
  const n = Number(muni)
  return Number.isFinite(n) && n >= 100 && n <= 132
}

export async function fetchAssessment(
  parid: string,
  signal?: AbortSignal,
): Promise<AssessmentRow | null> {
  const params = new URLSearchParams({
    resource_id: RESOURCE_ID,
    filters: JSON.stringify({ PARID: normalizePin(parid) }),
    limit: '1',
  })
  const res = await fetch(`/api/ckan/datastore_search?${params}`, { signal })
  if (!res.ok) {
    throw new Error(`Assessment query failed (${res.status})`)
  }
  const data = await res.json()
  return (data.result?.records?.[0] as AssessmentRow | undefined) ?? null
}

export async function searchAssessments(
  query: string,
  signal?: AbortSignal,
): Promise<SearchHit[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const compact = trimmed.replace(/[-\s]/g, '')
  const looksLikePin = /^(?:\d{4}[A-Z]\d{11}|\d{16})$/i.test(compact)

  if (looksLikePin) {
    const data = await datastoreSearch(
      {
        filters: JSON.stringify({ PARID: normalizePin(trimmed) }),
        limit: '8',
      },
      signal,
    )
    return (data.result?.records ?? []) as SearchHit[]
  }

  const address = parseAddress(trimmed)
  if (address) {
    async function byHouse(house: string): Promise<SearchHit[]> {
      const found: SearchHit[] = []
      for (let offset = 0; offset < 500; offset += 50) {
        const data = await datastoreSearch({ filters: JSON.stringify({ PROPERTYHOUSENUM: house }), limit: '50', offset: String(offset) }, signal)
        const rows = data.result?.records ?? []
        found.push(...rows.filter((row) => inPittsburgh(row.MUNICODE)))
        if (rows.length < 50 || offset + rows.length >= (data.result?.total ?? 0)) break
      }
      return found
    }
    const exact = await byHouse(address.house)
    const ranked = rankAddressCandidates(trimmed, exact)
    if (ranked.length) return ranked.slice(0, 20)
    const near = await Promise.all([-2, -1, 1, 2].filter((delta) => Number(address.house) + delta > 0)
      .map((delta) => byHouse(String(Number(address.house) + delta))))
    return rankAddressCandidates(trimmed, near.flat()).slice(0, 20)
  }

  const data = await datastoreSearch(
    {
      q: JSON.stringify({ PROPERTYADDRESS: trimmed.toUpperCase() }),
      limit: '25',
    },
    signal,
  )
  return (data.result?.records ?? [])
    .filter((row) => inPittsburgh(row.MUNICODE))
    .slice(0, 8)
}
