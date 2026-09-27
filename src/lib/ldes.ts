import { featureCentroid, normalizePin } from './arcgis'
import { clipOverlap, fetchLayerUpdatedAt, isClipFact, polygonVerified, queryFema, queryPasdaLayer, queryPghLayer } from './gis'
import { effectiveOverlap } from './ldes/geometry'
import { sourceObservation } from './evidence'
import { applyScenario, splitZoning } from './scenarios'
import { fetchZoningAt } from './zoning'
import type {
  AssessmentRow,
  FloodCategory,
  FloodHit,
  HousingScenarioId,
  LdesLayerFacts,
  OverlapFact,
  ParcelFeature,
  SourceObservation,
} from './types'

const VIOLATIONS_RESOURCE = '70c06278-92c5-4040-ab28-17671866f81c'
const CONDEMNED_RESOURCE = '0a963f26-eb4b-4325-bbbc-3ddf6a871410'
const PGH_BASE = 'https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services'
const WPRDC_BASE = 'https://data.wprdc.org/api/3/action/datastore_search?resource_id='

type DatastoreRecords = { success?: boolean; error?: { message?: string }; result?: { records?: Array<Record<string, unknown>>; total?: number } }

function inPittsburgh(muni: number | string | undefined): boolean {
  const n = Number(muni)
  return Number.isFinite(n) && n >= 100 && n <= 132
}

async function settled<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
  try {
    return { ok: true, value: await promise }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Request failed' }
  }
}

function classifyFlood(properties?: Record<string, unknown>): FloodCategory {
  const zone = String(properties?.FLD_ZONE ?? '').toUpperCase()
  const subtype = String(properties?.ZONE_SUBTY ?? '').toUpperCase()
  const sfha = String(properties?.SFHA_TF ?? '').toUpperCase()
  if (subtype.includes('FLOODWAY') || zone.includes('FLOODWAY')) return 'FLOODWAY'
  if (subtype.includes('0.2') || (zone === 'X' && subtype.includes('0.2'))) return 'PCT_0_2'
  if (sfha === 'T' || /^(A|AE|AH|AO|AR|V|VE)/.test(zone)) return 'SFHA'
  return 'NONE'
}

function floodHits(
  feature: ParcelFeature,
  fc: { features?: Array<{ properties?: Record<string, unknown>; geometry?: GeoJSON.Geometry }> },
): { hits: FloodHit[]; failed: boolean } {
  const hits: FloodHit[] = []
  for (const item of fc.features ?? []) {
    const category = classifyFlood(item.properties)
    if (category === 'NONE') continue
    const clip = clipOverlap(feature, { features: [item] })
    if (!isClipFact(clip)) return { hits: [], failed: true }
    hits.push({
      category,
      overlapPct: clip.overlapPct,
      intersectionAreaSqft: clip.intersectionAreaSqft,
    })
  }
  return { hits, failed: false }
}

async function datastoreFilter(
  resource: string,
  filters: Record<string, string>,
  signal?: AbortSignal,
): Promise<Array<Record<string, unknown>>> {
  const records: Array<Record<string, unknown>> = []
  for (let offset = 0; offset < 2000; offset += 200) {
    const params = new URLSearchParams({ resource_id: resource, filters: JSON.stringify(filters), limit: '200', offset: String(offset) })
    const res = await fetch(`/api/ckan/datastore_search?${params}`, { signal })
    if (!res.ok) throw new Error(`Datastore query failed (${res.status})`)
    const data = (await res.json()) as DatastoreRecords
    if (data.success === false) throw new Error(data.error?.message ?? 'Datastore query failed')
    const page = data.result?.records ?? []
    records.push(...page)
    if (page.length < 200 || (data.result?.total !== undefined && records.length >= data.result.total)) return records
  }
  throw new Error('More than 2,000 linked records; cannot safely assess complete history')
}

async function recordsForPin(
  resource: string,
  pin: string,
  fields: string[],
  signal?: AbortSignal,
): Promise<Array<Record<string, unknown>>> {
  let lastError: unknown
  for (const field of fields) {
    try {
      return await datastoreFilter(resource, { [field]: pin }, signal)
    } catch (err) {
      lastError = err
    }
  }
  if (lastError) throw lastError
  return []
}

