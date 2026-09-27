import { useEffect, useState } from 'react'
import { formatMoney, formatNumber, mailingAddress, siteAddress } from '../lib/format'
import { loadParcelByPin } from '../lib/parcelReport'
import { humanizeMissing, makeParcelReport, type ParcelReport } from '../lib/reportView'
import type { Barrier, SourceObservation } from '../lib/types'

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

  const { score, selected } = report
  const address = siteAddress(selected.assessment)
  const explainedDrivers = new Map(explanation?.drivers.map((driver) => [driver.id, driver]) ?? [])
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
              <div className="report-summary-heading"><span className={`report-status score-${score.easeScore.toLowerCase()}`}>{score.easeScore === 'UNRATED' ? 'Not enough evidence to rate' : `${score.easeScore} · Parcel screening`}</span><span>Rule {score.scoreVersion}</span></div>
              <h2>What matters first</h2>
              <p className="report-lead">{explanation?.summary ?? report.fallbackSummary}</p>
              {explanation ? <p className="ai-label">AI explanation of the verified screening facts</p> : explanationUnavailable ? <p className="fallback-label">AI explanation unavailable; showing the source-based summary.</p> : <p className="fallback-label">Showing the source-based summary.</p>}
              <p className="scope-note">This screening describes listed housing pathways and observed parcel constraints. It does not determine permits, project size, financial feasibility, or approval.</p>
            </section>

            <section className="report-section" id="drivers"><div className="section-heading"><span>01</span><div><h2>Why this result?</h2><p>Important observations and the next checks they suggest.</p></div></div>
              {score.drivers.length ? <div className="finding-list">{score.drivers.map((driver, index) => <Finding key={`${driver.id}-${index}`} driver={driver} explanation={explainedDrivers.get(driver.id)} />)}</div> : <p className="empty-note">No rated constraint drivers are available for this parcel.</p>}
            </section>

            <section className="report-section" id="pathways"><div className="section-heading"><span>02</span><div><h2>Housing pathways</h2><p>Base district use listings only; site and project rules still need review.</p></div></div>
              <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Housing use</th><th>District</th><th>Listed path</th><th>Source</th></tr></thead><tbody>{score.housingPathways.map((row) => <tr key={`${row.useType}-${row.districtKey}-${row.rawDistrict}`}><td>{row.useLabel}</td><td>{row.rawDistrict}</td><td><strong className={`score-${row.rag.toLowerCase()}`}>{row.pathway === 'UNKNOWN' ? 'Not rated' : `${row.pathway} · ${row.rag}`}</strong>{row.notes && <small>{row.notes}</small>}</td><td><a href={row.sourceUrl} target="_blank" rel="noreferrer">Code {row.ruleVersion}</a></td></tr>)}</tbody></table>{score.housingPathways.length === 0 && <p>No verified pathway rows are available.</p>}</div>
            </section>

            <section className="report-section" id="unknowns"><div className="section-heading"><span>03</span><div><h2>What is still unknown?</h2><p>These items can change a real development decision.</p></div></div><ul className="unknown-list">{score.missingRequired.map((item) => <li key={item}>{humanizeMissing(item)}</li>)}{score.developmentPotentialRag === 'UNRATED' && <li>Project-specific setbacks, coverage, height/FAR, parking, and access have not been assessed.</li>}</ul>{score.missingRequired.length === 0 && score.developmentPotentialRag !== 'UNRATED' && <p>No additional required gaps were flagged by the current rules.</p>}</section>

            <section className="report-section" id="evidence"><div className="section-heading"><span>04</span><div><h2>Evidence and property records</h2><p>Inspect original sources, retrieval state, and assessor fields.</p></div></div>
              <details className="report-details"><summary>Source observations</summary><div className="source-list">{Object.entries(selected.ldes?.sources ?? {}).map(([key, value]) => { const source = value as SourceObservation<unknown>; return <div key={key}><strong>{key}</strong><span>{source.status}{source.nAReason ? ` · ${source.nAReason}` : ''}</span><small>Source updated: {source.sourceUpdatedAt ?? 'not provided'} · Retrieved: {source.retrievedAt ?? 'unknown'} · Join: {source.joinMethod}</small><a href={source.sourceUrl} target="_blank" rel="noreferrer">Original source ↗</a></div> })}</div></details>
              <details className="report-details"><summary>Parcel and assessor details</summary><dl className="property-grid"><div><dt>Parcel ID</dt><dd>{report.pin}</dd></div><div><dt>Lot area</dt><dd>{formatNumber(selected.assessment?.LOTAREA, 0)} sq ft</dd></div><div><dt>Municipality</dt><dd>{selected.assessment?.MUNIDESC ?? 'Unknown'}</dd></div><div><dt>Zoning description</dt><dd>{selected.zoning?.description ?? 'Unknown'}</dd></div><div><dt>Owner type</dt><dd>{selected.assessment?.OWNERDESC ?? 'Unknown'}</dd></div><div><dt>Mailing address</dt><dd>{mailingAddress(selected.assessment)}</dd></div><div><dt>Last sale price</dt><dd>{formatMoney(selected.assessment?.SALEPRICE)}</dd></div><div><dt>Last sale date</dt><dd>{selected.assessment?.SALEDATE ?? 'Unknown'}</dd></div></dl></details>
            </section>
          </div>
          <aside className="report-rail" aria-label="Report sections"><p className="eyebrow">In this report</p><a href="#overview">Overview</a><a href="#drivers">Why this result</a><a href="#pathways">Housing pathways</a><a href="#unknowns">Unknowns</a><a href="#evidence">Evidence & records</a><div className="rail-facts"><span>Zoning <strong className={`score-${score.zoningRag.toLowerCase()}`}>{score.zoningRag}</strong></span><span>Environment <strong className={`score-${score.environmentalGeotechnicalRag.toLowerCase()}`}>{score.environmentalGeotechnicalRag}</strong></span><span>Historic / condition <strong className={`score-${score.historicConditionRag.toLowerCase()}`}>{score.historicConditionRag}</strong></span><span>Evidence <strong>{score.evidenceConfidence}</strong></span></div></aside>
        </div>
      </div>
    </main>
  )
}

function Finding({ driver, explanation }: { driver: Barrier; explanation?: { explanation: string; nextStep: string } }) {
  return <article className={`finding finding-${driver.severity}`}><div className="finding-top"><span className="finding-number">{driver.severity === 'high' ? 'Major constraint' : 'Review item'}</span><strong>{driver.title}</strong></div><p><b>Observed:</b> {driver.detail}</p>{explanation && <p><b>Why it matters:</b> {explanation.explanation}</p>}<p><b>Next check:</b> {explanation?.nextStep ?? driver.nextStep}</p><div className="finding-source">{driver.source.url ? <a href={driver.source.url} target="_blank" rel="noreferrer">{driver.source.name} ↗</a> : driver.source.name}<span>{driver.source.field}: {driver.source.value}</span></div></article>
}

function explanationInput(report: ParcelReport) {
  const { score } = report
  return {
    pin: report.pin,
    scoreVersion: score.scoreVersion,
    ruleVersion: score.ruleVersion,
    overallResult: score.overallResult,
    fallbackSummary: report.fallbackSummary,
    drivers: score.drivers.map((driver) => ({ id: driver.id, title: driver.title, detail: driver.detail, nextStep: driver.nextStep, source: { name: driver.source.name, field: driver.source.field, value: driver.source.value, url: driver.source.url } })),
    missingRequired: score.missingRequired,
  }
}
