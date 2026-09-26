import { Map, NavigationControl, type GeoJSONSource, type MapGeoJSONFeature, type StyleSpecification } from 'maplibre-gl'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { fetchParcelsInBbox } from '../lib/arcgis'
import type { ParcelFeature } from '../lib/types'

const MIN_ZOOM = 16
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export type Basemap = 'normal' | 'satellite' | 'terrain'

const STYLES: Record<Basemap, string | StyleSpecification> = {
  normal: 'https://tiles.openfreemap.org/styles/positron',
  satellite: rasterStyle(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  ),
  terrain: rasterStyle(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    'Tiles © Esri — Source: Esri, TomTom, Garmin, FAO, NOAA, USGS',
  ),
}

const MODES: { id: Basemap; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
]

function rasterStyle(tiles: string, attribution: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [{ id: 'basemap', type: 'raster', source: 'basemap' }],
  }
}

export type ParcelMapHandle = {
  flyToFeature: (feature: ParcelFeature) => void
}

type Props = {
  selectedFeature: ParcelFeature | null
  onSelectPin: (feature: ParcelFeature) => void
  onZoomChange: (zoom: number) => void
}

export const ParcelMap = forwardRef<ParcelMapHandle, Props>(
  function ParcelMap({ selectedFeature, onSelectPin, onZoomChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<Map | null>(null)
    const onSelectRef = useRef(onSelectPin)
    const onZoomRef = useRef(onZoomChange)
    const abortRef = useRef<AbortController | null>(null)
    const debounceRef = useRef<number | null>(null)
    const selectedRef = useRef<ParcelFeature | null>(selectedFeature)
    const [basemap, setBasemap] = useState<Basemap>('satellite')
    const basemapRef = useRef<Basemap>(basemap)

    onSelectRef.current = onSelectPin
    onZoomRef.current = onZoomChange
    selectedRef.current = selectedFeature
    basemapRef.current = basemap

    useImperativeHandle(ref, () => ({
      flyToFeature(feature) {
        const map = mapRef.current
        if (!map) return
        const bounds = bboxOf(feature)
        map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 800 })
      },
    }))

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return

      const map = new Map({
        container: containerRef.current,
        style: STYLES.satellite,
        center: [-79.9477, 40.4528],
        zoom: 16.6,
        maxZoom: 19,
        minZoom: 11,
      })

      map.addControl(new NavigationControl({ showCompass: true }), 'top-right')
      mapRef.current = map

      const loadParcels = () => {
        const zoom = map.getZoom()
        onZoomRef.current(zoom)
        if (zoom < MIN_ZOOM) {
          const source = map.getSource('parcels') as GeoJSONSource | undefined
          source?.setData(EMPTY)
          return
        }
        abortRef.current?.abort()
        const controller = new AbortController()
        abortRef.current = controller
        const bounds = map.getBounds()
        const bbox: [number, number, number, number] = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth(),
        ]
        void fetchParcelsInBbox(bbox, controller.signal)
          .then((fc) => {
            if (controller.signal.aborted) return
            const source = map.getSource('parcels') as GeoJSONSource | undefined
            source?.setData(fc)
          })
          .catch((err: unknown) => {
            if (controller.signal.aborted) return
            console.error(err)
          })
      }

      const scheduleLoad = () => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        debounceRef.current = window.setTimeout(loadParcels, 280)
      }

      const applySelected = () => {
        const source = map.getSource('selected') as GeoJSONSource | undefined
        const feature = selectedRef.current
        source?.setData(
          feature
            ? { type: 'FeatureCollection', features: [feature] }
            : EMPTY,
        )
      }

      const onParcelClick = (event: { features?: MapGeoJSONFeature[] }) => {
        const raw = event.features?.[0]
        if (!raw?.geometry || !raw.properties) return
        onSelectRef.current({
          type: 'Feature',
          geometry: raw.geometry as ParcelFeature['geometry'],
          properties: raw.properties as ParcelFeature['properties'],
        })
      }
      const onParcelEnter = () => {
        map.getCanvas().style.cursor = 'pointer'
      }
      const onParcelLeave = () => {
        map.getCanvas().style.cursor = ''
      }

      const onStyleReady = () => {
        addParcelLayers(map, basemapRef.current)
        applySelected()
        loadParcels()
        map.off('click', 'parcels-fill', onParcelClick)
        map.off('mouseenter', 'parcels-fill', onParcelEnter)
        map.off('mouseleave', 'parcels-fill', onParcelLeave)
        map.on('click', 'parcels-fill', onParcelClick)
        map.on('mouseenter', 'parcels-fill', onParcelEnter)
        map.on('mouseleave', 'parcels-fill', onParcelLeave)
      }
      map.on('style.load', onStyleReady)
      map.on('moveend', scheduleLoad)

      return () => {
        abortRef.current?.abort()
        if (debounceRef.current) window.clearTimeout(debounceRef.current)
        map.remove()
        mapRef.current = null
      }
    }, [])

    useEffect(() => {
      const map = mapRef.current
      if (!map?.isStyleLoaded()) return
      const source = map.getSource('selected') as GeoJSONSource | undefined
      source?.setData(
        selectedFeature
          ? { type: 'FeatureCollection', features: [selectedFeature] }
          : EMPTY,
      )
    }, [selectedFeature])

    function switchBasemap(next: Basemap) {
      if (next === basemapRef.current) return
      basemapRef.current = next
      setBasemap(next)
      mapRef.current?.setStyle(STYLES[next])
    }

    return (
      <div className="map-wrap">
        <div ref={containerRef} className="map-canvas" aria-label="Pittsburgh parcel map" />
        <div className="basemap-toggle" role="group" aria-label="Map view">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={basemap === mode.id}
              onClick={() => switchBasemap(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
    )
  },
)

