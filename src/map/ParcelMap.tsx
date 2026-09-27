import { Map, NavigationControl, type GeoJSONSource, type MapGeoJSONFeature, type StyleSpecification } from 'maplibre-gl'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { fetchParcelByPin, fetchParcelsInBbox, featureCentroid } from '../lib/arcgis'
import type { ParcelFeature } from '../lib/types'
import { fetchZoningMap, ZONING_FILL_COLOR, ZONING_LEGEND } from '../lib/zoning'

const MIN_ZOOM = 16
const MAP_VIEW_KEY = 'parcel-lens:map-view:v1'
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
const ZONING_SOLID_OPACITY = 0.82
const ZONING_ZOOMED_OPACITY = 0.2

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
  resize: () => void
}

type Props = {
  selectedFeature: ParcelFeature | null
  savedPins: string[]
  onSelectPin: (feature: ParcelFeature) => void
  onZoomChange: (zoom: number) => void
}

export const ParcelMap = forwardRef<ParcelMapHandle, Props>(
  function ParcelMap({ selectedFeature, savedPins, onSelectPin, onZoomChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<Map | null>(null)
    const onSelectRef = useRef(onSelectPin)
    const onZoomRef = useRef(onZoomChange)
    const abortRef = useRef<AbortController | null>(null)
    const debounceRef = useRef<number | null>(null)
    const selectedRef = useRef<ParcelFeature | null>(selectedFeature)
    const savedFeaturesRef = useRef<ParcelFeature[]>([])
    const [basemap, setBasemap] = useState<Basemap>('satellite')
    const [zoningVisible, setZoningVisible] = useState(true)
    const [legendOpen, setLegendOpen] = useState(false)
    const basemapRef = useRef<Basemap>(basemap)
    const zoningVisibleRef = useRef(true)
    const zoningDataRef = useRef<GeoJSON.FeatureCollection>(EMPTY)

    useEffect(() => {
      onSelectRef.current = onSelectPin
      onZoomRef.current = onZoomChange
      selectedRef.current = selectedFeature
      basemapRef.current = basemap
      zoningVisibleRef.current = zoningVisible
    }, [onSelectPin, onZoomChange, selectedFeature, basemap, zoningVisible])

    useImperativeHandle(ref, () => ({
      resize() { mapRef.current?.resize() },
      flyToFeature(feature) {
        const map = mapRef.current
        if (!map) return
        const bounds = bboxOf(feature)
        map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 800 })
      },
    }))

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return

      let initialView: { center: [number, number]; zoom: number } = { center: [-79.9477, 40.4528], zoom: 16.6 }
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(MAP_VIEW_KEY) ?? 'null')
        if (Array.isArray(saved?.center) && saved.center.length === 2 && saved.center.every(Number.isFinite) && Number.isFinite(saved.zoom)) initialView = saved
      } catch { /* Use the default Pittsburgh view. */ }

      const map = new Map({
        container: containerRef.current,
        style: STYLES.satellite,
        center: initialView.center,
        zoom: initialView.zoom,
        maxZoom: 19,
        minZoom: 11,
      })

      map.addControl(new NavigationControl({ showCompass: true }), 'top-right')
      mapRef.current = map
      map.on('moveend', () => {
        const center = map.getCenter()
        window.sessionStorage.setItem(MAP_VIEW_KEY, JSON.stringify({ center: [center.lng, center.lat], zoom: map.getZoom() }))
      })

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
        applySelectedHighlight(map, selectedRef.current)
      }
      const applySaved = () => applySavedHighlights(map, savedFeaturesRef.current)

      const onParcelClick = (event: { features?: MapGeoJSONFeature[] }) => {
        const raw = event.features?.[0]
        if (!raw?.geometry || !raw.properties) return
        onSelectRef.current({
          type: 'Feature',
          geometry: structuredClone(raw.geometry) as ParcelFeature['geometry'],
          properties: { ...raw.properties } as ParcelFeature['properties'],
        })
      }
      const onParcelEnter = () => {
        map.getCanvas().style.cursor = 'pointer'
      }
      const onParcelLeave = () => {
        map.getCanvas().style.cursor = ''
      }

      const applyZoning = () => {
        const source = map.getSource('zoning') as GeoJSONSource | undefined
        source?.setData(zoningDataRef.current)
      }

      const onStyleReady = () => {
        addMapLayers(map, basemapRef.current)
        applyZoning()
        setZoningLayerVisibility(map, zoningVisibleRef.current)
        applySelected()
        applySaved()
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

      void fetchZoningMap()
        .then((fc) => {
          zoningDataRef.current = fc
          const source = mapRef.current?.getSource('zoning') as GeoJSONSource | undefined
          source?.setData(fc)
        })
        .catch((err: unknown) => {
          console.error(err)
        })

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
      applySelectedHighlight(map, selectedFeature)
    }, [selectedFeature])

    useEffect(() => {
      const controller = new AbortController()
      if (!savedPins.length) {
        savedFeaturesRef.current = []
        const map = mapRef.current
        if (map?.isStyleLoaded()) applySavedHighlights(map, [])
        return () => controller.abort()
      }
      void Promise.allSettled(savedPins.map((pin) => fetchParcelByPin(pin, controller.signal))).then((results) => {
        if (controller.signal.aborted) return
        const features = results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
        savedFeaturesRef.current = features
        const map = mapRef.current
        if (map?.isStyleLoaded()) applySavedHighlights(map, features)
      })
      return () => controller.abort()
    }, [savedPins])

    useEffect(() => {
      const map = mapRef.current
      if (!map?.isStyleLoaded()) return
      setZoningLayerVisibility(map, zoningVisible)
    }, [zoningVisible])

    function switchBasemap(next: Basemap) {
      if (next === basemapRef.current) return
      basemapRef.current = next
      setBasemap(next)
      mapRef.current?.setStyle(STYLES[next])
    }

    return (
      <div className="map-wrap">
        <div ref={containerRef} className="map-canvas" aria-label="Pittsburgh parcel map" />
        <div className="map-corner">
          <aside className="zoning-legend" aria-label="Zoning legend">
            <div className="zoning-legend-header">
              <span>Zoning</span>
              <button
                type="button"
                className="zoning-legend-toggle"
                aria-expanded={legendOpen}
                aria-label={legendOpen ? 'Minimize zoning legend' : 'Show zoning legend'}
                onClick={() => setLegendOpen((open) => !open)}
              >
                {legendOpen ? '−' : '+'}
              </button>
            </div>
            {legendOpen && (
              <><label className="legend-layer-switch"><input type="checkbox" checked={zoningVisible} onChange={(event) => setZoningVisible(event.target.checked)} /> Show zoning layer</label><ul>
                {ZONING_LEGEND.map((item) => (
                  <li key={item.label}>
                    <span style={{ background: item.color }} />
                    {item.label}
                  </li>
                ))}
              </ul></>
            )}
          </aside>
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
      </div>
    )
  },
)

