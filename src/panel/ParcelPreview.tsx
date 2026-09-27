import { siteAddress } from '../lib/format'
import { makeParcelReport } from '../lib/reportView'
import { screeningPresentation } from '../lib/screening/presentation'
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
  const shown = report ? screeningPresentation(report.scorecard) : null
  return <aside className="parcel-preview" aria-label="Selected parcel preview"><div className="preview-top"><div><p className="eyebrow">Selected parcel</p><h2>{address.line1}</h2><small>{address.line2 || pin}</small></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close preview">×</button></div>
    <div className="preview-body"><p className="preview-pin">Parcel ID <strong>{pin || '—'}</strong></p>{loading && <p role="status">Loading screening facts…</p>}{error && <p role="alert" className="status error">{error}</p>}{report && shown && <><div className="preview-result"><strong className={`score-${report.scorecard.screeningRag.toLowerCase()}`}>{report.scorecard.screeningRag}</strong><span>Development Ease Score · Preliminary</span></div><p className="preview-summary">{shown.pathwayText}</p><p className="preview-summary"><b>Next check:</b> {shown.firstAction}</p><p className="scope-note">{shown.scope}</p><div className="preview-actions"><a className="primary-button" href={`/parcels/${pin}`} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); onReport(pin) }}>View full report →</a><button type="button" onClick={() => onAdd(pin)} disabled={saved}>{saved ? '✓ Added' : '+ Add to list'}</button></div></>}{!report && !loading && data && <a href={`/parcels/${pin}`} onClick={(event) => { event.preventDefault(); onReport(pin) }}>View report →</a>}</div>
  </aside>
}
