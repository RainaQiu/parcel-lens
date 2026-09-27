import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchParcelByPin, featureCentroid } from './lib/arcgis'
import { fetchAssessment, searchAssessments } from './lib/ckan'
import { collectLdesLayers, scoreInputs } from './lib/ldes'
import { observeQuery } from './lib/evidence'
import { assessmentMatchesParcel, isCurrentSelection, resolveSearchSubmission } from './lib/selection'
import { fetchZoningAt } from './lib/zoning'
import { ParcelMap, type ParcelMapHandle } from './map/ParcelMap'
import { loadBlockOrder, saveBlockOrder, type PanelBlockId } from './panel/blockOrder'
import { LayoutSettings } from './panel/LayoutSettings'
import { ParcelDetails } from './panel/ParcelDetails'
import type { ParcelFeature, SearchHit, SelectedParcel } from './lib/types'
import { SettingsIcon } from './ui/icons'
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
  const [blockOrder, setBlockOrder] = useState<PanelBlockId[]>(() => loadBlockOrder())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const selectAbort = useRef<AbortController | null>(null)
  const activeRequestId = useRef(0)

  useEffect(() => {
    if (!settingsOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [settingsOpen])

  function updateBlockOrder(next: PanelBlockId[]) {
    setBlockOrder(next)
    saveBlockOrder(next)
  }

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

  function beginSelection() {
    selectAbort.current?.abort()
    const controller = new AbortController()
    selectAbort.current = controller
    activeRequestId.current += 1
    return { controller, requestId: activeRequestId.current }
  }

  async function loadParcel(feature: ParcelFeature, request = beginSelection()) {
    const { controller, requestId } = request
    const pin = feature.properties.PIN ?? ''
    const current = () => !controller.signal.aborted && isCurrentSelection(requestId, activeRequestId.current, pin, feature.properties.PIN ?? '')
    setSelected({ feature, assessment: null, zoning: null })
    setLoading(true)
    setError(null)
    const [lng, lat] = featureCentroid(feature)
    try {
      const [assessmentResult, zoningResult] = await Promise.allSettled([
        pin ? fetchAssessment(pin, controller.signal) : Promise.resolve(null),
        fetchZoningAt(lng, lat, controller.signal),
      ])
      if (!current()) return
      const rawAssessment = assessmentResult.status === 'fulfilled' ? assessmentResult.value : null
      const mismatch = rawAssessment !== null && !assessmentMatchesParcel(rawAssessment.PARID, pin)
      const assessment = mismatch ? null : rawAssessment
      const zoning = zoningResult.status === 'fulfilled' ? zoningResult.value : null
      setSelected({ feature, assessment, zoning })
      const layers = await collectLdesLayers(feature, assessment, controller.signal)
      if (!current()) return
      const retrievedAt = new Date().toISOString()
      layers.sources = {
        ...layers.sources,
        assessment: mismatch
          ? { status: 'unavailable', value: null, sourceId: 'wprdc-assessment', sourceUrl: 'https://data.wprdc.org/api/3/action/datastore_search?resource_id=65855e14-549e-4992-b5be-d629afc676fa', sourceUpdatedAt: null, retrievedAt, joinMethod: 'parcel_id', nAReason: 'Assessment PARID does not match boundary PIN' }
          : await observeQuery(assessmentResult.status === 'fulfilled' ? Promise.resolve(assessment) : Promise.reject(assessmentResult.reason), { sourceId: 'wprdc-assessment', sourceUrl: 'https://data.wprdc.org/api/3/action/datastore_search?resource_id=65855e14-549e-4992-b5be-d629afc676fa', sourceUpdatedAt: null, joinMethod: 'parcel_id' }, retrievedAt),
      }
      const ldes = scoreInputs(feature, assessment, layers)
      setSelected({
        feature,
        assessment,
        zoning,
        ldesLayers: layers,
        ldes,
      })
    } catch (err) {
      if (!current()) return
      setError(err instanceof Error ? err.message : 'Could not load parcel details')
    } finally {
      if (current()) setLoading(false)
    }
  }

  async function chooseHit(hit: SearchHit) {
    const request = beginSelection()
    setQuery('')
    setHits([])
    try {
      const feature = await fetchParcelByPin(hit.PARID, request.controller.signal)
      if (request.controller.signal.aborted || request.requestId !== activeRequestId.current) return
      if (!feature) {
        setError(`No geometry found for ${hit.PARID}`)
        return
      }
      mapRef.current?.flyToFeature(feature)
      await loadParcel(feature, request)
    } catch (err) {
      if (request.controller.signal.aborted || request.requestId !== activeRequestId.current) return
      setError(err instanceof Error ? err.message : 'Could not open parcel')
    }
  }

  async function openFromQuery(raw: string) {
    const submission = resolveSearchSubmission(raw, hits)
    if (submission.kind === 'pin') {
      await chooseHit({ PARID: submission.pin })
      return
    }
    if (submission.kind === 'choose_candidate') setSearchError(hits.length ? 'Choose the matching address from the list.' : 'No matching address yet. Try a parcel ID or select a map parcel.')
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
        <div className="topbar-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-label="Parcel details settings"
          >
            <SettingsIcon />
          </button>
        </div>
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
            blockOrder={blockOrder}
            onClose={() => {
              selectAbort.current?.abort()
              setSelected(null)
              setError(null)
            }}
          />
        )}
      </main>

      <LayoutSettings
        open={settingsOpen}
        order={blockOrder}
        onClose={() => setSettingsOpen(false)}
        onChange={updateBlockOrder}
      />
    </div>
  )
}