function closedViolationCount(rows: Array<Record<string, unknown>>): number {
  return rows.filter((row) => {
    const blob = `${row.status ?? ''} ${row.investigation_outcome ?? ''}`.toUpperCase()
    return /CLOSED|COMPLI|RESOLVED|ABATED/.test(blob)
  }).length
}

function occupiedImproved(assessment: AssessmentRow | null): boolean {
  const use = `${assessment?.USEDESC ?? ''} ${assessment?.CLASSDESC ?? ''}`.toUpperCase()
  const building = Number(assessment?.COUNTYBUILDING ?? assessment?.FAIRMARKETBUILDING)
  if (/\bVACANT\b/.test(use) && !(building > 0)) return false
  if (/COMMERCIAL|APART|MIXED|RETAIL|OFFICE|STORE/.test(use)) return true
  return Number.isFinite(building) && building > 0
}

function activeViolation(rows: Array<Record<string, unknown>>): boolean {
  return rows.some((row) => {
    const blob = `${row.status ?? ''} ${row.investigation_outcome ?? ''} ${row.case_status ?? ''}`.toUpperCase()
    if (/CLOSED|COMPLI|RESOLVED|VOID|DISMISS|ABATED/.test(blob)) return false
    return /VIOLATION|OPEN|ACTIVE|FOUND|OUTSTANDING/.test(blob)
  })
}

function activeCondemned(rows: Array<Record<string, unknown>>): boolean {
  return rows.some((row) => String(row.inspection_status ?? '').trim().toUpperCase() === 'ACTIVE')
}

function overlapOrFail(
  feature: ParcelFeature,
  result: { ok: true; value: Parameters<typeof clipOverlap>[1] } | { ok: false; reason: string },
): { fact?: OverlapFact; failed: boolean } {
  if (!result.ok) return { failed: true }
  const clip = clipOverlap(feature, result.value)
  if (!isClipFact(clip)) return { failed: true }
  return { fact: clip, failed: false }
}

