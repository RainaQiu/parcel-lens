import type { DataDrivenPropertyValueSpecification } from 'maplibre-gl'
import type { ZoningInfo } from './types'

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Official PGHWebZoning unique-value colors keyed by `zon_new`. */
export const ZONING_COLORS: Record<string, string> = {
  'GT-E': '#004c73',
  'GT-A': '#004c73',
  'GT-B': '#004c73',
  'GT-C': '#004c73',
  'GT-D': '#004c73',
  GPRA: '#004c73',
  GPRB: '#004c73',
  GPRC: '#004c73',
  'OPR-A': '#004c73',
  'OPR-B': '#004c73',
  'OPR-C': '#004c73',
  'OPR-D': '#004c73',
  'UPR-A': '#004c73',
  'UPR-B': '#004c73',
  'RIV-GI': '#e4edc2',
  'RIV-IMU': '#e4edc2',
  'RIV-MU': '#e4edc2',
  'RIV-NS': '#e4edc2',
  'RIV-RM': '#e4edc2',
  'SP-9': '#ababab',
  'SP-10': '#ababab',
  'SP-11': '#ababab',
  'SP-7': '#ababab',
  'SP-8': '#ababab',
  'SP-1': '#ababab',
  'SP-2': '#ababab',
  'SP-3': '#ababab',
  'SP-4': '#ababab',
  'SP-5': '#ababab',
  'SP-6': '#ababab',
  RP: '#d4d4d4',
  AP: '#d4d4d4',
  CP: '#d4d4d4',
  EMI: '#73dfff',
  NDO: '#f9c2fe',
  P: '#21cc00',
  H: '#d0fe72',
  GI: '#a8a800',
  NDI: '#a80084',
  UI: '#895a44',
  HC: '#ffbee8',
  LNC: '#e32914',
  UNC: '#880000',
  'UC-E': '#29ab91',
  'UC-MU': '#5a85c7',
  'R1A-M': '#ffffbe',
  'R1A-H': '#ffffbe',
  'R1A-VH': '#ffffbe',
  'R1D-VL': '#ffebaf',
  'R1D-L': '#ffebaf',
  'R1D-M': '#ffebaf',
  'R1D-H': '#ffebaf',
  'R1D-VH': '#ffebaf',
  'R2-L': '#ffaa00',
  'R2-M': '#ffaa00',
  'R2-H': '#ffaa00',
  'R2-VH': '#ffaa00',
  'R3-L': '#ffaa00',
  'R3-M': '#ffaa00',
  'RM-VL': '#ffd280',
  'RM-M': '#ffd280',
  'RM-H': '#ffd280',
  'RM-VH': '#ffd280',
  'R-MU': '#cf6557',
  MTOBOR: '#000000',
}

export const ZONING_LEGEND: { label: string; color: string }[] = [
  { label: 'Golden Triangle / Public Realm', color: '#004c73' },
  { label: 'Riverfront', color: '#e4edc2' },
  { label: 'Specially Planned', color: '#ababab' },
  { label: 'Planned Unit Development', color: '#d4d4d4' },
  { label: 'Educational / Medical Institution', color: '#73dfff' },
  { label: 'Neighborhood Office', color: '#f9c2fe' },
  { label: 'Park', color: '#21cc00' },
  { label: 'Hillside', color: '#d0fe72' },
  { label: 'General Industrial', color: '#a8a800' },
  { label: 'Neighborhood Industrial', color: '#a80084' },
  { label: 'Urban Industrial', color: '#895a44' },
  { label: 'Highway Commercial', color: '#ffbee8' },
  { label: 'Local Neighborhood Commercial', color: '#e32914' },
  { label: 'Urban Neighborhood Commercial', color: '#880000' },
  { label: 'Urban Center Employment', color: '#29ab91' },
  { label: 'Urban Center Mixed Use', color: '#5a85c7' },
  { label: 'Residential Single-Unit Attached', color: '#ffffbe' },
  { label: 'Residential Single-Unit Detached', color: '#ffebaf' },
  { label: 'Residential Two- / Three-Unit', color: '#ffaa00' },
  { label: 'Residential Multi-Unit', color: '#ffd280' },
  { label: 'Residential Mixed Use', color: '#cf6557' },
  { label: 'MTOBOR', color: '#000000' },
]

export const ZONING_FILL_COLOR = [
  'match',
  ['get', 'zon_new'],
  ...Object.entries(ZONING_COLORS).flatMap(([code, color]) => [code, color]),
  '#9ca3af',
] as unknown as DataDrivenPropertyValueSpecification<string>

let zoningMapPromise: Promise<GeoJSON.FeatureCollection> | null = null

export function fetchZoningMap(): Promise<GeoJSON.FeatureCollection> {
  if (!zoningMapPromise) {
    zoningMapPromise = loadZoningMap().catch((err) => {
      zoningMapPromise = null
      throw err
    })
  }
  return zoningMapPromise
}

async function loadZoningMap(): Promise<GeoJSON.FeatureCollection> {
  const features: GeoJSON.Feature[] = []
  const pageSize = 1000
  let offset = 0
  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'zon_new,legendtype,full_zoning_type',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
      resultRecordCount: String(pageSize),
      resultOffset: String(offset),
    })
    const res = await fetch(`/api/zoning/query?${params}`)
    if (!res.ok) {
      throw new Error(`Zoning map query failed (${res.status})`)
    }
    const fc = (await res.json()) as GeoJSON.FeatureCollection
    const page = fc.features ?? []
    features.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }
  return features.length ? { type: 'FeatureCollection', features } : EMPTY
}

let layerUpdatedAtPromise: Promise<string | null> | null = null

async function fetchZoningLayerUpdatedAt(): Promise<string | null> {
  if (!layerUpdatedAtPromise) {
    layerUpdatedAtPromise = (async () => {
      try {
        const res = await fetch('/api/zoning?f=json')
        if (!res.ok) return null
        const data = (await res.json()) as {
          editingInfo?: { dataLastEditDate?: number; lastEditDate?: number }
        }
        const ms = data.editingInfo?.dataLastEditDate ?? data.editingInfo?.lastEditDate
        return typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null
      } catch {
        layerUpdatedAtPromise = null
        return null
      }
    })()
  }
  return layerUpdatedAtPromise
}

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
    outFields: 'zon_new,legendtype,full_zoning_type,municode',
    returnGeometry: 'false',
    f: 'geojson',
  })
  const [res, updatedAt] = await Promise.all([
    fetch(`/api/zoning/query?${params}`, { signal }),
    fetchZoningLayerUpdatedAt(),
  ])
  if (!res.ok) {
    throw new Error(`Zoning query failed (${res.status})`)
  }
  const fc = await res.json()
  const props = fc.features?.[0]?.properties as
    | {
        zon_new?: string
        legendtype?: string
        full_zoning_type?: string
        municode?: string
      }
    | undefined
  if (!props) return null
  return {
    code: props.zon_new?.trim() ?? '',
    description: (props.legendtype || props.full_zoning_type || '').trim(),
    definitionUrl: httpsUrl(props.municode),
    updatedAt,
  }
}

function httpsUrl(raw: string | undefined): string | null {
  const value = raw?.trim() ?? ''
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}