const LIGHT_PARCEL_PAINT = {
  fill: '#2563eb',
  fillOpacity: 0.18,
  line: '#1d4ed8',
  lineWidth: 1.2,
  selectedLine: '#b45309',
}

const PARCEL_PAINT: Record<Basemap, typeof LIGHT_PARCEL_PAINT> = {
  normal: LIGHT_PARCEL_PAINT,
  terrain: LIGHT_PARCEL_PAINT,
  satellite: {
    fill: '#38bdf8',
    fillOpacity: 0.22,
    line: '#e0f2fe',
    lineWidth: 1.4,
    selectedLine: '#fde68a',
  },
}

function addParcelLayers(map: Map, basemap: Basemap) {
  const paint = PARCEL_PAINT[basemap]
  if (!map.getSource('parcels')) {
    map.addSource('parcels', { type: 'geojson', data: EMPTY })
  }
  if (!map.getSource('selected')) {
    map.addSource('selected', { type: 'geojson', data: EMPTY })
  }
  if (!map.getLayer('parcels-fill')) {
    map.addLayer({
      id: 'parcels-fill',
      type: 'fill',
      source: 'parcels',
      paint: {
        'fill-color': paint.fill,
        'fill-opacity': paint.fillOpacity,
      },
    })
  }
  if (!map.getLayer('parcels-line')) {
    map.addLayer({
      id: 'parcels-line',
      type: 'line',
      source: 'parcels',
      paint: {
        'line-color': paint.line,
        'line-width': paint.lineWidth,
      },
    })
  }
  if (!map.getLayer('selected-fill')) {
    map.addLayer({
      id: 'selected-fill',
      type: 'fill',
      source: 'selected',
      paint: {
        'fill-color': '#f59e0b',
        'fill-opacity': 0.45,
      },
    })
  }
  if (!map.getLayer('selected-line')) {
    map.addLayer({
      id: 'selected-line',
      type: 'line',
      source: 'selected',
      paint: {
        'line-color': paint.selectedLine,
        'line-width': 2.5,
      },
    })
  }
  map.setPaintProperty('parcels-fill', 'fill-color', paint.fill)
  map.setPaintProperty('parcels-fill', 'fill-opacity', paint.fillOpacity)
  map.setPaintProperty('parcels-line', 'line-color', paint.line)
  map.setPaintProperty('parcels-line', 'line-width', paint.lineWidth)
  map.setPaintProperty('selected-line', 'line-color', paint.selectedLine)
}

function bboxOf(feature: ParcelFeature): [[number, number], [number, number]] {
  const coords: [number, number][] = []
  const geom = feature.geometry
  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      for (const [lng, lat] of ring) coords.push([lng, lat])
    }
  } else {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        for (const [lng, lat] of ring) coords.push([lng, lat])
      }
    }
  }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of coords) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ]
}
