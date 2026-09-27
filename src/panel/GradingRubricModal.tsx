import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { SLIVER_AREA_SQFT, SLIVER_OVERLAP_PCT } from '../lib/ldes/geometry'
import {
  FEMA_PCT_0_2_AMBER_MIN_OVERLAP_PCT,
  FEMA_SFHA_RED_MIN_OVERLAP_PCT,
  HISTORIC_BOUNDARY_TOLERANCE_PCT,
  HISTORIC_BOUNDARY_TOLERANCE_SQFT,
  LANDSLIDE_AMBER_MIN_OVERLAP_PCT,
  LANDSLIDE_RED_MIN_OVERLAP_PCT,
} from '../lib/screening/hazards'
import { CHECKED_HOUSING_USES } from '../lib/screening/pathways'
import { REQUIRED_SCREENING_SOURCES, SCREENING_SCORE_VERSION } from '../lib/screening/scorecard'
import { STEEP_SLOPE_AMBER_MIN_OVERLAP_PCT, STEEP_SLOPE_RED_MIN_OVERLAP_PCT } from '../lib/screening/slope'
import { screeningMeaning } from '../lib/screening/copy'
import type { ScreeningRag } from '../lib/screening/types'

type Props = { open: boolean; onClose: () => void }

const housingUseLabels: Record<(typeof CHECKED_HOUSING_USES)[number], string> = {
  single_unit_detached: 'single-unit detached',
  single_unit_attached: 'single-unit attached',
  two_unit: 'two-unit',
  three_unit: 'three-unit',
  multi_unit: 'multi-unit',
}

const requiredSourceLabels: Record<(typeof REQUIRED_SCREENING_SOURCES)[number], string> = {
  slope: '25%+ steep slope',
  landslide: 'landslide-prone area',
  undermined: 'undermined area',
  fema: 'FEMA flood hazard',
  historicDistrict: 'historic district',
  historicSite: 'historic site',
  violations: 'PLI violations',
  condemned: 'condemned properties',
}

const grades: ScreeningRag[] = ['GREEN', 'AMBER', 'RED', 'UNRATED']

