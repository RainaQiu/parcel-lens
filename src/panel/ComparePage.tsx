import { useEffect, useState } from 'react'
import { loadParcelByPin } from '../lib/parcelReport'
import { makeParcelReport, type ParcelReport } from '../lib/reportView'
import { comparisonRows } from '../lib/screening/presentation'

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

  const loaded = pins.map((pin) => reports[pin]).filter((value): value is ParcelReport => Boolean(value))
  const { rows, warning } = comparisonRows(loaded)

  return <main className="compare-page"><div className="report-shell"><nav className="report-top-nav"><button type="button" className="text-button" onClick={onBack}>← Back to map</button><span className="report-brand"><img src="/logo-mark.png" alt="" width={22} height={22} />Parcel Lens / Compare</span></nav><header className="compare-header"><p className="eyebrow">Side-by-side screening</p><h1>Compare saved parcels</h1><p>Look at the same constraints and evidence gaps for each parcel. Colors describe limited screening, not a development recommendation.</p></header>
    {pins.length < 2 ? <div className="compare-empty"><h2>Add at least two parcels</h2><p>Search an address or parcel ID on the map, then use “Add to list.”</p><button type="button" onClick={onBack}>Find parcels</button></div> : <>
      {warning && <p className="compare-warning">{warning}</p>}
      <div className="compare-table-wrap"><table className="compare-table"><thead><tr><th scope="col">Dimension</th>{pins.map((pin) => <th scope="col" key={pin}><div className="compare-parcel-heading"><strong>{reports[pin]?.address ?? 'Loading parcel…'}</strong><small>{pin}</small><div><button type="button" onClick={() => onOpenReport(pin)}>Full report</button><button type="button" onClick={() => onRemove(pin)} aria-label={`Remove ${pin}`}>Remove</button></div></div></th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.label} className={row.label !== 'Data retrieved' && new Set(loaded.map(row.value)).size > 1 ? 'compare-different' : undefined}><th scope="row">{row.label}</th>{pins.map((pin) => <td key={pin}>{errors[pin] ? <span className="score-red">{errors[pin]}</span> : reports[pin] ? row.value(reports[pin]) : 'Loading…'}</td>)}</tr>)}</tbody></table></div>
      <div className="compare-mobile">{pins.map((pin) => <section className="compare-mobile-card" key={pin}><div className="compare-parcel-heading"><strong>{reports[pin]?.address ?? 'Loading parcel…'}</strong><small>{pin}</small><div><button type="button" onClick={() => onOpenReport(pin)}>Full report</button><button type="button" onClick={() => onRemove(pin)} aria-label={`Remove ${pin}`}>Remove</button></div></div>{errors[pin] ? <p className="score-red">{errors[pin]}</p> : <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{reports[pin] ? row.value(reports[pin]) : 'Loading…'}</dd></div>)}</dl>}</section>)}</div>
      <p className="scope-note">Unknown is not equivalent to a failed check. Open each full report to inspect the original sources, dates, and next verification steps.</p>
    </>}
  </div></main>
}
