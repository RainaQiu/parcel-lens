import { useState } from 'react'
import { DEMO_VERSIONS } from '../lib/demo'
import { acresFrom, formatNumber, siteAddress } from '../lib/format'
import type { SelectedParcel } from '../lib/types'

type Focus = 'developer' | 'planner' | 'nonprofit' | 'analyst'
type Props = {
  data: SelectedParcel | null
  loading: boolean
  error: string | null
  ran: boolean
  isDemo: boolean
  showFlood: boolean
  onShowFloodChange: (visible: boolean) => void
  scenario: { use: string; units: number; affordability: string }
}

const steps: Record<Focus, string[]> = {
  developer: ['Ask a local professional to verify the actual flood designation and any effect on the proposed building footprint.', 'Check current zoning, dimensional standards and the permit review path.', 'Build a separate cost and financing analysis using local comparables.'],
  planner: ['Verify the applicable parcel, zoning and flood layers in the City review process.', 'Confirm whether a proposed footprint touches a mapped constraint.', 'Document the evidence and review path before making a determination.'],
  nonprofit: ['Verify site constraints before committing predevelopment funds.', 'Check subsidy eligibility and timelines with the program administrator.', 'Collect local comparable rents and costs for a separate feasibility review.'],
  analyst: ['Record the effective layer versions and parcel boundary source.', 'Test how the result changes with the housing scenario and footprint.', 'Do not extrapolate a single parcel result to a neighborhood.'],
}