export function GradingRubricModal({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="grading-rubric-backdrop" onClick={onClose}>
      <div
        className="grading-rubric-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="grading-rubric-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="grading-rubric-header">
          <div>
            <p className="eyebrow">{SCREENING_SCORE_VERSION}</p>
            <h2 id="grading-rubric-title">How this grade is determined</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label="Close scoring rubric">×</button>
        </header>
        <p className="grading-rubric-lead">This is a preliminary zoning and site screen. Project feasibility is not assessed. Colors describe limited screening, not a development recommendation.</p>
        <figure className="grading-rubric-figure">
          <img src="/ldes-v3-grading-rule-map.jpg" width={1024} height={576} alt="LDES v3 grading rule map: zoning pathway, site and geotechnical, flood and heritage, evidence gates, and records rules for GREEN, AMBER, RED, and UNRATED." />
        </figure>

        <section>
          <h3>Headline grades</h3>
          <dl className="grading-rubric-grades">
            {grades.map((grade) => (
              <div key={grade}>
                <dt className={`score-${grade.toLowerCase()}`}>{grade}</dt>
                <dd>{screeningMeaning(grade)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3>How the headline grade is chosen</h3>
          <p>The scorecard applies these gates in order. The first matching rule is the result:</p>
          <ol className="grading-rubric-steps">
            <li><strong>UNRATED</strong> if parcel identity is not verified, or the five-use zoning pathway is unknown.</li>
            <li><strong>RED</strong> if none of the five checked residential uses has a listed path, even if another required source is missing.</li>
            <li><strong>UNRATED</strong> if any required source is incomplete or still unknown.</li>
            <li><strong>RED</strong> if a mapped constraint grades RED under the layer thresholds below.</li>
            <li><strong>AMBER</strong> if the pathway is review-only, or any verified review task is triggered.</li>
            <li><strong>GREEN</strong> otherwise. Routine due-diligence tasks do not change the grade.</li>
          </ol>
        </section>

        <section>
          <h3>Parcel identity and required sources</h3>
          <p>Identity is verified only with a unique Pittsburgh parcel ID, a verified city polygon, a single matching parcel geometry, and an assessment ID that matches when present.</p>
          <p>Required sources must be available or confirmed not found, and must not remain UNKNOWN: {REQUIRED_SCREENING_SOURCES.map((id) => requiredSourceLabels[id]).join(', ')}.</p>
        </section>

        <section>
          <h3>Zoning pathway</h3>
          <p>The screen checks five residential uses in one verified base district ({CHECKED_HOUSING_USES.map((use) => housingUseLabels[use]).join(', ')}). Overlay rules, split districts, point lookups, and unverified use rows leave the pathway unknown.</p>
          <ul>
            <li><strong>Any P listing</strong> among those five uses → a by-right path is identified. Other gates can still raise the headline grade.</li>
            <li><strong>Only A, S, C, or P_OR_S</strong> → review path only, which is at least AMBER.</li>
            <li><strong>All five not permitted</strong> → RED. This does not assess other development possibilities.</li>
            <li><strong>Missing, split, point lookup, or unresolved overlay</strong> → unknown pathway, so UNRATED.</li>
          </ul>
        </section>

        <section>
          <h3>Mapped site, flood, and heritage thresholds</h3>
          <p>Overlap is of the parcel polygon, not a proposed building. Project impact stays unknown until a footprint is defined. A GREEN mapped overlap is recorded as routine context and does not raise the headline grade.</p>
          <div className="grading-rubric-table-wrap">
            <table className="grading-rubric-table">
              <thead>
                <tr><th>Layer</th><th>GREEN</th><th>AMBER</th><th>RED</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">25%+ steep slope</th>
                  <td>&lt;{STEEP_SLOPE_AMBER_MIN_OVERLAP_PCT}%</td>
                  <td>{STEEP_SLOPE_AMBER_MIN_OVERLAP_PCT}% to &lt;{STEEP_SLOPE_RED_MIN_OVERLAP_PCT}%</td>
                  <td>≥{STEEP_SLOPE_RED_MIN_OVERLAP_PCT}%</td>
                </tr>
                <tr>
                  <th scope="row">Landslide-prone</th>
                  <td>&lt;{LANDSLIDE_AMBER_MIN_OVERLAP_PCT}%</td>
                  <td>{LANDSLIDE_AMBER_MIN_OVERLAP_PCT}% to &lt;{LANDSLIDE_RED_MIN_OVERLAP_PCT}%</td>
                  <td>≥{LANDSLIDE_RED_MIN_OVERLAP_PCT}%</td>
                </tr>
                <tr>
                  <th scope="row">Undermined area</th>
                  <td>No effective overlap</td>
                  <td>Any effective overlap</td>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">FEMA 0.2% flood</th>
                  <td>&lt;{FEMA_PCT_0_2_AMBER_MIN_OVERLAP_PCT}%</td>
                  <td>≥{FEMA_PCT_0_2_AMBER_MIN_OVERLAP_PCT}%</td>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">SFHA</th>
                  <td>No overlap</td>
                  <td>&gt;0% to &lt;{FEMA_SFHA_RED_MIN_OVERLAP_PCT}%</td>
                  <td>≥{FEMA_SFHA_RED_MIN_OVERLAP_PCT}%</td>
                </tr>
                <tr>
                  <th scope="row">Regulatory floodway</th>
                  <td>No overlap</td>
                  <td>—</td>
                  <td>Any effective overlap</td>
                </tr>
                <tr>
                  <th scope="row">Historic district or site</th>
                  <td>&lt;{HISTORIC_BOUNDARY_TOLERANCE_PCT}% and &lt;{HISTORIC_BOUNDARY_TOLERANCE_SQFT} sq ft</td>
                  <td>Any larger effective overlap</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3>Records, slivers, and what is not scored</h3>
          <ul>
            <li><strong>Active violation or condemned record</strong> triggers a review task and is at least AMBER.</li>
            <li><strong>Closed or not-found records</strong> are context only and do not raise the grade.</li>
            <li><strong>General sliver</strong> (&lt;{SLIVER_OVERLAP_PCT}% and &lt;{SLIVER_AREA_SQFT} sq ft) is treated as boundary-uncertain, not an AMBER mapped hit.</li>
            <li><strong>Tiny FEMA intersection</strong> below the sliver cutoff is left UNKNOWN and holds the headline at UNRATED until the boundary is verified.</li>
            <li><strong>Not assessed:</strong> project size and location, land control, engineering cost, and financial feasibility.</li>
          </ul>
        </section>
      </div>
    </div>,
    document.body,
  )
}
