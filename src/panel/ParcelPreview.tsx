import { siteAddress } from '../lib/format'
import { makeParcelReport } from '../lib/reportView'
import type { SelectedParcel } from '../lib/types'

type Props = {
  data: SelectedParcel | null
  loading: boolean
  error: string | null
  saved: boolean
  onClose: () => void
  onReport: (pin: string) => void
  onAdd: (pin: string) => void
}

export function ParcelPreview({ data, loading, error, saved, onClose, onReport, onAdd }: Props) {
  const pin = data?.feature.properties.PIN ?? ''
  const address = data ? siteAddress(data.assessment) : { line1: 'Parcel lookup', line2: '' }
  const report = data?.ldes ? makeParcelReport(data) : null
  return <aside className="parcel-preview" aria-label="Selected parcel preview"><div className="preview-top"><div><p className="eyebrow">Selected parcel</p><h2>{address.line1}</h2><small>{address.line2 || pin}</small></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">×</button></div>
    <div className="preview-body"><p className="preview-pin">Parcel ID <strong>{pin || '—'}</strong></p>{loading && <p role="status">Loading screening facts…</p>}{error && <p role="alert" className="status error">{error}</p>}{report && <><div className="preview-result"><strong className={`score-${report.score.easeScore.toLowerCase()}`}>{report.score.easeScore === 'UNRATED' ? 'Not rated' : report.score.easeScore}</strong><span>Parcel screening · {report.score.evidenceConfidence === 'NOT_RATED' ? 'evidence incomplete' : `${report.score.evidenceConfidence.toLowerCase()} evidence`}</span></div><p className="preview-summary">{report.score.drivers.slice(0, 2).map((driver) => driver.title).join(' · ') || 'Review the report for evidence and unknowns.'}</p><div className="preview-actions"><a className="primary-button" href={`/parcels/${pin}`} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onReport(pin) }}>View full report →</a><button type="button" onClick={() => onAdd(pin)} disabled={saved}>{saved ? '✓ Added' : '+ Add to list'}</button></div></>}{!report && !loading && data && <a href={`/parcels/${pin}`} onClick={(event) => { event.preventDefault(); onReport(pin) }}>View report →</a>}</div>
  </aside>
}
