import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import { fetchParcelByPin, featureCentroid, normalizePin } from './lib/arcgis'
import { fetchAssessment, searchAssessments } from './lib/ckan'
import { DEMO_SELECTED, DEMO_SELECTED_B } from './lib/demo'
import { fetchZoningAt } from './lib/zoning'
import { ParcelMap, type ParcelMapHandle } from './map/ParcelMap'
import { ParcelDetails } from './panel/ParcelDetails'
import { ComparePanel, type PinnedParcel } from './panel/ComparePanel'
import { ScreeningPanel } from './panel/ScreeningPanel'
import type { ParcelFeature, SearchHit, SelectedParcel } from './lib/types'
import './App.css'

const MIN_ZOOM = 16
const MIN_PANEL = 360
const MAX_PANEL = 900

export default function App() {
  const mapRef = useRef<ParcelMapHandle>(null)
  const workspaceRef = useRef<HTMLElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const selectAbort = useRef<AbortController | null>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(16.6)
  const [selected, setSelected] = useState<SelectedParcel | null>(null)
  const [pinned, setPinned] = useState<PinnedParcel | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [showFlood, setShowFlood] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [use, setUse] = useState('Multifamily')
  const [units, setUnits] = useState(12)
  const [affordability, setAffordability] = useState('Mixed income')
  const [ran, setRan] = useState(false)
  const [scenarioExpanded, setScenarioExpanded] = useState(true)
  const [reportTab, setReportTab] = useState<'screening' | 'records' | 'compare'>('screening')
  const [panelWidth, setPanelWidth] = useState(610)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 3 || demoMode) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      void searchAssessments(trimmed, controller.signal)
        .then((rows) => { setHits(rows); setSearchError(null) })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) setSearchError(err instanceof Error ? err.message : 'Search failed')
        })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 280)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, demoMode])

  function loadDemo(which: 'A' | 'B' = 'A') {
    selectAbort.current?.abort()
    const demo = which === 'A' ? DEMO_SELECTED : DEMO_SELECTED_B
    setSelected(demo)
    setDemoMode(true)
    setShowFlood(true)
    setLoading(false)
    setError(null)
    setQuery('')
    setHits([])
    if (which === 'A') {
      setUse('Duplex')
      setUnits(2)
      setAffordability('Mixed income')
    }
    setRan(false)
    setScenarioExpanded(true)
    setReportTab(pinned && which === 'B' ? 'compare' : 'screening')
    if (pinned && which === 'B') mapRef.current?.fitToFeatures([pinned.data.feature, demo.feature])
    else mapRef.current?.flyToFeature(demo.feature)
  }

  async function loadParcel(feature: ParcelFeature) {
    selectAbort.current?.abort()
    const controller = new AbortController()
    selectAbort.current = controller
    const pin = feature.properties.PIN ?? ''
    setDemoMode(false)
    setSelected({ feature, assessment: null, zoning: null })
    setRan(false)
    setScenarioExpanded(true)
    setReportTab(pinned ? 'compare' : 'screening')
    setLoading(true)
    setError(null)
    const [lng, lat] = featureCentroid(feature)
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
    setLoading(false)
  }

  async function chooseHit(hit: SearchHit) {
    setQuery('')
    setHits([])
    try {
      const feature = await fetchParcelByPin(hit.PARID)
      if (!feature) { setError(`No geometry found for ${hit.PARID}`); return }
      mapRef.current?.flyToFeature(feature)
      await loadParcel(feature)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open parcel')
    }
  }

  async function openFromQuery(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return
    if (trimmed.toUpperCase() === 'DEMO-PL-001') { loadDemo('A'); return }
    if (trimmed.toUpperCase() === 'DEMO-PL-002') { loadDemo('B'); return }
    const compact = trimmed.replace(/[-\s]/g, '')
    if (/^[0-9A-Z]{10,16}$/i.test(compact)) {
      await chooseHit({ PARID: normalizePin(trimmed) })
    } else if (hits[0]) {
      await chooseHit(hits[0])
    }
  }

  function runScreening() {
    if (!selected || loading) return
    setRan(true)
    setScenarioExpanded(false)
    setReportTab(pinned && pinned.data.feature.properties.PIN !== selected.feature.properties.PIN ? 'compare' : 'screening')
    window.requestAnimationFrame(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function clearParcel() {
    selectAbort.current?.abort()
    setSelected(null)
    setDemoMode(false)
    setRan(false)
    setScenarioExpanded(true)
    setLoading(false)
    setError(null)
  }

  function pinCurrent() {
    if (!selected || !ran) return
    setPinned({ data: selected, isDemo: demoMode, scenario: { use, units, affordability } })
  }

  function resizeTo(clientX: number) {
    const workspace = workspaceRef.current
    if (!workspace) return
    const rightReserve = 390
    const available = workspace.getBoundingClientRect().width - rightReserve
    const next = clientX - workspace.getBoundingClientRect().left
    setPanelWidth(Math.max(MIN_PANEL, Math.min(MAX_PANEL, available, next)))
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    resizeTo(event.clientX)
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand-icon" aria-hidden="true">▰</span>
        <strong>ParcelLens</strong>
        <span className="header-divider" />
        <span className="product-subtitle">Pittsburgh parcel screening</span>
        <span className="header-spacer" />
        <span className="prototype-tag">Interactive prototype</span>
        <a href="https://github.com/RainaQiu/parcel-lens/blob/main/docs/Track1_Data_Assessment_and_PRD.md" target="_blank" rel="noreferrer">View PRD ↗</a>
      </header>

      <main ref={workspaceRef} className={`workspace ${dragging ? 'is-dragging' : ''}`} style={{ '--panel-width': `${panelWidth}px` } as CSSProperties}>
        <aside className="work-panel" aria-label="Parcel search and screening report">
          <div className="work-panel-scroll">
            <section className="find-section">
              <div className="section-heading"><div><span className="step-label">01 / SELECT</span><h1>Find a parcel</h1></div>{selected && <button className="text-button" type="button" onClick={clearParcel}>Clear</button>}</div>
              <form className="search" onSubmit={(event) => { event.preventDefault(); void openFromQuery(query) }}>
                <input value={query} onChange={(event) => { setQuery(event.target.value); setHits([]); setSearchError(null) }} placeholder="Search address or parcel ID" aria-label="Search address or parcel ID" autoComplete="off" />
                <button className="search-submit" type="submit" aria-label="Open parcel">⌕</button>
                {searching && <span className="search-status">Searching…</span>}
                {hits.length > 0 && <ul className="results" role="listbox">{hits.map((hit) => <li key={hit.PARID}><button type="button" onClick={() => void chooseHit(hit)}><span>{[hit.PROPERTYHOUSENUM, hit.PROPERTYADDRESS].filter(Boolean).join(' ') || hit.PARID}</span><small>{hit.PARID}{hit.PROPERTYCITY ? ` · ${hit.PROPERTYCITY}` : ''}</small></button></li>)}</ul>}
              </form>
              {searchError && <p className="search-error">{searchError}</p>}
              <div className="demo-invite"><div><strong>Try a complete example</strong><p>Two synthetic parcels, one scenario and a flood overlay. No live records needed.</p></div><button type="button" onClick={() => loadDemo('A')}>Load demo parcel <span aria-hidden="true">↗</span></button></div>
              {pinned && <div className="pinned-tray"><div><span>PINNED · A</span><strong>{pinned.data.feature.properties.PIN}</strong><small>{pinned.scenario.use} · {pinned.scenario.units} units</small></div><button type="button" className="text-button" onClick={() => setPinned(null)}>Unpin</button><p>Search a different parcel ID for B.{pinned.isDemo && <> Try <button type="button" className="inline-button" onClick={() => loadDemo('B')}>DEMO-PL-002</button>.</>}</p></div>}
              <p className="helper">You can also click a parcel boundary on the map.</p>
            </section>

            <section className="scenario-section">
              <div className="section-heading"><div><span className="step-label">02 / DEFINE</span><h2>Housing scenario</h2></div>{ran && <button className="text-button" type="button" onClick={() => setScenarioExpanded((value) => !value)}>{scenarioExpanded ? 'Collapse' : 'Edit'}</button>}</div>
              {scenarioExpanded ? <>
                <p className="section-intro">Describe the proposal you want to screen.</p>
                <div className="scenario-fields"><label htmlFor="proposed-use">Proposed use<select id="proposed-use" value={use} onChange={(event) => { setUse(event.target.value); setRan(false) }}><option>Single-family</option><option>Duplex</option><option>Multifamily</option></select></label>
                  <label htmlFor="proposed-units">Units<input id="proposed-units" type="number" min="1" max="500" value={units} onChange={(event) => { setUnits(Math.max(1, Number(event.target.value) || 1)); setRan(false) }} /></label></div>
                <label className="full-field" htmlFor="affordability">Affordability approach<select id="affordability" value={affordability} onChange={(event) => { setAffordability(event.target.value); setRan(false) }}><option>Market rate</option><option>Mixed income</option><option>Income restricted</option></select></label>
                <button className="primary-button" type="button" disabled={!selected || loading} onClick={runScreening}>Run early screening <span aria-hidden="true">→</span></button>
                {!selected && <p className="button-hint">Select a parcel or load the demo to continue.</p>}
              </> : <p className="scenario-compact">{use} <span>·</span> {units} {units === 1 ? 'unit' : 'units'} <span>·</span> {affordability}</p>}
            </section>

            <div ref={reportRef} className="report-content">
              <div className="section-heading report-title"><div><span className="step-label">03 / REVIEW</span><h2>Screening report</h2></div>{demoMode && <span className="mock-badge">MOCK DATA</span>}</div>
              {selected && <div className="selected-parcel-line"><div><strong>{selected.feature.properties.PIN}</strong><span>{demoMode ? 'Synthetic demonstration site' : 'Public parcel data'}</span></div>{!pinned && ran && <button type="button" className="pin-button" onClick={pinCurrent} aria-label="Pin current parcel for comparison">♧ Pin for comparison</button>}</div>}
              <div className="report-tabs" role="tablist" aria-label="Parcel information"><button role="tab" aria-selected={reportTab === 'screening'} className={reportTab === 'screening' ? 'active' : ''} onClick={() => setReportTab('screening')}>Screening</button><button role="tab" aria-selected={reportTab === 'records'} className={reportTab === 'records' ? 'active' : ''} onClick={() => setReportTab('records')}>Parcel records</button>{pinned && <button role="tab" aria-selected={reportTab === 'compare'} className={reportTab === 'compare' ? 'active' : ''} onClick={() => setReportTab('compare')}>Compare A / B</button>}</div>
              {reportTab === 'compare' && pinned && selected ? <ComparePanel pinned={pinned} current={selected} currentIsDemo={demoMode} currentScenario={{ use, units, affordability }} currentRan={ran} /> : reportTab === 'records' ? (demoMode ? <div className="demo-records"><strong>Illustrative record</strong><p>{selected?.feature.properties.PIN} is an invented parcel. Its geometry, address, area and zoning code are mock values for this walkthrough.</p><dl><div><dt>Parcel ID</dt><dd>{selected?.feature.properties.PIN}</dd></div><div><dt>Area</dt><dd>{selected?.feature.properties.CALCACREAGE} acres (mock)</dd></div><div><dt>Zoning</dt><dd>DEMO-R (mock)</dd></div></dl></div> : selected ? <ParcelDetails loading={loading} error={error} data={selected} embedded /> : <div className="empty-report"><h3>No parcel selected</h3><p>Select a parcel to view its public records.</p></div>) : <ScreeningPanel data={selected} loading={loading} error={error} ran={ran} isDemo={demoMode} showFlood={showFlood} onShowFloodChange={setShowFlood} scenario={{ use, units, affordability }} />}
            </div>
          </div>
        </aside>

        <div className="panel-resizer" role="separator" aria-label="Resize report and map" aria-orientation="vertical" aria-valuemin={MIN_PANEL} aria-valuemax={MAX_PANEL} aria-valuenow={panelWidth} tabIndex={0} onPointerDown={startResize} onPointerMove={(event) => { if (dragging) resizeTo(event.clientX) }} onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); setDragging(false) }} onPointerCancel={() => setDragging(false)} onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setPanelWidth((value) => Math.max(MIN_PANEL, Math.min(MAX_PANEL, value + (event.key === 'ArrowRight' ? 32 : -32)))) } }}><span /></div>

        <section className="map-area" aria-label="Parcel map">
          <ParcelMap ref={mapRef} selectedFeature={selected?.feature ?? null} pinnedFeature={pinned?.data.feature ?? null} demoMode={demoMode} showFlood={showFlood} onSelectPin={(feature) => void loadParcel(feature)} onZoomChange={setZoom} />
          <div className="map-caption">Pittsburgh, Pennsylvania{demoMode && <small>Synthetic demonstration geometry</small>}</div>
          {zoom < MIN_ZOOM && !demoMode && <div className="zoom-hint">Zoom in to load parcel boundaries</div>}
          {demoMode && <div className="layer-control"><div className="layer-control-heading"><strong>Map layers</strong><span>DEMO</span></div><label><input type="checkbox" checked={showFlood} onChange={(event) => setShowFlood(event.target.checked)} /> <i className="flood-swatch" /> Flood review overlay</label><small>{showFlood ? 'Synthetic layer · demo-flood-v1.0' : 'Overlay hidden'}</small></div>}
          <div className="map-legend"><strong>Map key</strong><span><i className="selected-swatch" /> {pinned ? 'Current · B' : 'Selected parcel'}</span>{pinned && <span><i className="pinned-swatch" /> Pinned · A</span>}{demoMode && showFlood && <span><i className="flood-swatch" /> Mock flood overlay</span>}{!demoMode && <span><i className="boundary-swatch" /> Parcel boundary</span>}</div>
        </section>
      </main>
    </div>
  )
}
