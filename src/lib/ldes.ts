import { featureCentroid, normalizePin } from './arcgis'
import { clipOverlap, isClipFact, polygonVerified, queryFema, queryPasdaLayer, queryPghLayer } from './gis'
import { effectiveOverlap } from './ldes/geometry'
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
} from './types'

const VIOLATIONS_RESOURCE = '70c06278-92c5-4040-ab28-17671866f81c'
const CONDEMNED_RESOURCE = '0a963f26-eb4b-4325-bbbc-3ddf6a871410'

type DatastoreRecords = { result?: { records?: Array<Record<string, unknown>> } }

function inPittsburgh(muni: number | string | undefined): boolean {
  const n = Number(muni)
  return Number.isFinite(n) && n >= 100 && n <= 132
}

async function settled<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await promise }
  } catch {
    return { ok: false }
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
  const params = new URLSearchParams({
    resource_id: resource,
    filters: JSON.stringify(filters),
    limit: '200',
  })
  const res = await fetch(`/api/ckan/datastore_search?${params}`, { signal })
  if (!res.ok) throw new Error(`Datastore query failed (${res.status})`)
  const data = (await res.json()) as DatastoreRecords
  return data.result?.records ?? []
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

function overlapOrFail(
  feature: ParcelFeature,
  result: { ok: true; value: Parameters<typeof clipOverlap>[1] } | { ok: false },
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
  const pin = normalizePin(
    assessment?.PARID ?? feature.properties.PIN ?? feature.properties.MAPBLOCKLOT ?? '',
  )
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
  ])

  let zoningCodes =
    zoning.ok
      ? (zoning.value.features ?? [])
          .map((item) => String(item.properties?.zon_new ?? '').trim())
          .filter(Boolean)
      : []
  if (zoningCodes.length === 0) {
    const [lng, lat] = featureCentroid(feature)
    const pointZoning = await settled(fetchZoningAt(lng, lat, signal))
    if (pointZoning.ok && pointZoning.value?.code) {
      zoningCodes = [pointZoning.value.code]
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

  return {
    cityVerified: inPittsburgh(assessment?.MUNICODE ?? feature.properties.MUNICODE),
    polygonVerified: polyOk,
    parcelMatchCount: 1,
    parcelGeometry: polyOk ? 'POLYGON' : 'CENTROID_ONLY',
    allZoningDistrictsVerified: split.districts.length + split.overlays.length > 0,
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
    violationQueryStatus: violations.ok ? 'OK' : 'FAILED',
    historicDistrict: historicDistrictClip.fact ? effectiveOverlap(historicDistrictClip.fact).overlapPct > 0 : undefined,
    individualHistoricSite: historicSiteClip.fact ? effectiveOverlap(historicSiteClip.fact).overlapPct > 0 : undefined,
    historicDistrictOverlap: historicDistrictClip.fact,
    historicSiteOverlap: historicSiteClip.fact,
    activeViolation: violations.ok ? activeViolation(violations.value) : undefined,
    activeCondemned: condemned.ok ? condemned.value.length > 0 : undefined,
    closedViolationCount: violations.ok ? closedViolationCount(violations.value) : undefined,
    occupiedImproved: occupiedImproved(assessment),
    useDescription: assessment?.USEDESC ? String(assessment.USEDESC) : undefined,
    classDescription: assessment?.CLASSDESC ? String(assessment.CLASSDESC) : undefined,
    retrievedAt,
    dataAsOf: retrievedAt,
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
