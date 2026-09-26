import { Map, NavigationControl, type GeoJSONSource, type MapGeoJSONFeature } from 'maplibre-gl'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { fetchParcelsInBbox } from '../lib/arcgis'
import type { ParcelFeature } from '../lib/types'

const MIN_ZOOM = 16
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

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

    onSelectRef.current = onSelectPin
    onZoomRef.current = onZoomChange
    selectedRef.current = selectedFeature

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
      if (!map?.isStyleLoaded()) return
      const source = map.getSource('selected') as GeoJSONSource | undefined
      source?.setData(
        selectedFeature
          ? { type: 'FeatureCollection', features: [selectedFeature] }
          : EMPTY,
      )
    }, [selectedFeature])

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
