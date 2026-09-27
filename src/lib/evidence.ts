import type { SourceObservation } from './types'

type SourceMeta = Pick<SourceObservation<unknown>, 'sourceId' | 'sourceUrl' | 'sourceUpdatedAt' | 'joinMethod'>

export function sourceObservation<T>(source: SourceMeta, value: T, retrievedAt: string): SourceObservation<T> {
  return { ...source, status: 'available', value, retrievedAt, nAReason: null }
}

export async function observeQuery<T>(promise: Promise<T | null>, source: SourceMeta, retrievedAt: string): Promise<SourceObservation<T>> {
  try {
    const value = await promise
    if (value === null) return { ...source, status: 'not_found', value: null, retrievedAt, nAReason: 'No matching record' }
    return sourceObservation(source, value, retrievedAt)
  } catch (error) {
    return { ...source, status: 'unavailable', value: null, retrievedAt, nAReason: error instanceof Error ? error.message : 'Request failed' }
  }
}
