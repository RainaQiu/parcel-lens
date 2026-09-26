import { Map, NavigationControl, type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { fetchParcelsInBbox } from '../lib/arcgis'
import { DEMO_FLOOD_OVERLAY } from '../lib/demo'
import type { ParcelFeature } from '../lib/types'

const MIN_ZOOM = 16
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export type ParcelMapHandle = {
  flyToFeature: (feature: ParcelFeature) => void
  fitToFeatures: (features: ParcelFeature[]) => void
}

type Props = {
  selectedFeature: ParcelFeature | null
  pinnedFeature: ParcelFeature | null
  demoMode: boolean
  showFlood: boolean
  onSelectPin: (feature: ParcelFeature) => void
  onZoomChange: (zoom: number) => void
}

export const ParcelMap = forwardRef<ParcelMapHandle, Props>(
  function ParcelMap({ selectedFeature, pinnedFeature, demoMode, showFlood, onSelectPin, onZoomChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<Map | null>(null)
    const onSelectRef = useRef(onSelectPin)
    const onZoomRef = useRef(onZoomChange)
    const abortRef = useRef<AbortController | null>(null)
    const debounceRef = useRef<number | null>(null)
    const selectedRef = useRef<ParcelFeature | null>(selectedFeature)
    const pinnedRef = useRef<ParcelFeature | null>(pinnedFeature)
    const demoRef = useRef(demoMode)
    const floodRef = useRef(showFlood)

    useEffect(() => {
      onSelectRef.current = onSelectPin
      onZoomRef.current = onZoomChange
      selectedRef.current = selectedFeature
      pinnedRef.current = pinnedFeature
      demoRef.current = demoMode
      floodRef.current = showFlood
    }, [onSelectPin, onZoomChange, selectedFeature, pinnedFeature, demoMode, showFlood])

    useImperativeHandle(ref, () => ({
      flyToFeature(feature) {
        const map = mapRef.current
        if (!map) return
        const bounds = bboxOf(feature)
        map.fitBounds(bounds, { padding: map.getContainer().clientWidth < 500 ? 30 : 80, maxZoom: 18, duration: 800 })
      },
      fitToFeatures(features) {
        const map = mapRef.current
        if (!map || features.length === 0) return
        const bounds = features.map(bboxOf)
        map.fitBounds([
          [Math.min(...bounds.map((box) => box[0][0])), Math.min(...bounds.map((box) => box[0][1]))],
          [Math.max(...bounds.map((box) => box[1][0])), Math.max(...bounds.map((box) => box[1][1]))],
        ], { padding: map.getContainer().clientWidth < 500 ? 30 : 105, maxZoom: 18, duration: 800 })
      },
    }))

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return

      const map = new Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [-79.9477, 40.4528],
        zoom: 16.6,
        maxZoom: 19,
        minZoom: 11,
      })

      map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
      mapRef.current = map

      const loadParcels = () => {
        const zoom = map.getZoom()
        onZoomRef.current(zoom)
        if (demoRef.current) {
          abortRef.current?.abort()
          const source = map.getSource('parcels') as GeoJSONSource | undefined
          source?.setData(EMPTY)
          return
        }
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

      map.on('load', () => {
        map.addSource('parcels', { type: 'geojson', data: EMPTY })
        map.addSource('selected', { type: 'geojson', data: EMPTY })
        map.addSource('demo-flood', { type: 'geojson', data: EMPTY })
        map.addSource('pinned', { type: 'geojson', data: EMPTY })
        map.addLayer({
          id: 'parcels-fill',
          type: 'fill',
          source: 'parcels',
          paint: {
            'fill-color': '#658f92',
            'fill-opacity': 0.12,
          },
        })
        map.addLayer({
          id: 'parcels-line',
          type: 'line',
          source: 'parcels',
          paint: {
            'line-color': '#4b7a84',
            'line-width': 1,
          },
        })
        map.addLayer({
          id: 'demo-flood-fill',
          type: 'fill',
          source: 'demo-flood',
          paint: { 'fill-color': '#4b94b8', 'fill-opacity': 0.34 },
        })
        map.addLayer({
          id: 'demo-flood-line',
          type: 'line',
          source: 'demo-flood',
          paint: { 'line-color': '#26769c', 'line-width': 2, 'line-dasharray': [2, 1.5] },
        })
        map.addLayer({
          id: 'pinned-fill',
          type: 'fill',
          source: 'pinned',
          paint: { 'fill-color': '#2d86a8', 'fill-opacity': 0.27 },
        })
        map.addLayer({
          id: 'pinned-line',
          type: 'line',
          source: 'pinned',
          paint: { 'line-color': '#17678b', 'line-width': 3 },
        })
        map.addLayer({
          id: 'selected-fill',
          type: 'fill',
          source: 'selected',
          paint: {
            'fill-color': '#e9a83c',
            'fill-opacity': 0.42,
          },
        })
        map.addLayer({
          id: 'selected-line',
          type: 'line',
          source: 'selected',
          paint: {
            'line-color': '#af5e1d',
            'line-width': 2.7,
          },
        })
        applySelected()
        const pinnedSource = map.getSource('pinned') as GeoJSONSource | undefined
        pinnedSource?.setData(pinnedRef.current ? { type: 'FeatureCollection', features: [pinnedRef.current] } : EMPTY)
        const flood = map.getSource('demo-flood') as GeoJSONSource | undefined
        flood?.setData(demoRef.current && floodRef.current ? { type: 'FeatureCollection', features: [DEMO_FLOOD_OVERLAY] } : EMPTY)
        loadParcels()
      })
      map.on('moveend', scheduleLoad)

      map.on('click', 'parcels-fill', (event: { features?: MapGeoJSONFeature[] }) => {
        const raw = event.features?.[0]
        if (!raw?.geometry || !raw.properties) return
        onSelectRef.current({
          type: 'Feature',
          geometry: raw.geometry as ParcelFeature['geometry'],
          properties: raw.properties as ParcelFeature['properties'],
        })
      })

      map.on('mouseenter', 'parcels-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'parcels-fill', () => {
        map.getCanvas().style.cursor = ''
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
      if (!map) return
      if (map.isStyleLoaded()) {
        const parcels = map.getSource('parcels') as GeoJSONSource | undefined
        const flood = map.getSource('demo-flood') as GeoJSONSource | undefined
        if (demoMode) parcels?.setData(EMPTY)
        else map.fire('moveend')
        flood?.setData(demoMode && showFlood ? { type: 'FeatureCollection', features: [DEMO_FLOOD_OVERLAY] } : EMPTY)
      }

    }, [demoMode, showFlood])

    useEffect(() => {
      const node = containerRef.current
      const map = mapRef.current
      if (!node || !map) return
      const observer = new ResizeObserver(() => map.resize())
      observer.observe(node)
      return () => observer.disconnect()
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

    useEffect(() => {
      const map = mapRef.current
      if (!map?.isStyleLoaded()) return
      const source = map.getSource('pinned') as GeoJSONSource | undefined
      source?.setData(pinnedFeature ? { type: 'FeatureCollection', features: [pinnedFeature] } : EMPTY)
    }, [pinnedFeature])

    return <div ref={containerRef} className="map-canvas" aria-label="Pittsburgh parcel map" />
  },
)

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
