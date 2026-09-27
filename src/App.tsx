import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchParcelByPin } from './lib/arcgis'
import { normalizeStreet, parseAddress } from './lib/addressSearch'
import { fetchAssessment, searchAssessments } from './lib/ckan'
import { siteAddress } from './lib/format'
import { loadParcelFeature } from './lib/parcelReport'
import { makeParcelReport, type ParcelReport } from './lib/reportView'
import { addSavedPin, parseSavedPins, removeSavedPin, routeFromPath, SAVED_PINS_KEY, type AppRoute } from './lib/savedParcels'
import { resolveSearchSubmission } from './lib/selection'
import type { ParcelFeature, SearchHit, SelectedParcel } from './lib/types'
import type { ParcelMapHandle } from './map/ParcelMap'
import { ComparePage } from './panel/ComparePage'
import { ParcelPreview } from './panel/ParcelPreview'
import { ReportPage } from './panel/ReportPage'
import './App.css'

const ParcelMap = lazy(() => import('./map/ParcelMap').then((module) => ({ default: module.ParcelMap })))

function comparePinsFromUrl(): string[] {
  const raw = new URLSearchParams(window.location.search).get('pins')
  return raw ? parseSavedPins(JSON.stringify(raw.split(','))) : []
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname))
  const [savedPins, setSavedPins] = useState<string[]>(() => parseSavedPins(window.localStorage.getItem(SAVED_PINS_KEY)))
  const [comparePins, setComparePins] = useState<string[]>(comparePinsFromUrl)
  const [cache, setCache] = useState<Record<string, ParcelReport>>({})
  const [savedLabels, setSavedLabels] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [activeHit, setActiveHit] = useState(-1)
  const [showMore, setShowMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedParcel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [zoom, setZoom] = useState(16.6)
  const mapRef = useRef<ParcelMapHandle>(null)
  const selectAbort = useRef<AbortController | null>(null)
  const activeRequestId = useRef(0)

  useEffect(() => {
    const onPop = () => { setRoute(routeFromPath(window.location.pathname)); setComparePins(comparePinsFromUrl()) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => { window.localStorage.setItem(SAVED_PINS_KEY, JSON.stringify(savedPins)) }, [savedPins])
  useEffect(() => {
    const controller = new AbortController()
    void Promise.allSettled(savedPins.map((pin) => fetchAssessment(pin, controller.signal))).then((results) => {
      if (controller.signal.aborted) return
      const labels: Record<string, string> = {}
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) labels[savedPins[index]] = siteAddress(result.value).line1
      })
      setSavedLabels(labels)
    })
    return () => controller.abort()
  }, [savedPins])
  useEffect(() => { if (route.page === 'map') window.requestAnimationFrame(() => mapRef.current?.resize()) }, [route.page])
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchAssessments(trimmed, controller.signal).then((rows) => {
        if (!controller.signal.aborted) { setHits(rows); setSearchError(rows.length ? null : 'No close matches found. Check the address or choose a parcel on the map.') }
      }).catch((err: unknown) => { if (!controller.signal.aborted) setSearchError(err instanceof Error ? err.message : 'Search failed') })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 280)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query])

  function navigate(path: string) {
    window.history.pushState(null, '', path)
    setRoute(routeFromPath(window.location.pathname)); setComparePins(comparePinsFromUrl())
    window.scrollTo(0, 0)
  }
  function cacheReport(report: ParcelReport) { setCache((previous) => ({ ...previous, [report.pin]: report })) }
  function addToList(pin: string) {
    const next = addSavedPin(savedPins, pin)
    setSavedPins(next)
    setNotice(next.length === savedPins.length && !savedPins.includes(pin) ? 'The list can hold up to four parcels.' : 'Parcel added to your list.')
  }
  function removeFromList(pin: string) {
    setSavedPins((previous) => removeSavedPin(previous, pin))
    if (route.page === 'compare') {
      const updated = comparePins.filter((item) => item !== pin)
      setComparePins(updated)
      window.history.replaceState(null, '', `/compare?pins=${updated.join(',')}`)
    }
  }
  function startSelection() {
    selectAbort.current?.abort()
    const controller = new AbortController()
    selectAbort.current = controller
    activeRequestId.current += 1
    return { controller, id: activeRequestId.current }
  }
  async function loadFeature(feature: ParcelFeature, request = startSelection()) {
    const { controller, id } = request
    setSelected({ feature, assessment: null, zoning: null }); setLoading(true); setError(null)
    try {
      const parcel = await loadParcelFeature(feature, controller.signal, (partial) => {
        if (!controller.signal.aborted && activeRequestId.current === id) setSelected(partial)
      })
      if (controller.signal.aborted || activeRequestId.current !== id) return
      setSelected(parcel); cacheReport(makeParcelReport(parcel))
    } catch (err) { if (!controller.signal.aborted && activeRequestId.current === id) setError(err instanceof Error ? err.message : 'Could not load parcel') }
    finally { if (!controller.signal.aborted && activeRequestId.current === id) setLoading(false) }
  }
  async function chooseHit(hit: SearchHit) {
    const request = startSelection()
    setQuery(''); setHits([]); setSearchError(null); setSearching(false)
    setSelected(null); setLoading(true); setError(null)
    try {
      const feature = await fetchParcelByPin(hit.PARID, request.controller.signal)
      if (request.controller.signal.aborted || activeRequestId.current !== request.id) return
      if (!feature) { setError(`No unique parcel boundary found for ${hit.PARID}`); setLoading(false); return }
      mapRef.current?.flyToFeature(feature)
      await loadFeature(feature, request)
    } catch (err) { if (!request.controller.signal.aborted) { setError(err instanceof Error ? err.message : 'Could not open parcel'); setLoading(false) } }
  }
  async function focusSaved(pin: string) {
    const existing = cache[pin]?.selected
    if (existing) { startSelection(); setSelected(existing); setLoading(false); setError(null); mapRef.current?.flyToFeature(existing.feature); return }
    const request = startSelection()
    setLoading(true); setError(null)
    try {
      const feature = await fetchParcelByPin(pin, request.controller.signal)
      if (request.controller.signal.aborted || activeRequestId.current !== request.id) return
      if (!feature) { setError(`No unique parcel boundary found for ${pin}`); setLoading(false); return }
      mapRef.current?.flyToFeature(feature)
      await loadFeature(feature, request)
    } catch (err) { if (!request.controller.signal.aborted) { setError(err instanceof Error ? err.message : 'Could not open saved parcel'); setLoading(false) } }
  }
  function submitQuery() {
    if (activeHit >= 0 && hits[activeHit]) { void chooseHit(hits[activeHit]); return }
    const submission = resolveSearchSubmission(query, hits)
    if (submission.kind === 'pin') { void chooseHit({ PARID: submission.pin }); return }
    setSearchError(hits.length ? 'Choose a parcel from the suggestions below.' : 'Enter a parcel ID or choose an address suggestion.')
  }

  const compareList = route.page === 'compare' ? (comparePins.length ? comparePins : savedPins) : savedPins
  const currentPin = selected?.feature.properties.PIN ?? ''
  const visibleHits = showMore ? hits : hits.slice(0, 8)
  const searchedAddress = parseAddress(query)
  return <>
    {route.page === 'map' && <div className="app">
      <header className="topbar"><div className="brand"><strong>Parcel Lens</strong><span>Pittsburgh parcels</span></div>
        <form className="search" role="search" onSubmit={(event) => { event.preventDefault(); submitQuery() }}>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setHits([]); setActiveHit(-1); setShowMore(false); setSearching(false); setSearchError(null) }} onKeyDown={(event) => { if (event.key === 'ArrowDown' && visibleHits.length) { event.preventDefault(); setActiveHit((index) => Math.min(index + 1, visibleHits.length - 1)) } else if (event.key === 'ArrowUp' && visibleHits.length) { event.preventDefault(); setActiveHit((index) => Math.max(index - 1, 0)) } else if (event.key === 'Escape') { setHits([]); setActiveHit(-1) } }} placeholder="Search address or parcel ID" aria-label="Search address or parcel ID" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={hits.length > 0} aria-controls="parcel-search-results" aria-activedescendant={activeHit >= 0 ? `parcel-option-${activeHit}` : undefined} />
          {searching && <span className="search-status">Searching…</span>}
          {hits.length > 0 && <ul className="results" role="listbox" id="parcel-search-results">{visibleHits.map((hit, index) => <li key={hit.PARID} id={`parcel-option-${index}`} role="option" aria-selected={index === activeHit}><button type="button" onMouseEnter={() => setActiveHit(index)} onClick={() => void chooseHit(hit)}><span>{[hit.PROPERTYHOUSENUM, hit.PROPERTYADDRESS].filter(Boolean).join(' ')}</span><small>{hit.PROPERTYCITY ?? 'Pittsburgh'}{hit.PROPERTYZIP ? `, PA ${hit.PROPERTYZIP}` : ''} · Parcel {hit.PARID}{searchedAddress && (String(hit.PROPERTYHOUSENUM) !== searchedAddress.house || normalizeStreet(hit.PROPERTYADDRESS ?? '') !== searchedAddress.street) ? ' · Approximate match' : ''}</small></button></li>)}{hits.length > 8 && !showMore && <li role="presentation"><button type="button" className="show-more" onClick={() => setShowMore(true)}>Show {hits.length - 8} more candidates</button></li>}</ul>}
          {searchError && <p className="search-error" role="status">{searchError}</p>}
        </form><button type="button" className="saved-counter" onClick={() => { if (savedPins.length >= 2) navigate(`/compare?pins=${savedPins.join(',')}`); else setNotice('Add two parcels to compare.') }}>Saved list <strong>{savedPins.length}</strong></button>
      </header>
      <main className="workspace"><Suspense fallback={<div className="map-loading">Loading map…</div>}><ParcelMap ref={mapRef} selectedFeature={selected?.feature ?? null} savedPins={savedPins} onSelectPin={(feature) => void loadFeature(feature)} onZoomChange={setZoom} /></Suspense>{zoom < 16 && <div className="zoom-hint">Zoom in to load parcel boundaries</div>}{(selected || loading || error) && <ParcelPreview data={selected} loading={loading} error={error} saved={savedPins.includes(currentPin)} onClose={() => { selectAbort.current?.abort(); setSelected(null); setError(null) }} onReport={(pin) => navigate(`/parcels/${pin}`)} onAdd={addToList} />}
        {savedPins.length > 0 && <aside className="saved-tray" aria-label="Saved parcels"><div className="tray-title"><strong>Saved parcels</strong><span>{savedPins.length}/4</span></div><div className="tray-items">{savedPins.map((pin) => <div key={pin} className="tray-item"><button type="button" onClick={() => void focusSaved(pin)} aria-label={`Show ${pin} on map`}>{cache[pin]?.address ?? savedLabels[pin] ?? 'Loading address…'}<small>{pin}</small></button><a href={`/parcels/${pin}`} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); navigate(`/parcels/${pin}`) }}>Report</a><button type="button" aria-label={`Remove ${pin}`} onClick={() => removeFromList(pin)}>×</button></div>)}</div><button type="button" className="primary-button" disabled={savedPins.length < 2} onClick={() => navigate(`/compare?pins=${savedPins.join(',')}`)}>Compare {savedPins.length} parcels →</button></aside>}
        {notice && <div className="app-notice" role="status">{notice}<button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification">×</button></div>}
      </main>
    </div>}
    {route.page === 'report' && <ReportPage key={route.pin} pin={route.pin} cached={cache[route.pin]} saved={savedPins.includes(route.pin)} onBack={() => navigate('/')} onAdd={addToList} onLoaded={cacheReport} />}
    {route.page === 'compare' && <ComparePage pins={compareList} cache={cache} onLoaded={cacheReport} onRemove={removeFromList} onBack={() => navigate('/')} onOpenReport={(pin) => navigate(`/parcels/${pin}`)} />}
    {route.page === 'invalid' && <main className="report-page"><div className="report-shell"><h1>Page not found</h1><p>Check the parcel link or return to the map.</p><button type="button" onClick={() => navigate('/')}>Back to map</button></div></main>}
  </>
}
