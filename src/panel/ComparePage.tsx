import { useEffect, useState } from 'react'
import { loadParcelByPin } from '../lib/parcelReport'
import { humanizeMissing, makeParcelReport, type ParcelReport } from '../lib/reportView'

type Props = {
  pins: string[]
  cache: Record<string, ParcelReport>
  onLoaded: (report: ParcelReport) => void
  onRemove: (pin: string) => void
  onBack: () => void
  onOpenReport: (pin: string) => void
}

export function ComparePage({ pins, cache, onLoaded, onRemove, onBack, onOpenReport }: Props) {
  const [reports, setReports] = useState<Record<string, ParcelReport>>(cache)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const controller = new AbortController()
    for (const pin of pins) {
      if (cache[pin]) continue
      void loadParcelByPin(pin, controller.signal).then((selected) => {
        if (controller.signal.aborted) return
        const report = makeParcelReport(selected)
        setReports((previous) => ({ ...previous, [pin]: report }))
        onLoaded(report)
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setErrors((previous) => ({ ...previous, [pin]: error instanceof Error ? error.message : 'Could not load parcel' }))
      })
    }
    return () => controller.abort()
    // Only newly selected PINs should trigger network requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins.join('|')])

  const rows: Array<{ label: string; value: (report: ParcelReport) => string }> = [
    { label: 'Parcel screening', value: (r) => r.score.easeScore === 'UNRATED' ? 'Not rated · evidence incomplete' : `${r.score.easeScore} · ${r.score.easeScore === 'RED' ? 'major constraints' : r.score.easeScore === 'AMBER' ? 'review needed' : 'no major constraint found'}` },
    { label: 'Zoning pathway', value: (r) => r.score.zoningRag === 'UNRATED' ? 'Not rated' : r.score.zoningRag },
    { label: 'Environment / ground', value: (r) => r.score.environmentalGeotechnicalRag === 'UNRATED' ? 'Not rated' : r.score.environmentalGeotechnicalRag },
    { label: 'Historic / condition', value: (r) => r.score.historicConditionRag === 'UNRATED' ? 'Not rated' : r.score.historicConditionRag },
    { label: 'Development potential', value: (r) => r.score.developmentPotentialRag === 'UNRATED' ? 'Not assessed for a project' : r.score.developmentPotentialRag },
    { label: 'Main constraints', value: (r) => r.score.drivers.slice(0, 3).map((driver) => driver.title).join('; ') || 'None identified by current rules' },
    { label: 'Unknown / missing', value: (r) => r.score.missingRequired.slice(0, 3).map(humanizeMissing).join('; ') || 'No required gaps flagged' },
    { label: 'Unavailable sources', value: (r) => Object.entries(r.selected.ldes?.sources ?? {}).filter(([, source]) => source?.status === 'unavailable').map(([name]) => name).join('; ') || 'None reported unavailable' },
    { label: 'Evidence confidence', value: (r) => r.score.evidenceConfidence === 'NOT_RATED' ? 'Evidence incomplete' : r.score.evidenceConfidence },
    { label: 'Rule version', value: (r) => r.score.scoreVersion },
    { label: 'Data retrieved', value: (r) => r.selected.ldes?.retrievedAt ? new Date(r.selected.ldes.retrievedAt).toLocaleString() : 'Not provided' },
  ]
  const loaded = pins.map((pin) => reports[pin]).filter((value): value is ParcelReport => Boolean(value))
  const versions = new Set(loaded.map((report) => report.score.scoreVersion))

  return <main className="compare-page"><div className="report-shell"><nav className="report-top-nav"><button type="button" className="text-button" onClick={onBack}>← Back to map</button><span>Parcel Lens / Compare</span></nav><header className="compare-header"><p className="eyebrow">Side-by-side screening</p><h1>Compare saved parcels</h1><p>Look at the same constraints and evidence gaps for each parcel. Colors describe limited screening, not a development recommendation.</p></header>
    {pins.length < 2 ? <div className="compare-empty"><h2>Add at least two parcels</h2><p>Search an address or parcel ID on the map, then use “Add to list.”</p><button type="button" onClick={onBack}>Find parcels</button></div> : <>
      {versions.size > 1 && <p className="compare-warning">These parcels use different rule versions; do not compare headline statuses directly.</p>}
      <div className="compare-table-wrap"><table className="compare-table"><thead><tr><th scope="col">Dimension</th>{pins.map((pin) => <th scope="col" key={pin}><div className="compare-parcel-heading"><strong>{reports[pin]?.address ?? 'Loading parcel…'}</strong><small>{pin}</small><div><button type="button" onClick={() => onOpenReport(pin)}>Full report</button><button type="button" onClick={() => onRemove(pin)} aria-label={`Remove ${pin}`}>Remove</button></div></div></th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.label} className={row.label !== 'Data retrieved' && new Set(loaded.map(row.value)).size > 1 ? 'compare-different' : undefined}><th scope="row">{row.label}</th>{pins.map((pin) => <td key={pin}>{errors[pin] ? <span className="score-red">{errors[pin]}</span> : reports[pin] ? row.value(reports[pin]) : 'Loading…'}</td>)}</tr>)}</tbody></table></div>
      <div className="compare-mobile">{pins.map((pin) => <section className="compare-mobile-card" key={pin}><div className="compare-parcel-heading"><strong>{reports[pin]?.address ?? 'Loading parcel…'}</strong><small>{pin}</small><div><button type="button" onClick={() => onOpenReport(pin)}>Full report</button><button type="button" onClick={() => onRemove(pin)} aria-label={`Remove ${pin}`}>Remove</button></div></div>{errors[pin] ? <p className="score-red">{errors[pin]}</p> : <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{reports[pin] ? row.value(reports[pin]) : 'Loading…'}</dd></div>)}</dl>}</section>)}</div>
      <p className="scope-note">Unknown is not equivalent to a failed check. Open each full report to inspect the original sources, dates, and next verification steps.</p>
    </>}
  </div></main>
}
