# LDES v3: preliminary developer screening scorecard

`scoreVersion = LDES-v3-screening-scorecard` is the default result shown in the map preview, full report, and comparison. The user chooses one canonical Parcel ID, usually from an address candidate list. The interface calls it **Development Ease Score — Preliminary zoning & site screen**. It answers whether a Pittsburgh parcel merits the next round of residential development due diligence and what to verify first. It is a four-level RAG, not a calibrated 0–100 score or a verdict on a proposed project.

## Scope and input

The screen checks the five verified residential use rows in the [Pittsburgh §911.02 table](https://ecode360.com/45476784), parcel zoning, 25%+ slope, landslide-prone and undermined polygons, FEMA flood areas, historic district/site polygons, and active PLI violation/condemnation records. Parcel identity, polygon boundary, city jurisdiction, complete base-district zoning, and required source availability are evidence gates. No housing type, unit count, building footprint, land-control status, or price assumption is collected by default.

The scorecard contains `pathwaySummary`, five `housingPathways` rows, per-source `mappedConstraints`, deduplicated `reviewTasks`, `evidenceGaps`, `unassessed`, `screeningRag`, and `projectFeasibility = NOT_ASSESSED`. Every row retains source URL and available source/retrieval dates. The same address can return multiple PINs; each PIN is screened independently.

## Ordered grading rule

1. **UNRATED** if canonical PIN, a unique Pittsburgh polygon boundary, or the complete zoning use path cannot be verified. A point zoning fallback, unhandled overlay, split base district, or missing use-table cell cannot become by-right by assumption.
2. **RED** if the complete verified table has no listed path for any of the five checked housing uses. This means only that no path is listed in this table; it does not say the parcel is unbuildable. Other source gaps remain visible.
3. **UNRATED** if a listed housing path exists but any required slope, landslide, undermined, FEMA, historic district/site, violation, or condemnation source is unavailable or its geometry is unresolved.
4. **AMBER** if the only listed path needs review (`A`, `S`, `C`, or `P_OR_S`), or a verified mapped/active-record fact generates a targeted review task. Amber means **investigate before deciding**. A map overlap does not establish that the proposed footprint is affected.
5. **GREEN** if at least one use is listed `P`, all required sources succeeded, and no targeted task was triggered. Green means no additional task was found in the checked scope; ordinary project diligence remains.

The model never applies an arbitrary `>50% overlap → RED` rule. The overlap area and percent remain visible as facts. A small polygon fragment under **10 sq ft and 0.1%** is labelled boundary-uncertain and does not itself trigger Amber. An unresolved tiny FEMA hit is UNRATED pending boundary verification, particularly because floodway classification can be consequential. Successful zero/no-record and source failure remain distinct.

## Interpretation and limitations

`BY_RIGHT_PATH_IDENTIFIED` means at least one of the five base-district listings is `P`; it does not say the user's planned housing use, dimensions, parking, access, overlay conditions, or permit is approved. `REVIEW_PATH_ONLY` means at least one discretionary/review listing and no `P`. `NO_LISTED_PATH` refers only to those five rows. `UNKNOWN` means evidence does not support a reliable use-path summary.

The report separates mapped observations, next checks, evidence gaps, and project questions not assessed. Default unassessed items are intended housing use/size/location, land control, site engineering and mitigation cost, and financial feasibility. Active condemned and violation records create official-status checks; closed violation history remains context. The optional LLM receives only the deterministic scorecard facts and may explain them in plain language; it cannot change the RAG. On timeout, provider failure, budget exhaustion, or rejected output, the fixed source-based summary and raw facts remain.

## Validation

Tests cover ordered precedence, all five use rows, split/point zoning, confirmed zero versus failed source, boundary fragments, floodway, PLI status, the `0052P00130000000` EMI/2.208% slope case, and the four earlier real-parcel geospatial observations under explicitly completed other-source assumptions. See [v3 review ledger](verification/screening-v3-cases.md). The small set exposes counterexamples but does not establish predictive accuracy. A 12–20-case review by a local planning or development practitioner remains pending.

For historical v2.3 behavior and fixtures, see [LDES v2.3](LDES_v2.3_parcel_screen.md).
