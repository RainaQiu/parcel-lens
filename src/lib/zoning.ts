import type { ZoningInfo } from './types'

export async function fetchZoningAt(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<ZoningInfo | null> {
  const params = new URLSearchParams({
    geometry: JSON.stringify({ x: lng, y: lat }),
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'zon_new,legendtype,full_zoning_type',
    returnGeometry: 'false',
    f: 'geojson',
  })
  const res = await fetch(`/api/zoning/query?${params}`, { signal })
  if (!res.ok) {
    throw new Error(`Zoning query failed (${res.status})`)
  }
  const fc = await res.json()
  const props = fc.features?.[0]?.properties as
    | {
        zon_new?: string
        legendtype?: string
        full_zoning_type?: string
      }
    | undefined
  if (!props) return null
  return {
    code: props.zon_new?.trim() ?? '',
    description: (props.legendtype || props.full_zoning_type || '').trim(),
  }
}
