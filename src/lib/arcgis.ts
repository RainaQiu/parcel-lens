import type { ParcelFeature, ParcelProperties } from './types'

const PITTSBURGH_WHERE = 'MUNICODE BETWEEN 100 AND 132'

export function normalizePin(raw: string): string {
  const cleaned = raw.replace(/[-\s]/g, '').toUpperCase()
  if (/^\d{1,15}[A-Z]\d+$/.test(cleaned) || /^\d{16}$/.test(cleaned)) {
    return cleaned.padStart(16, '0')
  }
  return cleaned.padStart(16, '0')
}

export function featureCentroid(
  feature: GeoJSON.Feature<GeoJSON.Geometry>,
): [number, number] {
  const coords = collectCoords(feature.geometry)
  if (coords.length === 0) return [-79.947713, 40.452775]
  let x = 0
  let y = 0
  for (const [lng, lat] of coords) {
    x += lng
    y += lat
  }
  return [x / coords.length, y / coords.length]
}

function collectCoords(geometry: GeoJSON.Geometry): [number, number][] {
  if (geometry.type === 'Point') {
    return [[geometry.coordinates[0], geometry.coordinates[1]]]
  }
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0].map((coord) => [coord[0], coord[1]])
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flatMap((poly) =>
      poly[0].map((coord) => [coord[0], coord[1]] as [number, number]),
    )
  }
  return []
}

async function queryParcels(
  params: URLSearchParams,
  signal?: AbortSignal,
): Promise<GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, ParcelProperties>> {
  const res = await fetch(`/api/parcels/query?${params}`, { signal })
  if (!res.ok) {
    throw new Error(`Parcel query failed (${res.status})`)
  }
  return res.json()
}

export async function fetchParcelsInBbox(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
) {
  const [west, south, east, north] = bbox
  const params = new URLSearchParams({
    geometry: `${west},${south},${east},${north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'PIN,MAPBLOCKLOT,MUNICODE,CALCACREAGE,MODIFIEDON',
    returnGeometry: 'true',
    outSR: '4326',
    where: PITTSBURGH_WHERE,
    f: 'geojson',
    resultRecordCount: '1000',
  })
  return queryParcels(params, signal)
}

export async function fetchParcelByPin(pin: string, signal?: AbortSignal) {
  const normalized = normalizePin(pin)
  const params = new URLSearchParams({
    where: `PIN='${normalized}'`,
    outFields: 'PIN,MAPBLOCKLOT,MUNICODE,CALCACREAGE,MODIFIEDON',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '1',
  })
  const fc = await queryParcels(params, signal)
  return (fc.features[0] as ParcelFeature | undefined) ?? null
}
