import { useEffect, useRef, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchParcelByPin, featureCentroid, normalizePin } from './lib/arcgis'
import { fetchAssessment, searchAssessments } from './lib/ckan'
import { fetchZoningAt } from './lib/zoning'
import { ParcelMap, type ParcelMapHandle } from './map/ParcelMap'
import { ParcelDetails } from './panel/ParcelDetails'
import { ScreeningPanel } from './panel/ScreeningPanel'
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
  const [use, setUse] = useState('Multifamily')
  const [units, setUnits] = useState(12)
  const [affordability, setAffordability] = useState('Mixed income')
  const [ran, setRan] = useState(false)
  const [reportTab, setReportTab] = useState<'screening' | 'records'>('screening')
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
    setRan(false)
    setReportTab('screening')
    setLoading(true)
    setError(null)
    const [lng, lat] = featureCentroid(feature)
    try {
      const [assessmentResult, zoningResult] = await Promise.allSettled([
        pin ? fetchAssessment(pin, controller.signal) : Promise.resolve(null),
        fetchZoningAt(lng, lat, controller.signal),
      ])
      if (controller.signal.aborted) return
      setSelected({
        feature,
        assessment: assessmentResult.status === 'fulfilled' ? assessmentResult.value : null,
        zoning: zoningResult.status === 'fulfilled' ? zoningResult.value : null,
      })
      if (assessmentResult.status === 'rejected' || zoningResult.status === 'rejected') {
        setError('Some public records could not be loaded. Missing fields remain unknown.')
      }
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
        <span className="brand-icon" aria-hidden="true">▰</span>
        <strong>ParcelLens</strong>
        <span className="header-divider" />
        <span>Pittsburgh parcel screening</span>
        <span className="header-spacer" />
        <span className="prototype-tag">Interactive prototype</span>
        <a href="https://github.com/RainaQiu/parcel-lens/blob/main/docs/Track1_Data_Assessment_and_PRD.md" target="_blank" rel="noreferrer">View PRD ↗</a>
      </header>
      <main className="workspace">
        <aside className="setup-rail" aria-label="Parcel and scenario setup">
          <section>
            <h1>Find a parcel</h1>
            <form className="search" onSubmit={(event) => { event.preventDefault(); void openFromQuery(query) }}>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Address or parcel ID" aria-label="Search address or parcel ID" autoComplete="off" />
              {searching && <span className="search-status">Searching…</span>}
              {hits.length > 0 && <ul className="results" role="listbox">{hits.map((hit) => <li key={hit.PARID}><button type="button" onClick={() => void chooseHit(hit)}><span>{[hit.PROPERTYHOUSENUM, hit.PROPERTYADDRESS].filter(Boolean).join(' ') || hit.PARID}</span><small>{hit.PARID}{hit.PROPERTYCITY ? ` · ${hit.PROPERTYCITY}` : ''}</small></button></li>)}</ul>}
            </form>
            {searchError && <p className="search-error">{searchError}</p>}
            <p className="helper">Search, or click a parcel outline on the map.</p>
          </section>
          <ol className="steps" aria-label="Screening workflow"><li className={selected ? 'done' : 'current'}><b>1</b><span>Select parcel</span></li><li className={selected && !ran ? 'current' : ''}><b>2</b><span>Housing scenario</span></li><li className={ran ? 'current' : ''}><b>3</b><span>Screening report</span></li></ol>
          <section className="scenario-section">
            <h2>Housing scenario</h2>
            <p>Describe the idea you want to screen.</p>
            <label htmlFor="proposed-use">Proposed use</label>
            <select id="proposed-use" value={use} onChange={(event) => { setUse(event.target.value); setRan(false) }}><option>Single-family</option><option>Duplex</option><option>Multifamily</option></select>
            <label htmlFor="proposed-units">Proposed units</label>
            <input id="proposed-units" type="number" min="1" max="500" value={units} onChange={(event) => { setUnits(Math.max(1, Number(event.target.value) || 1)); setRan(false) }} />
            <label htmlFor="affordability">Affordability approach</label>
            <select id="affordability" value={affordability} onChange={(event) => { setAffordability(event.target.value); setRan(false) }}><option>Market rate</option><option>Mixed income</option><option>Income restricted</option></select>
          </section>
          <div className="rail-bottom"><div className="info-note"><strong>About early screening</strong><p>Public records can frame a decision. Zoning permission, site feasibility, permits and financing require separate review.</p></div><button className="primary-button" disabled={!selected || loading} onClick={() => { setRan(true); setReportTab('screening') }}>Run early screening <span>→</span></button>{!selected && <p className="button-hint">Select a parcel to continue.</p>}</div>
        </aside>
        <section className="map-area" aria-label="Parcel map"><ParcelMap ref={mapRef} selectedFeature={selected?.feature ?? null} onSelectPin={(feature) => void loadParcel(feature)} onZoomChange={setZoom} /><div className="map-caption">Pittsburgh, Pennsylvania</div>{zoom < MIN_ZOOM && <div className="zoom-hint">Zoom in to load parcel boundaries</div>}<div className="map-legend"><strong>Map key</strong><span><i className="selected-swatch" /> Selected parcel</span><span><i className="boundary-swatch" /> Parcel boundary</span></div></section>
        <aside className="report-rail" aria-label="Parcel screening report">
          <div className="report-header"><div className="report-header-row"><span>Selected parcel</span>{selected && <button onClick={() => { selectAbort.current?.abort(); setSelected(null); setRan(false); setLoading(false); setError(null) }}>Clear</button>}</div><h2>{selected?.feature.properties.PIN ?? 'No parcel selected'}</h2></div>
          <div className="report-tabs" role="tablist" aria-label="Parcel information"><button role="tab" aria-selected={reportTab === 'screening'} className={reportTab === 'screening' ? 'active' : ''} onClick={() => setReportTab('screening')}>Screening</button><button role="tab" aria-selected={reportTab === 'records'} className={reportTab === 'records' ? 'active' : ''} onClick={() => setReportTab('records')}>Parcel records</button></div>
          {reportTab === 'records' ? <div className="report-scroll">{selected ? <ParcelDetails loading={loading} error={error} data={selected} embedded /> : <div className="empty-report"><h3>No parcel selected</h3><p>Select a parcel to view its public records.</p></div>}</div> : <ScreeningPanel data={selected} loading={loading} error={error} ran={ran} scenario={{ use, units, affordability }} />}
        </aside>
      </main>
    </div>
  )
}
