import { useState } from 'react'
import { acresFrom, formatNumber, siteAddress } from '../lib/format'
import type { SelectedParcel } from '../lib/types'

type Focus = 'developer' | 'planner' | 'nonprofit' | 'analyst'
type Props = {
  data: SelectedParcel | null
  loading: boolean
  error: string | null
  ran: boolean
  scenario: { use: string; units: number; affordability: string }
}

const steps: Record<Focus, string[]> = {
  developer: ['Confirm proposed use with City Planning against the current code.', 'Check dimensional standards, overlays, slope, utilities and site access.', 'Collect local rent and sale comparables before a financial decision.'],
  planner: ['Verify all zoning districts and overlays that touch this parcel.', 'Review site constraints and likely review path for the proposal.', 'Document evidence gaps before comparing this parcel with others.'],
  nonprofit: ['Confirm zoning and site constraints with City Planning.', 'Check subsidy eligibility and timing with the program administrator.', 'Collect local rent and sale comparables for a separate financial review.'],
  analyst: ['Check the effective zoning code version and parcel boundaries.', 'Record missing layers and rule coverage before comparing locations.', 'Do not extrapolate a single parcel result to a neighborhood.'],
}

export function ScreeningPanel({ data, loading, error, ran, scenario }: Props) {
  const [focus, setFocus] = useState<Focus>('developer')
  if (!data) return <div className="empty-report"><div aria-hidden="true">▧</div><h3>Start with a parcel</h3><p>Search by address or parcel ID, or select a boundary on the map. Then describe a housing scenario to review available facts and evidence gaps.</p></div>

  const address = siteAddress(data.assessment)
  const acres = acresFrom(data.assessment, data.feature.properties.CALCACREAGE)
  return <div className="report-scroll">
    {loading && <p className="status">Loading public parcel records…</p>}
    {error && <p className="status error">{error}</p>}
    <p className="site-address">{address.line1 || 'Address unavailable'}{address.line2 && <><br />{address.line2}</>}</p>
    <div className="score-state"><span className="score-icon" aria-hidden="true">?</span><div><strong>{ran ? 'Unrated — evidence incomplete' : 'Screening not run yet'}</strong><p>{ran ? 'No green, yellow or red grade is assigned. Verified use rules, all zoning intersections and an environmental layer are still needed.' : 'Confirm the housing scenario and run an early screening.'}</p></div></div>
    {ran && <details className="rating-guide"><summary>How the proposed grading works</summary><p><strong>Green:</strong> no major barrier in the verified scope. <strong>Yellow:</strong> confirmed extra review or mitigation. <strong>Red:</strong> confirmed major barrier for this scenario. <strong>Unrated:</strong> required evidence is missing. Finances are assessed separately.</p></details>}
    {ran && <div className="scenario-summary"><span>Scenario screened</span><strong>{scenario.use} · {scenario.units} {scenario.units === 1 ? 'unit' : 'units'} · {scenario.affordability}</strong></div>}
    <div className="focus-row"><label htmlFor="focus">Reading focus</label><select id="focus" value={focus} onChange={(event) => setFocus(event.target.value as Focus)}><option value="developer">Development</option><option value="planner">Public planning</option><option value="nonprofit">Community housing</option><option value="analyst">Policy analysis</option></select></div>
    <section className="report-section"><h3>What we know</h3><dl className="fact-list"><div><dt>Parcel ID</dt><dd>{data.feature.properties.PIN || 'Unknown'}</dd></div><div><dt>Site address</dt><dd>{address.line1 || 'Unknown'}</dd></div><div><dt>Lot area</dt><dd>{acres !== null ? `${formatNumber(acres, 2)} acres` : 'Unknown'}</dd></div><div><dt>Assessment use</dt><dd>{data.assessment?.USEDESC || 'Unknown'}</dd></div><div><dt>Zoning at sample point</dt><dd>{data.zoning ? `${data.zoning.code} · ${data.zoning.description}` : 'Unknown'}</dd></div></dl><p className="evidence-caution">Point lookup is context only. Full parcel and overlay intersections have not been checked.</p></section>
    <section className="report-section"><h3>Needs verification</h3><ul className="bullet-list"><li>All zoning districts and overlays intersecting this parcel</li><li>Whether {scenario.use.toLowerCase()} is permitted under the effective code</li><li>Dimensional standards, site conditions and 25%+ steep slope overlap</li><li>Infrastructure capacity and permit review path</li></ul></section>
    <section className="report-section"><h3>Next steps</h3><ol className="next-list">{steps[focus].map((step) => <li key={step}>{step}</li>)}</ol></section>
    <section className="report-section source-section"><h3>Sources & scope</h3><a href="https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1" target="_blank" rel="noreferrer">Allegheny County parcel boundaries ↗</a><a href="https://data.wprdc.org/dataset/property-assessments" target="_blank" rel="noreferrer">Allegheny County assessments ↗</a><a href="https://services1.arcgis.com/YZCmUqbcsUpOKfj7/ArcGIS/rest/services/PGHWebZoning/FeatureServer/0" target="_blank" rel="noreferrer">City zoning GIS layer ↗</a><p>Source update dates and full GIS intersection results are not available in this prototype. Confirm current data before acting.</p></section>
    <div className="finance-note"><strong>Financial feasibility not assessed</strong><p>County values and past sales are not local rent or sale comparables. Review costs, financing and subsidies separately.</p></div>
  </div>
}
