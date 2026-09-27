import { fetchParcelByPin, featureCentroid } from './arcgis'
import { fetchAssessment } from './ckan'
import { observeQuery } from './evidence'
import { collectLdesLayers, scoreInputs } from './ldes'
import { assessmentMatchesParcel } from './selection'
import { fetchZoningAt } from './zoning'
import type { ParcelFeature, SelectedParcel } from './types'

export async function loadParcelFeature(
  feature: ParcelFeature,
  signal?: AbortSignal,
  onProgress?: (parcel: SelectedParcel) => void,
): Promise<SelectedParcel> {
  const pin = feature.properties.PIN ?? ''
  onProgress?.({ feature, assessment: null, zoning: null })
  const [lng, lat] = featureCentroid(feature)
  const [assessmentResult, zoningResult] = await Promise.allSettled([
    pin ? fetchAssessment(pin, signal) : Promise.resolve(null),
    fetchZoningAt(lng, lat, signal),
  ])
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
  const rawAssessment = assessmentResult.status === 'fulfilled' ? assessmentResult.value : null
  const mismatch = rawAssessment !== null && !assessmentMatchesParcel(rawAssessment.PARID, pin)
  const assessment = mismatch ? null : rawAssessment
  const zoning = zoningResult.status === 'fulfilled' ? zoningResult.value : null
  onProgress?.({ feature, assessment, zoning })
  const layers = await collectLdesLayers(feature, assessment, signal)
  if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError')
  const retrievedAt = new Date().toISOString()
  const assessmentSourceUrl = 'https://data.wprdc.org/api/3/action/datastore_search?resource_id=65855e14-549e-4992-b5be-d629afc676fa'
  const assessmentUpdatedAt = (mismatch ? rawAssessment : assessment)?.ASOFDATE ?? null
  layers.sources = {
    ...layers.sources,
    assessment: mismatch
      ? { status: 'unavailable', value: null, sourceId: 'wprdc-assessment', sourceUrl: assessmentSourceUrl, sourceUpdatedAt: assessmentUpdatedAt, retrievedAt, joinMethod: 'parcel_id', nAReason: 'Assessment PARID does not match boundary PIN' }
      : await observeQuery(assessmentResult.status === 'fulfilled' ? Promise.resolve(assessment) : Promise.reject(assessmentResult.reason), { sourceId: 'wprdc-assessment', sourceUrl: assessmentSourceUrl, sourceUpdatedAt: assessmentUpdatedAt, joinMethod: 'parcel_id' }, retrievedAt),
  }
  const ldes = scoreInputs(feature, assessment, layers)
  return { feature, assessment, zoning, ldesLayers: layers, ldes }
}

export async function loadParcelByPin(pin: string, signal?: AbortSignal): Promise<SelectedParcel> {
  const feature = await fetchParcelByPin(pin, signal)
  if (!feature) throw new Error(`No unique parcel boundary found for ${pin}`)
  return loadParcelFeature(feature, signal)
}
