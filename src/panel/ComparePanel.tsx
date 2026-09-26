import { DEMO_VERSIONS } from '../lib/demo'
import { acresFrom, formatNumber } from '../lib/format'
import type { SelectedParcel } from '../lib/types'

export type Scenario = { use: string; units: number; affordability: string }
export type PinnedParcel = { data: SelectedParcel; isDemo: boolean; scenario: Scenario }

type Props = {
  pinned: PinnedParcel
  current: SelectedParcel
  currentIsDemo: boolean
  currentScenario: Scenario
  currentRan: boolean
}

function grade(data: SelectedParcel, isDemo: boolean, scenario: Scenario): string {
  if (!isDemo || scenario.use !== 'Duplex' || scenario.units !== 2 || scenario.affordability !== 'Mixed income') return 'Unrated'
  return data.feature.properties.PIN === 'DEMO-PL-001' ? 'Amber' : 'Green'
}

export function ComparePanel({ pinned, current, currentIsDemo, currentScenario, currentRan }: Props) {
  const sameParcel = pinned.data.feature.properties.PIN === current.feature.properties.PIN
  const sameScenario = JSON.stringify(pinned.scenario) === JSON.stringify(currentScenario)
  const sameEvidence = pinned.isDemo === currentIsDemo
  const comparable = !sameParcel && sameScenario && sameEvidence && currentRan && pinned.isDemo && currentIsDemo
  const aGrade = grade(pinned.data, pinned.isDemo, pinned.scenario)
  const bGrade = currentRan ? grade(current, currentIsDemo, currentScenario) : 'Not run'
  const aArea = acresFrom(pinned.data.assessment, pinned.data.feature.properties.CALCACREAGE)
  const bArea = acresFrom(current.assessment, current.feature.properties.CALCACREAGE)

  return <div className="compare-body">
    <div className="compare-intro"><strong>Compare two parcels</strong><p>A stays pinned while you explore B. Both columns use the same housing scenario; grades are only compared when the evidence and rule versions match.</p></div>
    {sameParcel ? <p className="compare-warning">Choose a different parcel ID for B. The same parcel cannot be compared with itself.</p>
      : !sameScenario ? <p className="compare-warning">Scenarios differ. Restore the pinned scenario ({pinned.scenario.use}, {pinned.scenario.units} units, {pinned.scenario.affordability}) before comparing grades.</p>
        : !sameEvidence ? <p className="compare-warning">Evidence coverage differs between these parcels. Review each report separately; the grades cannot be ranked.</p>
          : !currentRan ? <p className="compare-warning">Run early screening for B to complete the comparison.</p>
            : !comparable ? <p className="compare-warning">The available real-parcel evidence is incomplete. Compare the facts below, but do not rank development ease.</p>
              : <p className="compare-note">Illustrative comparison only · same synthetic scenario and {DEMO_VERSIONS.rubric}.</p>}
    <div className="compare-table" role="table" aria-label="Pinned parcel versus current parcel">
      <div className="compare-row compare-columns" role="row"><span role="columnheader">Measure</span><strong role="columnheader">A · Pinned</strong><strong role="columnheader">B · Current</strong></div>
      <div className="compare-row" role="row"><span role="cell">Parcel</span><strong role="cell">{pinned.data.feature.properties.PIN}</strong><strong role="cell">{current.feature.properties.PIN}</strong></div>
      <div className="compare-row" role="row"><span role="cell">Scenario</span><span role="cell">{pinned.scenario.use} · {pinned.scenario.units} units</span><span role="cell">{currentScenario.use} · {currentScenario.units} units</span></div>
      <div className="compare-row" role="row"><span role="cell">Site area</span><span role="cell">{aArea !== null ? `${formatNumber(aArea, 2)} acres` : 'Unknown'}</span><span role="cell">{bArea !== null ? `${formatNumber(bArea, 2)} acres` : 'Unknown'}</span></div>
      <div className="compare-row" role="row"><span role="cell">Zoning</span><span role="cell">{pinned.data.zoning?.code ?? 'Unknown'}</span><span role="cell">{current.zoning?.code ?? 'Unknown'}</span></div>
      <div className="compare-row" role="row"><span role="cell">Flood overlay</span><span role="cell">{pinned.isDemo ? pinned.data.feature.properties.PIN === 'DEMO-PL-001' ? 'Mock overlap' : 'None in mock' : 'Not checked'}</span><span role="cell">{currentIsDemo ? current.feature.properties.PIN === 'DEMO-PL-001' ? 'Mock overlap' : 'None in mock' : 'Not checked'}</span></div>
      <div className="compare-row compare-grade" role="row"><span role="cell">Site grade</span><strong role="cell" className={comparable ? `grade-${aGrade.toLowerCase()}` : ''}>{comparable ? aGrade : 'Not comparable'}</strong><strong role="cell" className={comparable ? `grade-${bGrade.toLowerCase()}` : ''}>{comparable ? bGrade : 'Not comparable'}</strong></div>
    </div>
    <div className="compare-guidance"><strong>Read the difference</strong><p>{comparable ? 'In this mock example, B has no overlap with the invented flood layer while A does. This does not establish that a real B site is safer or easier to develop.' : 'Match the scenario and evidence scope first. Unknown conditions stay visible and never count as a pass.'}</p></div>
  </div>
}
