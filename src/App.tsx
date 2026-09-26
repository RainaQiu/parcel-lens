import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchParcelByPin, featureCentroid, normalizePin } from './lib/arcgis'
import { fetchAssessment, searchAssessments } from './lib/ckan'
import { fetchZoningAt } from './lib/zoning'
import { ParcelMap, type ParcelMapHandle } from './map/ParcelMap'
import { ParcelDetails } from './panel/ParcelDetails'
import type { ParcelFeature, SearchHit, SelectedParcel } from './lib/types'
import './App.css'

const MIN_ZOOM = 16

export default function App() {
  const mapRef = useRef<ParcelMapHandle>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(16.6)
  const [selected, setSelected] = useState<SelectedParcel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectAbort = useRef<AbortController | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setHits([])
      setSearchError(null)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchAssessments(trimmed, controller.signal)
        .then((rows) => {
          setHits(rows)
          setSearchError(null)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setSearchError(err instanceof Error ? err.message : 'Search failed')
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 280)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  async function loadParcel(feature: ParcelFeature) {
    selectAbort.current?.abort()
    const controller = new AbortController()
    selectAbort.current = controller
    const pin = feature.properties.PIN ?? ''
    setSelected({ feature, assessment: null, zoning: null })
    setLoading(true)
    setError(null)
    const [lng, lat] = featureCentroid(feature)
    try {
      const [assessment, zoning] = await Promise.all([
        pin ? fetchAssessment(pin, controller.signal) : Promise.resolve(null),
        fetchZoningAt(lng, lat, controller.signal),
      ])
      if (controller.signal.aborted) return
      setSelected({ feature, assessment, zoning })
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Could not load parcel details')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  async function chooseHit(hit: SearchHit) {
    setQuery('')
    setHits([])
    try {
      const feature = await fetchParcelByPin(hit.PARID)
      if (!feature) {
        setError(`No geometry found for ${hit.PARID}`)
        return
      }
      mapRef.current?.flyToFeature(feature)
      await loadParcel(feature)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open parcel')
    }
  }

  async function openFromQuery(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    const compact = trimmed.replace(/[-\s]/g, '')
    const looksLikePin = /^[0-9A-Z]{10,16}$/i.test(compact)
    if (looksLikePin) {
      await chooseHit({ PARID: normalizePin(trimmed) })
      return
    }
    if (hits[0]) await chooseHit(hits[0])
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>Parcel Lens</strong>
          <span>Pittsburgh parcels</span>
        </div>
        <form
          className="search"
          onSubmit={(event) => {
            event.preventDefault()
            void openFromQuery(query)
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search address or parcel ID"
            aria-label="Search address or parcel ID"
            autoComplete="off"
          />
          {searching && <span className="search-status">Searching…</span>}
          {hits.length > 0 && (
            <ul className="results" role="listbox">
              {hits.map((hit) => (
                <li key={hit.PARID}>
                  <button type="button" onClick={() => void chooseHit(hit)}>
                    <span>
                      {[hit.PROPERTYHOUSENUM, hit.PROPERTYADDRESS]
                        .filter(Boolean)
                        .join(' ')}
                    </span>
                    <small>
                      {hit.PARID}
                      {hit.PROPERTYCITY ? ` · ${hit.PROPERTYCITY}` : ''}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchError && <p className="search-error">{searchError}</p>}
        </form>
      </header>

      <main className="workspace">
        <ParcelMap
          ref={mapRef}
          selectedFeature={selected?.feature ?? null}
          onSelectPin={(feature) => void loadParcel(feature)}
          onZoomChange={setZoom}
        />
        {zoom < MIN_ZOOM && (
          <div className="zoom-hint">Zoom in to load parcel boundaries</div>
        )}
        {(selected || loading || error) && (
          <ParcelDetails
            loading={loading}
            error={error}
            data={selected}
            onClose={() => {
              selectAbort.current?.abort()
              setSelected(null)
              setError(null)
            }}
          />
        )}
      </main>
    </div>
  )
}
