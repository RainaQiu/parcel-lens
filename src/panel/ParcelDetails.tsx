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
import type { SelectedParcel } from '../lib/types'

type Props = {
  loading: boolean
  error: string | null
  data: SelectedParcel | null
  onClose?: () => void
  embedded?: boolean
}

export function ParcelDetails({ loading, error, data, onClose, embedded = false }: Props) {
  const [copied, setCopied] = useState(false)
  const [unit, setUnit] = useState<'acres' | 'sqft'>('acres')

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

  return (
    <div className={embedded ? 'panel embedded' : 'panel'} aria-live="polite">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Parcel highlights</p>
          <h2>
            {address.line1}
            <span>{address.line2}</span>
          </h2>
        </div>
        {onClose && <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">×</button>}
      </header>

      {loading && <p className="status">Loading parcel records…</p>}
      {error && <p className="status error">{error}</p>}

      {!loading && data && (
        <div className="panel-body">
          <section className="card">
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

          <Section title="Parcel details">
            <Field label="Parcel ID" value={data.feature.properties.PIN} />
            <Field label="Site address" value={address.line1} />
            <Field label="Site city" value={assessment?.PROPERTYCITY} />
            <Field label="Municipality" value={assessment?.MUNIDESC} />
            <Field label="State" value={assessment?.PROPERTYSTATE ?? 'PA'} />
            <Field label="Site ZIP" value={assessment?.PROPERTYZIP} />
            <Field label="Map block lot" value={data.feature.properties.MAPBLOCKLOT} />
          </Section>

          <Section title="Owner information">
            <Field label="Owner type" value={assessment?.OWNERDESC} />
            <Field label="Mailing address" value={mailingAddress(assessment)} pre />
            <p className="note">
              Assessor owner names are withheld from the open assessment file (Allegheny
              County Ordinance 3478-07).
            </p>
          </Section>

          <Section title="Property sales & value">
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

          <Section title="Zoning, land use & vacancy">
            <Field label="Zoning code" value={data.zoning?.code} />
            <Field label="Zoning description" value={data.zoning?.description} />
            <Field label="Parcel use code" value={assessment?.USECODE} />
            <Field label="Parcel use description" value={assessment?.USEDESC} />
            <Field label="Class" value={assessment?.CLASSDESC} />
          </Section>

          <Section title="Geographic information">
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
            <Field
              label="Centroid coordinates"
              value={formatCentroid(data.feature)}
            />
          </Section>

          <Section title="Plat, block, lot, legal data">
            <Field label="Legal description" value={legalDescription(assessment)} />
            <Field label="Deed book" value={assessment?.DEEDBOOK} />
            <Field label="Deed page" value={assessment?.DEEDPAGE} />
          </Section>
        </div>
      )}
    </div>
  )
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
