import area from '@turf/area'
import { featureCollection } from '@turf/helpers'
import intersect from '@turf/intersect'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { OverlapFact, ParcelFeature } from './types'

export type GisFeatureCollection = {
  features?: Array<{
    properties?: Record<string, unknown>
    geometry?: GeoJSON.Geometry
  }>
}

const SQM_TO_SQFT = 10.76391041671
const GEOMETRY_VERSION = 'clip-v1'

export function toEsriPolygon(feature: ParcelFeature) {
  if (feature.geometry.type === 'Polygon') {
    return { rings: feature.geometry.coordinates }
  }
  return { rings: feature.geometry.coordinates.flat() }
}

export function polygonVerified(feature: ParcelFeature): boolean {
  const rings =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates
      : feature.geometry.type === 'MultiPolygon'
        ? feature.geometry.coordinates.flat()
        : []
  return rings.some((ring) => ring.length >= 4)
}

function asPolyFeature(geometry: GeoJSON.Geometry | undefined): Feature<Polygon | MultiPolygon> | null {
  if (!geometry) return null
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    return { type: 'Feature', properties: {}, geometry }
  }
  return null
}

export function clipOverlap(
  parcel: ParcelFeature,
  hits: GisFeatureCollection,
  assessment: ParcelFeature = parcel,
): OverlapFact | { failed: true } {
  const parcelPoly = asPolyFeature(parcel.geometry)
  const assessmentPoly = asPolyFeature(assessment.geometry)
  if (!parcelPoly || !assessmentPoly) return { failed: true }
  const features = hits.features ?? []
  const clipTargets = features
    .map((hit) => asPolyFeature(hit.geometry))
    .filter((hit): hit is Feature<Polygon | MultiPolygon> => hit !== null)
  if (features.length > 0 && clipTargets.length === 0) return { failed: true }
  try {
    const parcelArea = area(parcelPoly) * SQM_TO_SQFT
    const assessmentArea = area(assessmentPoly) * SQM_TO_SQFT
    let intersectionArea = 0
    let assessmentOverlapArea = 0
    for (const hitPoly of clipTargets) {
      const parcelClip = intersect(featureCollection([parcelPoly, hitPoly]))
      if (parcelClip) intersectionArea += area(parcelClip) * SQM_TO_SQFT
      const assessmentClip = intersect(featureCollection([assessmentPoly, hitPoly]))
      if (assessmentClip) assessmentOverlapArea += area(assessmentClip) * SQM_TO_SQFT
    }
    const parcelOverlapPct = parcelArea > 0 ? (intersectionArea / parcelArea) * 100 : 0
    const assessmentOverlapPct = assessmentArea > 0 ? (assessmentOverlapArea / assessmentArea) * 100 : 0
    return {
      parcelAreaSqft: parcelArea,
      intersectionAreaSqft: intersectionArea,
      parcelOverlapPct: Math.round(parcelOverlapPct * 1000) / 1000,
      overlapPct: Math.round(assessmentOverlapPct * 1000) / 1000,
      assessmentGeometryType: assessment === parcel ? 'PARCEL' : 'DEVELOPMENT_ENVELOPE',
      assessmentGeometryArea: assessmentArea,
      assessmentOverlapArea,
      assessmentOverlapPct: Math.round(assessmentOverlapPct * 1000) / 1000,
      geometryMethod: 'TRUE_POLYGON_CLIP',
      geometryVersion: GEOMETRY_VERSION,
    }
  } catch {
    return { failed: true }
  }
}

export function isClipFact(value: OverlapFact | { failed: true } | undefined): value is OverlapFact {
  return Boolean(value) && !('failed' in (value as { failed?: true }))
}

async function queryJson(url: string, signal?: AbortSignal): Promise<GisFeatureCollection> {
  const question = url.indexOf('?')
  const path = question === -1 ? url : url.slice(0, question)
  const body = question === -1 ? '' : url.slice(question + 1)
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  })
  if (!res.ok) throw new Error(`GIS query failed (${res.status})`)
  return res.json()
}

function parcelParams(feature: ParcelFeature, extra: Record<string, string>): URLSearchParams {
  return new URLSearchParams({
    geometry: JSON.stringify(toEsriPolygon(feature)),
    geometryType: 'esriGeometryPolygon',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '50',
    ...extra,
  })
}

export async function queryPghLayer(
  service: string,
  feature: ParcelFeature,
  extra: Record<string, string> = {},
  signal?: AbortSignal,
) {
  return queryJson(`/api/pgh/${service}/query?${parcelParams(feature, extra)}`, signal)
}

export async function queryPasdaLayer(
  layerId: number,
  feature: ParcelFeature,
  extra: Record<string, string> = {},
  signal?: AbortSignal,
) {
  return queryJson(`/api/pasda/${layerId}/query?${parcelParams(feature, extra)}`, signal)
}

export async function queryFema(feature: ParcelFeature, signal?: AbortSignal) {
  return queryJson(`/api/fema/query?${parcelParams(feature, { outFields: 'FLD_ZONE,ZONE_SUBTY,SFHA_TF' })}`, signal)
}

export function hitCount(fc: GisFeatureCollection): number {
  return fc.features?.length ?? 0
}