const LIGHT_PARCEL_PAINT = {
  fill: '#2563eb',
  fillOpacity: 0.18,
  line: '#1d4ed8',
  lineWidth: 1.2,
}

const SELECTED_PAINT = {
  fill: '#c026d3',
  fillOpacity: 0.55,
  line: '#fafafa',
  lineWidth: 3,
}

const PARCEL_PAINT: Record<Basemap, typeof LIGHT_PARCEL_PAINT> = {
  normal: LIGHT_PARCEL_PAINT,
  terrain: LIGHT_PARCEL_PAINT,
  satellite: {
    fill: '#38bdf8',
    fillOpacity: 0.22,
    line: '#e0f2fe',
    lineWidth: 1.4,
  },
}

function addMapLayers(map: Map, basemap: Basemap) {
  const paint = PARCEL_PAINT[basemap]
  if (!map.getSource('zoning')) {
    map.addSource('zoning', { type: 'geojson', data: EMPTY })
  }
  if (!map.getSource('parcels')) {
    map.addSource('parcels', { type: 'geojson', data: EMPTY })
  }
  if (!map.getSource('selected')) {
    map.addSource('selected', { type: 'geojson', data: EMPTY })
  }
  if (!map.getSource('saved-parcels')) map.addSource('saved-parcels', { type: 'geojson', data: EMPTY })
  if (!map.getSource('saved-markers')) map.addSource('saved-markers', { type: 'geojson', data: EMPTY })
  if (!map.getLayer('zoning-fill')) {
    map.addLayer({
      id: 'zoning-fill',
      type: 'fill',
      source: 'zoning',
      paint: {
        'fill-color': ZONING_FILL_COLOR,
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          MIN_ZOOM - 0.35,
          ZONING_SOLID_OPACITY,
          MIN_ZOOM,
          ZONING_ZOOMED_OPACITY,
        ],
      },
    })
  }
  if (!map.getLayer('zoning-line')) {
    map.addLayer({
      id: 'zoning-line',
      type: 'line',
      source: 'zoning',
      paint: {
        'line-color': '#4e4e4e',
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          MIN_ZOOM - 0.35,
          0.8,
          MIN_ZOOM,
          0.4,
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          MIN_ZOOM - 0.35,
          0.85,
          MIN_ZOOM,
          0.25,
        ],
      },
    })
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
    map.addLayer({ id: 'saved-outline', type: 'line', source: 'saved-parcels', paint: { 'line-color': '#facc15', 'line-width': 4 } })
    map.addLayer({ id: 'saved-marker', type: 'circle', source: 'saved-markers', paint: { 'circle-color': '#facc15', 'circle-radius': 9, 'circle-stroke-color': '#142033', 'circle-stroke-width': 2 } })
    map.addLayer({
      id: 'selected-fill',
      type: 'fill',
      source: 'selected',
      paint: {
        'fill-color': SELECTED_PAINT.fill,
        'fill-opacity': SELECTED_PAINT.fillOpacity,
      },
    })
  }
  if (!map.getLayer('selected-line')) {
    map.addLayer({
      id: 'selected-line',
      type: 'line',
      source: 'selected',
      paint: {
        'line-color': SELECTED_PAINT.line,
        'line-width': SELECTED_PAINT.lineWidth,
      },
    })
  }
  map.setPaintProperty('parcels-fill', 'fill-color', paint.fill)
  map.setPaintProperty('parcels-fill', 'fill-opacity', paint.fillOpacity)
  map.setPaintProperty('parcels-line', 'line-color', paint.line)
  map.setPaintProperty('parcels-line', 'line-width', paint.lineWidth)
  map.setPaintProperty('selected-fill', 'fill-color', SELECTED_PAINT.fill)
  map.setPaintProperty('selected-fill', 'fill-opacity', SELECTED_PAINT.fillOpacity)
  map.setPaintProperty('selected-line', 'line-color', SELECTED_PAINT.line)
  map.setPaintProperty('selected-line', 'line-width', SELECTED_PAINT.lineWidth)
}

