import type { SourceObservations } from '../lib/types'
import { sourceObservationRows } from '../lib/sourceObservationView'

export function SourceObservationsList({ sources }: { sources?: SourceObservations }) {
  const rows = sourceObservationRows(sources)
  if (!rows.length) return <p>No source observations are available yet.</p>
  return (
    <div className="source-list">
      {rows.map((row) => (
        <article key={row.key} className="source-row">
          <h3>{row.label}</h3>
          <p className="source-fact">{row.fact}</p>
          {row.statusNote && <p className="source-status">{row.statusNote}</p>}
          <p className="source-meta">
            <span>{row.joinLabel}</span>
            {row.publishedLabel && <span>{row.publishedLabel}</span>}
            <a href={row.sourceUrl} target="_blank" rel="noreferrer">Original source ↗</a>
          </p>
        </article>
      ))}
    </div>
  )
}
