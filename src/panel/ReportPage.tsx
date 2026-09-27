import { useEffect, useState } from 'react'
import { formatDate, formatMoney, formatNumber, formatYear, mailingAddress, siteAddress } from '../lib/format'
import { loadParcelByPin } from '../lib/parcelReport'
import { makeParcelReport, type ParcelReport } from '../lib/reportView'
import { screeningPresentation } from '../lib/screening/presentation'
import type { SourceObservation } from '../lib/types'

export type Explanation = {
  summary: string
  drivers: Array<{ id: string; explanation: string; nextStep: string }>
  unknowns: string[]
}

type Props = {
  pin: string
  cached?: ParcelReport
  saved: boolean
  onBack: () => void
  onAdd: (pin: string) => void
  onLoaded: (report: ParcelReport) => void
}

export function ReportPage({ pin, cached, saved, onBack, onAdd, onLoaded }: Props) {
  const [report, setReport] = useState<ParcelReport | null>(cached ?? null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<Explanation | null>(null)
  const [explanationUnavailable, setExplanationUnavailable] = useState(false)

  useEffect(() => {
    setReport(cached?.pin === pin ? cached : null)
    setLoadError(null)
    if (cached?.pin === pin) return
    const controller = new AbortController()
    void loadParcelByPin(pin, controller.signal).then((selected) => {
      if (controller.signal.aborted) return
      const next = makeParcelReport(selected)
      setReport(next)
      onLoaded(next)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load this parcel')
    })
    return () => controller.abort()
    // Cache writes must not trigger a second fetch for the same route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  useEffect(() => {
    if (!report || report.pin !== pin) return
    const controller = new AbortController()
    setExplanation(null)
    setExplanationUnavailable(false)
    const input = explanationInput(report)
    void fetch('/api/explanations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('AI unavailable')
      return response.json() as Promise<Explanation>
    }).then((value) => {
      if (!controller.signal.aborted) setExplanation(value)
    }).catch(() => {
      if (!controller.signal.aborted) setExplanationUnavailable(true)
    })
    return () => controller.abort()
  }, [report, pin])

  if (!report || report.pin !== pin) {
    return <main className="report-page"><button type="button" className="text-button" onClick={onBack}>← Back to map</button><div className="report-shell"><p role="status">{loadError ?? 'Loading parcel report…'}</p>{loadError && <button type="button" onClick={onBack}>Search another parcel</button>}</div></main>
  }

  const { scorecard, selected } = report
  const shown = screeningPresentation(scorecard)
  const address = siteAddress(selected.assessment)
  const triggered = scorecard.reviewTasks.filter((task) => task.scoreEffect === 'triggered')
  const mapped = scorecard.mappedConstraints.filter((item) => item.status === 'DETECTED' || item.boundaryUncertain)
  return (
    <main className="report-page">
      <div className="report-shell">
        <nav className="report-top-nav" aria-label="Report navigation"><button type="button" className="text-button" onClick={onBack}>← Back to map</button><span>Parcel Lens / Full report</span></nav>
        <header className="report-header">
          <div><p className="eyebrow">Parcel screening report</p><h1>{address.line1}</h1><p>{address.line2} · Parcel ID {report.pin}</p></div>
          <div className="report-actions"><button type="button" onClick={() => onAdd(report.pin)} disabled={saved}>{saved ? '✓ Added to list' : '+ Add to list'}</button><button type="button" onClick={() => window.print()}>Print / Save PDF</button></div>
        </header>
        <div className="report-layout">
          <div className="report-main">
            <section className="report-summary-card" id="overview">
              <div className="report-summary-heading"><span className={`report-status score-${scorecard.screeningRag.toLowerCase()}`}>{shown.gradeText}</span><span>{scorecard.scoreVersion}</span></div>
              <h2>Development Ease Score — Preliminary zoning &amp; site screen</h2>
              <p className="report-lead">{explanation?.summary ?? report.fallbackSummary}</p>
              {explanation ? <p className="ai-label">AI explanation of the verified screening facts</p> : explanationUnavailable ? <p className="fallback-label">AI explanation unavailable; showing the source-based summary.</p> : <p className="fallback-label">Showing the source-based summary.</p>}
              <p className="scope-note">{shown.scope} A map overlap does not establish impact on an unlocated project footprint.</p>
              <div className="screening-answers">
                <div><small>Verified housing path</small><p>{shown.pathwayText}</p></div>
                <div><small>Mapped and record leads</small><p>{triggered.map((task) => task.trigger).join(' ') || 'No additional review task identified in checked sources.'}</p></div>
                <div><small>First next check</small><p>{shown.topTask?.trigger ?? shown.firstGap?.reason ?? 'Define the proposed project and complete routine due diligence.'}</p></div>
                <div><small>Still unassessed</small><p>Project location and size, land control, engineering cost, and financial feasibility.</p></div>
              </div>
            </section>

            <section className="report-section" id="drivers"><div className="section-heading"><span>01</span><div><h2>Why this result and what to check next?</h2><p>Verified review tasks are separate from routine project due diligence.</p></div></div>
              {triggered.length ? <div className="finding-list">{triggered.map((task) => <article className="finding" key={task.id}><div className="finding-top"><span className="finding-number">Targeted review</span><strong>{task.trigger}</strong></div><p><b>Why it matters:</b> {task.whyItMatters}</p><p><b>Check with:</b> {task.whoToConsult}</p><p className="finding-source">Source: {task.sourceRefs.join(', ')}</p></article>)}</div> : <p className="empty-note">No extra review task was found within the verified sources. Routine project checks still apply.</p>}
              <h3>Mapped observations</h3><div className="screening-observations">{mapped.length ? mapped.map((item) => <div key={item.id}><b>{item.label}</b><span>{item.boundaryUncertain ? 'Small boundary overlap — uncertain' : item.category ? `${item.category} detected` : 'Detected'}{item.overlapPct !== null ? ` · ${item.overlapPct.toFixed(3)}% of parcel` : ''}</span><small>Proposed project impact: {item.projectImpact === 'UNKNOWN' ? 'unknown' : 'not applicable'}{item.source?.sourceUrl && <> · <a href={item.source.sourceUrl} target="_blank" rel="noreferrer">Original map ↗</a></>}</small></div>) : <p>No mapped overlap detected in available checked layers.</p>}</div>
            </section>

            <section className="report-section" id="pathways"><div className="section-heading"><span>02</span><div><h2>Housing pathways</h2><p>Base district use listings only; site and project rules still need review.</p></div></div>
              <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Housing use</th><th>Base district</th><th>Listed path</th><th>Source</th></tr></thead><tbody>{scorecard.housingPathways.map((row) => <tr key={`${row.useType}-${row.districtKey}-${row.rawDistrict}`}><td>{row.useLabel}</td><td>{row.rawDistrict}</td><td><strong>{row.pathway === 'UNKNOWN' ? 'Unknown' : row.pathway}</strong>{row.notes && <small>{row.notes}</small>}</td><td><a href={row.sourceUrl} target="_blank" rel="noreferrer">Code {row.ruleVersion}</a></td></tr>)}</tbody></table>{scorecard.housingPathways.length === 0 && <p>No verified pathway rows are available.</p>}</div>
            </section>

            <section className="report-section" id="unknowns"><div className="section-heading"><span>03</span><div><h2>What is still unknown?</h2><p>Missing source evidence and project questions are shown separately.</p></div></div><h3>Evidence gaps</h3>{scorecard.evidenceGaps.length ? <ul className="unknown-list">{scorecard.evidenceGaps.map((gap) => <li key={gap.id}>{gap.reason}</li>)}</ul> : <p>No required source gap was identified.</p>}<h3>Project questions not assessed</h3><ul className="unknown-list">{scorecard.unassessed.map((item) => <li key={item}>{item}</li>)}</ul></section>

            <section className="report-section" id="evidence"><div className="section-heading"><span>04</span><div><h2>Evidence and property records</h2><p>Inspect original sources, retrieval state, and assessor fields.</p></div></div>
              <details className="report-details"><summary>Source observations</summary><div className="source-list">{Object.entries(selected.ldes?.sources ?? {}).map(([key, value]) => { const source = value as SourceObservation<unknown>; return <div key={key}><strong>{key}</strong><span>{source.status}{source.nAReason ? ` · ${source.nAReason}` : ''}</span><small>Source updated: {source.sourceUpdatedAt ?? 'not provided'} · Retrieved: {source.retrievedAt ?? 'unknown'} · Join: {source.joinMethod}</small><a href={source.sourceUrl} target="_blank" rel="noreferrer">Original source ↗</a></div> })}</div></details>
              <details className="report-details"><summary>Parcel and assessor details</summary><dl className="property-grid"><div><dt>Parcel ID</dt><dd>{report.pin}</dd></div><div><dt>Lot area</dt><dd>{formatNumber(selected.assessment?.LOTAREA, 0)} sq ft</dd></div><div><dt>Municipality</dt><dd>{selected.assessment?.MUNIDESC ?? 'Unknown'}</dd></div><div><dt>Zoning description</dt><dd>{selected.zoning?.description ?? 'Unknown'}</dd></div><div><dt>Owner type</dt><dd>{selected.assessment?.OWNERDESC ?? 'Unknown'}</dd></div><div><dt>Mailing address</dt><dd>{mailingAddress(selected.assessment)}</dd></div><div><dt>Last sale price</dt><dd>{formatMoney(selected.assessment?.SALEPRICE)}</dd></div><div><dt>Last sale date</dt><dd>{formatDate(selected.assessment?.SALEDATE)}</dd></div><div><dt>Certified tax year</dt><dd>{formatYear(selected.assessment?.TAXYEAR)}</dd></div><div><dt>Assessment file as of</dt><dd>{formatDate(selected.assessment?.ASOFDATE)}</dd></div><div><dt>Boundary last modified</dt><dd>{formatDate(selected.feature.properties.MODIFIEDON)}</dd></div><div><dt>Zoning layer last updated</dt><dd>{formatDate(selected.zoning?.updatedAt)}</dd></div></dl></details>
            </section>
          </div>
          <aside className="report-rail" aria-label="Report sections"><p className="eyebrow">In this report</p><a href="#overview">Overview</a><a href="#drivers">Review tasks and maps</a><a href="#pathways">Housing pathways</a><a href="#unknowns">Unknowns</a><a href="#evidence">Evidence & records</a><div className="rail-facts"><span>Screen <strong className={`score-${scorecard.screeningRag.toLowerCase()}`}>{scorecard.screeningRag}</strong></span><span>Housing path <strong>{scorecard.pathwaySummary.replaceAll('_', ' ')}</strong></span><span>Project feasibility <strong>Not assessed</strong></span></div></aside>
        </div>
      </div>
    </main>
  )
}

function explanationInput(report: ParcelReport) {
  const { scorecard } = report
  return {
    pin: report.pin,
    scoreVersion: scorecard.scoreVersion,
    ruleVersion: scorecard.ruleVersions.join(', '),
    screeningRag: scorecard.screeningRag,
    pathwaySummary: scorecard.pathwaySummary,
    fallbackSummary: report.fallbackSummary,
    constraints: scorecard.mappedConstraints,
    reviewTasks: scorecard.reviewTasks,
    evidenceGaps: scorecard.evidenceGaps,
  }
}
