import { useState, type ReactNode } from 'react'
import {
  acresFrom,
  display,
  formatMoney,
  formatNumber,
  legalDescription,
  mailingAddress,
  siteAddress,
} from '../lib/format'
import { scoreParcel, scoreSummary } from '../lib/score'
import type { Barrier, SelectedParcel } from '../lib/types'
import { type PanelBlockId } from './blockOrder'
import { ExpandIcon, ShrinkIcon } from '../ui/icons'

type Props = {
  loading: boolean
  error: string | null
  data: SelectedParcel | null
  blockOrder: PanelBlockId[]
  onClose: () => void
}

export function ParcelDetails({ loading, error, data, blockOrder, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [unit, setUnit] = useState<'acres' | 'sqft'>('acres')
  const [expanded, setExpanded] = useState(false)

  const assessment = data?.assessment ?? null
  const address = siteAddress(assessment)
  const acres = acresFrom(assessment, data?.feature.properties.CALCACREAGE)
  const sqft =
    Number(assessment?.LOTAREA) ||
    (acres !== null ? acres * 43560 : null)
  const measurement =
    unit === 'acres'
      ? acres !== null
        ? `${formatNumber(acres, 2)} acres`
        : '—'
      : sqft !== null
        ? `${formatNumber(sqft, 0)} sq ft`
        : '—'

  async function copyAddress() {
    if (!address.full) return
    await navigator.clipboard.writeText(address.full)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const blocks: Record<PanelBlockId, ReactNode> | null = data
    ? {
        score: <ScoreCard key="score" data={data} />,
        highlights: (
          <section key="highlights" className="card">
            <div className="field">
              <span className="label">Full address</span>
              <div className="value-row">
                <address>
                  {address.line1}
                  <br />
                  {address.line2}
                </address>
                <button type="button" className="ghost" onClick={() => void copyAddress()}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="field">
              <span className="label">Measurements</span>
              <div className="value-row">
                <strong>{measurement}</strong>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setUnit(unit === 'acres' ? 'sqft' : 'acres')}
                >
                  {unit === 'acres' ? 'Show sq ft' : 'Show acres'}
                </button>
              </div>
            </div>
            <Field label="Zoning description" value={data.zoning?.description} />
            <Field label="Parcel use description" value={assessment?.USEDESC} />
          </section>
        ),
        parcel: (
          <Section key="parcel" title="Parcel details">
            <Field label="Parcel ID" value={data.feature.properties.PIN} />
            <Field label="Site address" value={address.line1} />
            <Field label="Site city" value={assessment?.PROPERTYCITY} />
            <Field label="Municipality" value={assessment?.MUNIDESC} />
            <Field label="State" value={assessment?.PROPERTYSTATE ?? 'PA'} />
            <Field label="Site ZIP" value={assessment?.PROPERTYZIP} />
            <Field label="Map block lot" value={data.feature.properties.MAPBLOCKLOT} />
          </Section>
        ),
        owner: (
          <Section key="owner" title="Owner information">
            <Field label="Owner type" value={assessment?.OWNERDESC} />
            <Field label="Mailing address" value={mailingAddress(assessment)} pre />
            <p className="note">
              Assessor owner names are withheld from the open assessment file (Allegheny
              County Ordinance 3478-07).
            </p>
          </Section>
        ),
        sales: (
          <Section key="sales" title="Property sales & value">
            <Field label="Last sale price" value={formatMoney(assessment?.SALEPRICE)} />
            <Field label="Last sale date" value={assessment?.SALEDATE} />
            <Field label="Sale description" value={assessment?.SALEDESC} />
            <p className="subhead">County provided values</p>
            <Field label="Fair market total" value={formatMoney(assessment?.FAIRMARKETTOTAL)} />
            <Field label="Fair market land" value={formatMoney(assessment?.FAIRMARKETLAND)} />
            <Field
              label="Fair market improvement"
              value={formatMoney(assessment?.FAIRMARKETBUILDING)}
            />
            <Field label="County total" value={formatMoney(assessment?.COUNTYTOTAL)} />
            <Field label="County land" value={formatMoney(assessment?.COUNTYLAND)} />
            <Field label="County building" value={formatMoney(assessment?.COUNTYBUILDING)} />
            <Field label="Tax status" value={assessment?.TAXDESC} />
          </Section>
        ),
        zoning: (
          <Section key="zoning" title="Zoning, land use & vacancy">
            <Field label="Zoning code" value={data.zoning?.code} />
            <Field label="Zoning description" value={data.zoning?.description} />
            <Field label="Parcel use code" value={assessment?.USECODE} />
            <Field label="Parcel use description" value={assessment?.USEDESC} />
            <Field label="Class" value={assessment?.CLASSDESC} />
          </Section>
        ),
        geo: (
          <Section key="geo" title="Geographic information">
            <Field
              label="County-provided acres"
              value={acres !== null ? formatNumber(acres, 2) : '—'}
            />
            <Field
              label="Parcel square feet"
              value={sqft !== null ? formatNumber(sqft, 0) : '—'}
            />
            <Field label="Neighborhood" value={assessment?.NEIGHDESC} />
            <Field label="Neighborhood code" value={assessment?.NEIGHCODE} />
            <Field label="School district" value={assessment?.SCHOOLDESC} />
            <Field label="Centroid coordinates" value={formatCentroid(data.feature)} />
          </Section>
        ),
        legal: (
          <Section key="legal" title="Plat, block, lot, legal data">
            <Field label="Legal description" value={legalDescription(assessment)} />
            <Field label="Deed book" value={assessment?.DEEDBOOK} />
            <Field label="Deed page" value={assessment?.DEEDPAGE} />
          </Section>
        ),
      }
    : null

  return (
    <aside className={expanded ? 'panel panel-expanded' : 'panel'} aria-live="polite">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Parcel highlights</p>
          <h2>
            {address.line1}
            <span>{address.line2}</span>
          </h2>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Shrink' : 'Expand details'}
            title={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? <ShrinkIcon /> : <ExpandIcon />}
          </button>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </div>
      </header>

      {loading && <p className="status">Loading parcel records…</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && data && blocks && (
        <div className="panel-body">{blockOrder.map((id) => blocks[id])}</div>
      )}
    </aside>
  )
}

function ScoreCard({ data }: { data: SelectedParcel }) {
  const result = scoreParcel(data)
  return (
    <section className="card score-card">
      <p className="eyebrow">Development Ease Score</p>
      <div className="score-hero">
        <strong className={`score-numeral score-${result.band}`}>{result.score}</strong>
        <div>
          <p className={`score-band score-${result.band}`}>{bandLabel(result.band)}</p>
          <p className="score-summary">{scoreSummary(result)}</p>
        </div>
      </div>
      <ul className="barrier-list">
        {result.barriers.map((item) => (
          <BarrierRow key={item.id} barrier={item} />
        ))}
      </ul>
      <p className="note unscored">
        Not in this score: {result.unscored.join(', ')}.
      </p>
    </section>
  )
}

function BarrierRow({ barrier }: { barrier: Barrier }) {
  return (
    <li className={`barrier barrier-${barrier.severity}`}>
      <div>
        <strong>{barrier.title}</strong>
        <p>{barrier.detail}</p>
      </div>
      <span className="source-chip" title={`${barrier.source.field}=${barrier.source.value}`}>
        {barrier.source.name} · {barrier.source.field} · {barrier.source.value}
      </span>
    </li>
  )
}

function bandLabel(band: 'easier' | 'mixed' | 'harder'): string {
  if (band === 'easier') return 'Easier'
  if (band === 'harder') return 'Harder'
  return 'Mixed'
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="card">
      <summary>{title}</summary>
      <div className="card-body">{children}</div>
    </details>
  )
}

function Field({
  label,
  value,
  pre,
}: {
  label: string
  value: unknown
  pre?: boolean
}) {
  const text = display(value)
  return (
    <div className="field">
      <span className="label">{label}</span>
      {pre ? <pre className="value-pre">{text}</pre> : <div className="value">{text}</div>}
    </div>
  )
}

function formatCentroid(feature: GeoJSON.Feature): string {
  const coords =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates[0]
      : feature.geometry.type === 'MultiPolygon'
        ? feature.geometry.coordinates[0][0]
        : []
  if (!coords.length) return '—'
  let x = 0
  let y = 0
  for (const [lng, lat] of coords) {
    x += lng
    y += lat
  }
  const lat = y / coords.length
  const lng = x / coords.length
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}