function applySavedHighlights(map: Map, features: ParcelFeature[]) {
  const outlines = map.getSource('saved-parcels') as GeoJSONSource | undefined
  outlines?.setData({ type: 'FeatureCollection', features })
  const markers = map.getSource('saved-markers') as GeoJSONSource | undefined
  markers?.setData({ type: 'FeatureCollection', features: features.map((feature) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: featureCentroid(feature) }, properties: { PIN: feature.properties.PIN } })) })
}

function applySelectedHighlight(map: Map, feature: ParcelFeature | null) {
  const source = map.getSource('selected') as GeoJSONSource | undefined
  source?.setData(
    feature
      ? { type: 'FeatureCollection', features: [feature] }
      : { type: 'FeatureCollection', features: [] },
  )
  const visibility = feature ? 'visible' : 'none'
  if (map.getLayer('selected-fill')) {
    map.setLayoutProperty('selected-fill', 'visibility', visibility)
  }
  if (map.getLayer('selected-line')) {
    map.setLayoutProperty('selected-line', 'visibility', visibility)
  }
}

function setZoningLayerVisibility(map: Map, visible: boolean) {
  const visibility = visible ? 'visible' : 'none'
  if (map.getLayer('zoning-fill')) {
    map.setLayoutProperty('zoning-fill', 'visibility', visibility)
  }
  if (map.getLayer('zoning-line')) {
    map.setLayoutProperty('zoning-line', 'visibility', visibility)
  }
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