export async function collectLdesLayers(
  feature: ParcelFeature,
  assessment: AssessmentRow | null,
  signal?: AbortSignal,
): Promise<LdesLayerFacts> {
  const pin = normalizePin(feature.properties.PIN ?? '')
  const retrievedAt = new Date().toISOString()
  const [
    zoning,
    slope,
    landslide,
    undermined,
    fema,
    historicDistricts,
    historicSites,
    violations,
    condemned,
    zoningUpdatedAt,
    slopeUpdatedAt,
    landslideUpdatedAt,
    underminedUpdatedAt,
    femaUpdatedAt,
    historicDistrictUpdatedAt,
    historicSiteUpdatedAt,
  ] = await Promise.all([
    settled(queryPghLayer('PGHWebZoning', feature, { outFields: 'zon_new,legendtype,full_zoning_type' }, signal)),
    settled(queryPghLayer('PGHWebSlope25', feature, { outFields: 'objectid', returnGeometry: 'true' }, signal)),
    settled(queryPghLayer('PGHWebLandslideProne', feature, { outFields: 'objectid', returnGeometry: 'true' }, signal)),
    settled(queryPghLayer('PGHWebUndermined', feature, { outFields: 'objectid', returnGeometry: 'true' }, signal)),
    settled(queryFema(feature, signal)),
    settled(queryPghLayer('PGHWebCHDHistoricDistricts', feature, { outFields: 'objectid', returnGeometry: 'true' }, signal)),
    settled(queryPasdaLayer(12, feature, { outFields: 'objectid', returnGeometry: 'true' }, signal)),
    settled(
      pin
        ? recordsForPin(VIOLATIONS_RESOURCE, pin, ['parcel_id', 'pin', 'PARID'], signal)
        : Promise.resolve([]),
    ),
    settled(
      pin
        ? recordsForPin(CONDEMNED_RESOURCE, pin, ['parcel_id', 'pin', 'PARID'], signal)
        : Promise.resolve([]),
    ),
    fetchLayerUpdatedAt('/api/pgh/PGHWebZoning?f=json'),
    fetchLayerUpdatedAt('/api/pgh/PGHWebSlope25?f=json'),
    fetchLayerUpdatedAt('/api/pgh/PGHWebLandslideProne?f=json'),
    fetchLayerUpdatedAt('/api/pgh/PGHWebUndermined?f=json'),
    fetchLayerUpdatedAt('/api/fema?f=json'),
    fetchLayerUpdatedAt('/api/pgh/PGHWebCHDHistoricDistricts?f=json'),
    fetchLayerUpdatedAt('/api/pasda/12/?f=json'),
  ])

  let zoningCodes =
    zoning.ok
      ? (zoning.value.features ?? [])
          .map((item) => String(item.properties?.zon_new ?? '').trim())
          .filter(Boolean)
      : []
  let zoningFromPoint = false
  let pointZoningUpdatedAt: string | null = null
  if (zoningCodes.length === 0) {
    const [lng, lat] = featureCentroid(feature)
    const pointZoning = await settled(fetchZoningAt(lng, lat, signal))
    if (pointZoning.ok && pointZoning.value?.code) {
      zoningCodes = [pointZoning.value.code]
      zoningFromPoint = true
      pointZoningUpdatedAt = pointZoning.value.updatedAt
    }
  }
  const split = splitZoning(zoningCodes)
  const slopeClip = overlapOrFail(feature, slope)
  const slideClip = overlapOrFail(feature, landslide)
  const mineClip = overlapOrFail(feature, undermined)
  const flood = fema.ok ? floodHits(feature, fema.value) : { hits: [], failed: true }
  const historicDistrictClip = historicDistricts.ok ? overlapOrFail(feature, historicDistricts) : { failed: true }
  const historicSiteClip = historicSites.ok ? overlapOrFail(feature, historicSites) : { failed: true }
  const envOk = !slopeClip.failed && !slideClip.failed && !mineClip.failed && !flood.failed
  const historicOk = !historicDistrictClip.failed && !historicSiteClip.failed
  const polyOk = polygonVerified(feature)

  function observation<T>(
    sourceId: string,
    sourceUrl: string,
    joinMethod: SourceObservation<T>['joinMethod'],
    result: { ok: true; value: T } | { ok: false; reason: string },
    sourceUpdatedAt: string | null = null,
  ): SourceObservation<T> {
    const meta = { sourceId, sourceUrl, sourceUpdatedAt, joinMethod }
    return result.ok ? sourceObservation(meta, result.value, retrievedAt) : { ...meta, status: 'unavailable', value: null, retrievedAt, nAReason: result.reason }
  }
  function clipped(
    sourceId: string,
    sourceUrl: string,
    query: { ok: true; value: unknown } | { ok: false; reason: string },
    fact: { fact?: OverlapFact; failed: boolean },
    sourceUpdatedAt: string | null,
  ): SourceObservation<OverlapFact> {
    return observation(sourceId, sourceUrl, 'polygon_clip', fact.fact && !fact.failed ? { ok: true, value: fact.fact } : { ok: false, reason: query.ok ? 'Polygon intersection could not be calculated' : query.reason }, sourceUpdatedAt)
  }
  function records(sourceId: string, resourceId: string, result: { ok: true; value: Array<Record<string, unknown>> } | { ok: false; reason: string }): SourceObservation<number> {
    const source = observation(sourceId, `${WPRDC_BASE}${resourceId}`, 'parcel_id', result.ok ? { ok: true, value: result.value.length } : result)
    return source.status === 'available' && source.value === 0 ? { ...source, status: 'not_found', value: null, nAReason: 'No matching record' } : source
  }
  const sources = {
    zoning: observation('pgh-zoning', `${PGH_BASE}/PGHWebZoning/FeatureServer/0`, zoningFromPoint ? 'point_lookup' : 'polygon_clip', zoning.ok || zoningFromPoint ? { ok: true, value: zoningCodes } : { ok: false, reason: zoning.reason }, zoningUpdatedAt ?? pointZoningUpdatedAt),
    slope: clipped('pgh-slope25', `${PGH_BASE}/PGHWebSlope25/FeatureServer/0`, slope, slopeClip, slopeUpdatedAt),
    landslide: clipped('pgh-landslide', `${PGH_BASE}/PGHWebLandslideProne/FeatureServer/0`, landslide, slideClip, landslideUpdatedAt),
    undermined: clipped('pgh-undermined', `${PGH_BASE}/PGHWebUndermined/FeatureServer/0`, undermined, mineClip, underminedUpdatedAt),
    fema: observation('fema-nfhl', 'https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28', 'polygon_clip', flood.failed ? { ok: false, reason: fema.ok ? 'FEMA polygon intersection could not be calculated' : fema.reason } : { ok: true, value: flood.hits }, femaUpdatedAt),
    historicDistrict: clipped('pgh-historic-district', `${PGH_BASE}/PGHWebCHDHistoricDistricts/FeatureServer/0`, historicDistricts, historicDistrictClip, historicDistrictUpdatedAt),
    historicSite: clipped('pasda-historic-site', 'https://mapservices.pasda.psu.edu/server/rest/services/pasda/PittsburghCity/MapServer/12', historicSites, historicSiteClip, historicSiteUpdatedAt),
    violations: records('wprdc-violations', VIOLATIONS_RESOURCE, violations),
    condemned: records('wprdc-condemned', CONDEMNED_RESOURCE, condemned),
  }

  return {
    sources,
    cityVerified: inPittsburgh(assessment?.MUNICODE ?? feature.properties.MUNICODE),
    polygonVerified: polyOk,
    parcelMatchCount: 1,
    parcelGeometry: polyOk ? 'POLYGON' : 'CENTROID_ONLY',
    allZoningDistrictsVerified: zoning.ok && !zoningFromPoint && split.districts.length + split.overlays.length > 0,
    overlayPresent: split.overlays.length > 0,
    overlayHandled: split.overlays.length === 0,
    overlayRulesApplied: false,
    overlayWrittenExclusion: false,
    overlayDimensionsHandled: split.overlays.length === 0,
    districts: split.districts,
    districtKeys: split.districtKeys,
    overlays: split.overlays,
    assessmentGeometryType: 'PARCEL',
    geometryMethod: envOk ? 'TRUE_POLYGON_CLIP' : undefined,
    geometryVersion: 'clip-v1',
    slope: slopeClip.fact,
    landslide: slideClip.fact,
    undermined: mineClip.fact,
    slopeOverlapPct: slopeClip.fact?.overlapPct,
    landslideOverlapPct: slideClip.fact?.overlapPct,
    underminedOverlapPct: mineClip.fact?.overlapPct,
    floodHits: flood.hits,
    floodCategory: flood.hits.reduce<FloodCategory>((worst, hit) => {
      const rank: Record<string, number> = { NONE: 0, OUTSIDE: 0, PCT_0_2: 1, '0.2_PERCENT': 1, SFHA: 2, FLOODWAY: 3 }
      return (rank[hit.category] ?? 0) > (rank[worst] ?? 0) ? hit.category : worst
    }, 'NONE'),
    floodOverlapPct: flood.hits[0]?.overlapPct,
    floodIntersectionAreaSqft: flood.hits[0]?.intersectionAreaSqft,
    environmentalQueriesSuccessful: envOk,
    femaQueryStatus: flood.failed ? 'FAILED' : 'OK',
    historicQueriesSuccessful: historicOk,
    violationQueryStatus: violations.ok && condemned.ok ? 'OK' : 'FAILED',
    historicDistrict: historicDistrictClip.fact ? effectiveOverlap(historicDistrictClip.fact).overlapPct > 0 : undefined,
    individualHistoricSite: historicSiteClip.fact ? effectiveOverlap(historicSiteClip.fact).overlapPct > 0 : undefined,
    historicDistrictOverlap: historicDistrictClip.fact,
    historicSiteOverlap: historicSiteClip.fact,
    activeViolation: violations.ok ? activeViolation(violations.value) : undefined,
    activeCondemned: condemned.ok ? activeCondemned(condemned.value) : undefined,
    closedViolationCount: violations.ok ? closedViolationCount(violations.value) : undefined,
    occupiedImproved: occupiedImproved(assessment),
    useDescription: assessment?.USEDESC ? String(assessment.USEDESC) : undefined,
    classDescription: assessment?.CLASSDESC ? String(assessment.CLASSDESC) : undefined,
    retrievedAt,
  }
}

export function scoreInputs(
  feature: ParcelFeature,
  assessment: AssessmentRow | null,
  layers: LdesLayerFacts,
  scenarioId: HousingScenarioId | null = null,
) {
  return applyScenario(layers, scenarioId, assessment, feature)
}
