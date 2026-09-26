import type { ParcelFeature, SelectedParcel } from './types'

// Every geometry and property here is synthetic. It is positioned near the
// map's opening view for interaction testing and represents no real parcel.
export const DEMO_PARCEL: ParcelFeature = {
  type: 'Feature',
  properties: { PIN: 'DEMO-PL-001', CALCACREAGE: 0.18, MAPBLOCKLOT: 'SYNTHETIC' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-79.94785, 40.45260],
      [-79.94745, 40.45260],
      [-79.94745, 40.45290],
      [-79.94785, 40.45290],
      [-79.94785, 40.45260],
    ]],
  },
}

export const DEMO_FLOOD_OVERLAY: GeoJSON.Feature<GeoJSON.Polygon> = {
  type: 'Feature',
  properties: { name: 'Synthetic flood review overlay', version: 'demo-flood-v1.0' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-79.94762, 40.45252],
      [-79.94717, 40.45252],
      [-79.94717, 40.45302],
      [-79.94762, 40.45302],
      [-79.94762, 40.45252],
    ]],
  },
}

export const DEMO_PARCEL_B: ParcelFeature = {
  type: 'Feature',
  properties: { PIN: 'DEMO-PL-002', CALCACREAGE: 0.21, MAPBLOCKLOT: 'SYNTHETIC-B' },
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-79.94838, 40.45261],
      [-79.94802, 40.45261],
      [-79.94802, 40.45292],
      [-79.94838, 40.45292],
      [-79.94838, 40.45261],
    ]],
  },
}

export const DEMO_SELECTED: SelectedParcel = {
  feature: DEMO_PARCEL,
  assessment: {
    PARID: 'DEMO-PL-001',
    PROPERTYADDRESS: 'Illustrative site · synthetic data',
    PROPERTYCITY: 'Pittsburgh',
    PROPERTYSTATE: 'PA',
    USEDESC: 'Vacant parcel (mock)',
    MUNIDESC: 'Pittsburgh (mock)',
    LOTAREA: 7841,
  },
  zoning: { code: 'DEMO-R', description: 'Illustrative residential district — not a City designation' },
}

export const DEMO_SELECTED_B: SelectedParcel = {
  feature: DEMO_PARCEL_B,
  assessment: {
    PARID: 'DEMO-PL-002',
    PROPERTYADDRESS: 'Comparison site · synthetic data',
    PROPERTYCITY: 'Pittsburgh',
    PROPERTYSTATE: 'PA',
    USEDESC: 'Vacant parcel (mock)',
    MUNIDESC: 'Pittsburgh (mock)',
    LOTAREA: 9148,
  },
  zoning: { code: 'DEMO-R', description: 'Illustrative residential district — not a City designation' },
}

export const DEMO_VERSIONS = {
  rubric: 'demo-rules-v1.0',
  zoning: 'demo-zoning-v1.0',
  flood: 'demo-flood-v1.0',
  parcel: 'demo-parcel-v1.0',
  asOf: '2026-09-26',
}
