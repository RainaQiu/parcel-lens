import { normalizePin } from './arcgis'
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
  result?: { records?: Array<SearchHit & { MUNICODE?: number | string }> }
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

function inPittsburgh(muni: number | string | undefined): boolean {
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
  const looksLikePin = /^[0-9A-Z]{10,16}$/i.test(compact)

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

  const addressMatch = trimmed.match(/^(\d+)\s+(.+)$/)
  if (addressMatch) {
    const house = addressMatch[1]
    const street = addressMatch[2].toUpperCase()
    const data = await datastoreSearch(
      {
        filters: JSON.stringify({ PROPERTYHOUSENUM: house }),
        limit: '50',
      },
      signal,
    )
    return (data.result?.records ?? [])
      .filter(
        (row) =>
          inPittsburgh(row.MUNICODE) &&
          (row.PROPERTYADDRESS ?? '').toUpperCase().includes(street),
      )
      .slice(0, 8)
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