export function ScreeningPanel({ data, loading, error, ran, isDemo, showFlood, onShowFloodChange, scenario }: Props) {
  const [focus, setFocus] = useState<Focus>('developer')
  if (!data) return <div className="empty-report"><div aria-hidden="true">▧</div><h3>Start with a parcel</h3><p>Search, click a parcel on the map, or load the guided example. The report will appear here beside the map.</p></div>

  const address = siteAddress(data.assessment)
  const acres = acresFrom(data.assessment, data.feature.properties.CALCACREAGE)
  const supportedDemoScenario = scenario.use === 'Duplex' && scenario.units === 2 && scenario.affordability === 'Mixed income'
  const demoHasFlood = data.feature.properties.PIN === 'DEMO-PL-001'

  if (isDemo) return <div className="screening-body">
    <p className="demo-disclaimer"><strong>Synthetic walkthrough.</strong> The parcel, zoning assumption, flood shape and result below are invented. They are not a real hazard or permit finding.</p>
    {!ran ? <div className="score-state pending"><span className="score-icon" aria-hidden="true">→</span><div><strong>Ready to screen the demo parcel</strong><p>The preset is a two-unit, mixed-income duplex. Run early screening to see the report and map overlay together.</p></div></div>
      : supportedDemoScenario ? <>
        <div className={`result-banner ${demoHasFlood ? '' : 'green'}`}><div className="result-banner-top"><span className="result-kicker">Zoning & site screening · demo result</span><span className={`result-band ${demoHasFlood ? '' : 'green'}`}>{demoHasFlood ? 'AMBER' : 'GREEN'}</span></div><h3>{demoHasFlood ? 'Flood review needs a closer look' : 'No flag in the demo checks'}</h3><p>{demoHasFlood ? 'The synthetic flood review shape partly overlaps this synthetic parcel. The demo zoning and size checks pass; the overlap creates a follow-up, not a real flood determination.' : 'The invented duplex use and size checks pass, and the synthetic flood review shape does not touch this invented parcel. Real conditions remain unassessed.'}</p><span className="result-rule">Rule {DEMO_VERSIONS.rubric} · {DEMO_VERSIONS.asOf}</span></div>
        <div className="dimension-row"><div><span>Site suitability</span><strong className={demoHasFlood ? 'amber-text' : 'green-text'}>{demoHasFlood ? 'Amber' : 'Green'}</strong></div><div><span>Land availability</span><strong>Unknown</strong></div><div><span>Financial achievability</span><strong>Unknown</strong></div></div>
        <p className="scope-line">Overall development ease is not assessed. This demo only illustrates a zoning and site workflow.</p>
        <div className="focus-row"><label htmlFor="focus">Reading focus</label><select id="focus" value={focus} onChange={(event) => setFocus(event.target.value as Focus)}><option value="developer">Development</option><option value="planner">Public planning</option><option value="nonprofit">Community housing</option><option value="analyst">Policy analysis</option></select></div>
        <section className="report-section"><div className="report-section-heading"><h3>Why this result?</h3><span>{demoHasFlood ? '2 checks + 1 flag' : '3 demo checks'}</span></div><div className="driver-list"><div className="driver-row"><span className="driver-symbol pass">✓</span><div><strong>Demo use route</strong><p>Duplex assumed permitted for this example only. No Pittsburgh zoning rule was evaluated.</p></div><span className="driver-status">Pass</span></div><div className="driver-row"><span className="driver-symbol pass">✓</span><div><strong>Demo size check</strong><p>Illustrative lot size passes the invented rule for this scenario.</p></div><span className="driver-status">Pass</span></div><div className={`driver-row ${demoHasFlood ? 'flagged' : ''}`}><span className={`driver-symbol ${demoHasFlood ? 'flag' : 'pass'}`}>{demoHasFlood ? '!' : '✓'}</span><div><strong>{demoHasFlood ? 'Mock flood overlay intersects parcel' : 'No mock flood overlap'}</strong><p>{demoHasFlood ? 'Part of the selected polygon is covered by the blue demo layer. A real review would need a verified boundary and proposed building footprint.' : 'The blue synthetic overlay does not touch this selected synthetic parcel. This is not a real hazard clearance.'}</p></div><span className="driver-status">{demoHasFlood ? 'Review' : 'Pass'}</span></div></div></section>
        <section className="report-section layer-evidence"><div className="report-section-heading"><h3>Map evidence</h3><button type="button" className="text-button" onClick={() => onShowFloodChange(!showFlood)}>{showFlood ? 'Hide on map' : 'Show on map'}</button></div><div className="layer-preview"><i className="layer-preview-shape" aria-hidden="true" /><div><strong>Synthetic flood review overlay</strong><p>{demoHasFlood ? 'Partial parcel overlap · footprint effect unknown' : 'No overlap with this synthetic parcel'}</p></div></div><dl className="version-list"><div><dt>Overlay version</dt><dd>{DEMO_VERSIONS.flood}</dd></div><div><dt>Parcel geometry</dt><dd>{DEMO_VERSIONS.parcel}</dd></div><div><dt>Demo zoning</dt><dd>{DEMO_VERSIONS.zoning}</dd></div><div><dt>Prepared</dt><dd>{DEMO_VERSIONS.asOf}</dd></div></dl><p className="evidence-caution">This is not a FEMA or City GIS layer. For a real site, obtain the current official hazard layer, check spatial accuracy and confirm the proposed footprint.</p></section>
        <section className="report-section"><h3>Next steps</h3><ol className="next-list">{steps[focus].map((step) => <li key={step}>{step}</li>)}</ol></section>
        <section className="report-section source-section"><h3>Method & production references</h3><a href="https://github.com/RainaQiu/parcel-lens/blob/main/docs/Development_Ease_Scoring_Proposal.md" target="_blank" rel="noreferrer">Read the public scoring method ↗</a><a href="https://msc.fema.gov/portal/home" target="_blank" rel="noreferrer">FEMA Flood Map Service Center · production reference ↗</a><p>Neither link supplied the invented demo geometry or result. No official data version is claimed for this walkthrough.</p></section>
      </> : <div className="score-state"><span className="score-icon" aria-hidden="true">?</span><div><strong>Unrated — demo rule does not cover this scenario</strong><p>The synthetic rule set only covers a two-unit mixed-income duplex. Select “Load demo parcel” to restore that preset, or continue with a real parcel and public-data evidence gaps.</p></div></div>}
    {ran && <details className="rating-guide"><summary>How the grade is decided</summary><p>In this synthetic example, the demo use and size checks pass. The mock overlay {demoHasFlood ? 'partly overlaps the parcel and produces Amber' : 'does not overlap the parcel, so the demo site check is Green'}. Missing required inputs would produce Unrated; a confirmed major blocker would produce Red. There is no numeric score or approval prediction.</p></details>}
  </div>

  return <div className="screening-body">
    {loading && <p className="status">Loading public parcel records…</p>}
    {error && <p className="status error">{error}</p>}
    <p className="site-address">{address.line1 || 'Address unavailable'}{address.line2 && <><br />{address.line2}</>}</p>
    <div className="score-state"><span className="score-icon" aria-hidden="true">?</span><div><strong>{ran ? 'Unrated — evidence incomplete' : 'Screening not run yet'}</strong><p>{ran ? 'No green, amber or red grade is assigned. Verified use rules, full zoning intersections and an environmental layer are still needed.' : 'Confirm the housing scenario and run an early screening.'}</p></div></div>
    {ran && <details className="rating-guide"><summary>How the proposed grading works</summary><p>Green: no major barrier in the verified scope. Amber: confirmed extra review or mitigation. Red: confirmed major barrier for this scenario. Unrated: required evidence is missing. Finances are separate.</p></details>}
    {ran && <div className="scenario-summary"><span>Scenario screened</span><strong>{scenario.use} · {scenario.units} {scenario.units === 1 ? 'unit' : 'units'} · {scenario.affordability}</strong></div>}
    <section className="report-section"><h3>What we know</h3><dl className="fact-list"><div><dt>Parcel ID</dt><dd>{data.feature.properties.PIN || 'Unknown'}</dd></div><div><dt>Site address</dt><dd>{address.line1 || 'Unknown'}</dd></div><div><dt>Lot area</dt><dd>{acres !== null ? `${formatNumber(acres, 2)} acres` : 'Unknown'}</dd></div><div><dt>Assessment use</dt><dd>{data.assessment?.USEDESC || 'Unknown'}</dd></div><div><dt>Zoning at sample point</dt><dd>{data.zoning ? `${data.zoning.code} · ${data.zoning.description}` : 'Unknown'}</dd></div></dl><p className="evidence-caution">Point lookup is context only. Full parcel and overlay intersections have not been checked.</p></section>
    <section className="report-section"><h3>Needs verification</h3><ul className="bullet-list"><li>All zoning districts and overlays intersecting this parcel</li><li>Whether {scenario.use.toLowerCase()} is permitted under the effective code</li><li>Dimensional standards, site conditions and flood or steep slope overlap</li><li>Infrastructure capacity and permit review path</li></ul></section>
    <section className="report-section source-section"><h3>Sources & scope</h3><a href="https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1" target="_blank" rel="noreferrer">Allegheny County parcel boundaries ↗</a><a href="https://data.wprdc.org/dataset/property-assessments" target="_blank" rel="noreferrer">Allegheny County assessments ↗</a><a href="https://services1.arcgis.com/YZCmUqbcsUpOKfj7/ArcGIS/rest/services/PGHWebZoning/FeatureServer/0" target="_blank" rel="noreferrer">City zoning GIS layer ↗</a><p>Source update dates and full GIS intersection results are not available in this prototype. Confirm current data before acting.</p></section>
    <div className="finance-note"><strong>Financial feasibility not assessed</strong><p>County values and past sales are not local rent or sale comparables. Review costs, financing and subsidies separately.</p></div>
  </div>
}
