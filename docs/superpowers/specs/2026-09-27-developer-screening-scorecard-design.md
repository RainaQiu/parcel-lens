# Parcel Lens v3: developer due-diligence screening scorecard

Date: 2026-09-27  
Status: Design spec for the live LDES v3 scorecard.

## 1. Goal and scope

The home screen helps a residential developer answer an early decision: **is this parcel worth the next round of due diligence, and what should be verified first?** By default the user enters only an address or Parcel ID. They do not have to choose a housing type, unit count, or advanced filters. The system automatically checks the five existing residential use paths and the connected map and record sources. The compare page uses the same dimensions for 2–4 parcels.

The default view shows one combined `screeningRag = GREEN | AMBER | RED | UNRATED`, which satisfies Track 1’s scoring output. The page title is **Development Ease Score — Preliminary zoning & site screen**. It summarizes listed residential use paths and next-round review burden under connected evidence. It does **not** mean permit approval, net buildable area, schedule, acquisition likelihood, or financial return for an undefined project. Overall project feasibility stays `NOT_ASSESSED`. An uncalibrated 0–100 score is not shown.

A separate project-level judgment is in scope only later, if the user supplies housing use, scale, and proposed location on a shortlisted parcel. That second stage is outside this v3 implementation. The existing LLM only explains the deterministic result. It does not set the grade or invent missing facts.

## 2. Why change v2.3

- `5000 FORBES AVE` maps to four Parcel IDs in assessment data. `0052P00130000000` is zoned EMI. The five residential use paths are one `P`, one `A`, and three `NOT_PERMITTED`. A 2.208% parcel overlap with the 25%+ slope layer is below the current 10% targeted-review threshold, so that hit alone does not raise the result to Amber. The mapped fact and unknown project impact remain.
- v2.3 treated any valid non-zero slope, landslide, or undermined overlap as Amber, and overlap above 50% as Red, then combined zoning, environment, and historic into the most severe color. 50% is a code threshold, not a validated developer or city-approval boundary. Parcel overlap share also does not say whether a proposed building or land disturbance sits in the overlap.
- An already-built campus building is not a correct label for “new housing can now be built by the same path.” EMI parcels also involve an Institutional Master Plan; existing use, project use, and construction era differ. This case shows that **the headline color can mislead**. Built facts alone do not prove the hazard layers are wrong.
- Zoning Green currently means at least one of the five paths is `P`. It does not mean the developer’s intended housing type is by-right. Owner or assessment use also does not prove the parcel is for sale, obtainable, or financially feasible.

Sources: [Pittsburgh review process](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes) lists **proposed development** that affects natural 25%+ slopes under Planning Commission Review; [environmental overlay provisions](https://ecode360.com/45474965) allow some site constraints to be addressed with survey, professional design, and review; [EMI district rules](https://ecode360.com/45474542) describe institutional use and master-plan paths. The [England site-assessment guidance](https://www.gov.uk/guidance/assessing-sites-for-local-plans-stage-2) separates suitability, availability, and achievability and asks about mitigation. Borrow the method structure only; it is not Pittsburgh code.

## 3. Option choice

| Option | Benefit | What it leaves unsolved |
|---|---|---|
| A. Tune existing overlap-percentage thresholds | Small change | Still treats whole-parcel map overlap as proposed-footprint impact; new thresholds still lack evidence. |
| **B. Dimensional screening card + scoped combined RAG (this design)** | Meets the competition scoring requirement while keeping use paths, evidence, and actions. Amber means extra review, not “hard to build.” | A coarse RAG cannot mean two Amber parcels have the same engineering cost, and it cannot rank investments. |
| C. Jump to a project-level weighted score | Can compare several candidates for one defined project | Needs use, scale, location, dimensional rules, site control, and economic assumptions. Data is insufficient now. |

Choose B. Keep v2.3 sources, spatial overlays, the housing-use matrix, and provenance. Redefine the combined RAG’s scope and combination. It is a screening grade, not a validated project-level prediction or an automatic kill decision.

## 4. Default output contract

Each Parcel ID produces a versioned `screeningScorecard` that includes:

| Field | Allowed values and meaning |
|---|---|
| `housingPathways[]` | Keep the five uses row by row with `P / A / S / C / P_OR_S / NOT_PERMITTED / UNKNOWN`, district, rule version, and source. |
| `pathwaySummary` | `BY_RIGHT_PATH_IDENTIFIED`: at least one `P` row. `REVIEW_PATH_ONLY`: no `P`, at least one `A/S/C/P_OR_S`. `NO_LISTED_PATH`: none of the five rows is listed. `UNKNOWN`: insufficient rule, zoning, or join evidence. Describes **listed paths** only, not the whole parcel. |
| `mappedConstraints[]` | Per source: `DETECTED / NOT_DETECTED / UNKNOWN`, category, measured overlap area and share, boundary uncertainty, source, and time. When `DETECTED`, `projectImpact=UNKNOWN`; when not hit, `NOT_APPLICABLE`. A map hit is a review lead only. |
| `reviewTasks[]` | Actionable next steps from verified use paths, map hits, condition records, and evidence gaps. Each has `trigger`, `whyItMatters`, `whoToConsult`, `sourceRefs`, and `scoreEffect=triggered/routine/gap`. Deduplicate tasks with the same root cause. Map facts become `triggered` or `routine` under versioned materiality thresholds. Ordinary project due diligence that applies to every parcel is `routine`. |
| `evidenceGaps[]` | Failed queries, uncertain parcel boundary/address joins, split zoning, missing code-table cells, and which dimensions they affect. Other successfully retrieved facts still display. |
| `unassessed[]` | Default list includes at least project dimensions and proposed location, land control/availability, site-engineering cost, and financial feasibility. These do not enter the rated dimensions. |
| `screeningRag` | `GREEN / AMBER / RED / UNRATED`. Combined grade for this defined residential-use and map/record screen, produced by section 5, shown with copy, tasks, and gaps. |
| `projectFeasibility` | Fixed `NOT_ASSESSED` by default. Other values require future project-level rules. |
| `scoreVersion` | New version `LDES-v3-screening-scorecard`, distinct from v2.3. |

All output is bound to a canonical Parcel ID. Address is only for finding candidates, not for final identity. Multiple candidates at the same address must be chosen explicitly by the user. Every fact keeps source URL, source date if known, retrieval date, join method, and calculation rule version.

## 5. Deterministic rules

1. **Evidence gates.** Without a unique Parcel ID, a reliable boundary, or Pittsburgh jurisdiction, the parcel cannot produce a usable screening card. Retrieved facts may still display; fields that depend on the missing evidence are `UNKNOWN`. A single layer failure makes that layer and its dependent tasks unknown. It does not erase other verified facts.
2. **Use paths.** Keep the verified five-row §911.02 table. Split base districts, untreated overlays, unverified cells, or geometry disputes make `pathwaySummary=UNKNOWN` with a reason. `BY_RIGHT_PATH_IDENTIFIED` still needs dimensions, other applicable rules, and a specific project. The UI must not say “approved” or “easy to build.” `NO_LISTED_PATH` means only that the five checked uses are not listed in the base-district table. It does not claim the land is undevelopable.
3. **Mapped leads.** Keep original categories and overlap data for slope, landslide, undermined land, FEMA, historic areas, and similar layers. Use versioned materiality rules to separate routine facts, Amber targeted review, and Red major constraints. Slope and landslide use 10%/50% cutoffs. Any valid undermined hit is Amber. Historic district/site hits below both 1% and 100 sq ft stay routine facts. FEMA is judged separately for 0.2%, SFHA, and Floodway. Without a proposed location, `projectImpact=UNKNOWN`. Do not write a layer hit as a permit denial, confirmed engineering hazard, or certain cost overrun.
4. **Condition and control.** Assessment use, existing buildings, owner class, and PLI records are background or investigation leads. Do not infer from “university-owned” or “already built” that land is available, that a present-day housing project would be approved, or that the building is safe. Active condemned records must prominently prompt official verification. Closed violations are background only and do not by themselves turn the grade Amber.
5. **Combined screening RAG.** Evaluate in this order. The first matching condition sets the grade. Other successfully retrieved facts and all gaps still display:
   - `UNRATED`: Parcel ID / boundary / city limits cannot be verified, or the zoning path is unknown (including unverified split zoning), so a credible residential screen cannot run.
   - `RED`: The complete verified table for the five residential uses has **no listed path**, or a versioned major mapped constraint is met: slope/landslide ≥50%, SFHA ≥50%, or any valid Floodway. Copy must name the root cause and must not say “this land cannot be built.” Failed other sources still appear as gaps.
   - `UNRATED`: At least one residential use path exists, but a required screening source (slope, landslide, undermined, FEMA, or historic/PLI) failed, so review burden cannot be graded reliably.
   - `AMBER`: No by-right residential path but an `A/S/C/P_OR_S` path exists, or a map hit meets its targeted-review threshold, or an active historic/condition item creates a dedicated task. Amber means only **targeted review before the next round**. Map overlap does not mean the proposed location is affected, and it does not mean approval will fail.
   - `GREEN`: At least one use path is `P`, required sources succeeded, and the checked scope has no dedicated review flags. Green means only **no extra tasks were found in the verified screening scope**. Dimensions, land control, cost, and finances remain unassessed.
6. **No score compensation.** Use the versioned thresholds in items 3 and 5. Do not take a weighted average. No favorable dimension can offset a verified no-path result, a missing required source, or a major constraint. Raw area and share always display. Thresholds do not replace project location, survey, or professional judgment.

## 6. UI and explanation copy

Home preview and the standalone report both answer four short questions first: **verified residential paths, mapped/record leads found, next due-diligence tasks, and what still cannot be judged.** The report can expand the five-row use matrix, raw percentages, sources, and versions. Map layers are visible by default. The user does not configure filters first.

The top shows **Development Ease Score — Preliminary**, the combined RAG, and one fixed gloss: Green “no extra review tasks in the verified scope,” Amber “targeted review needed,” Red “no listed path among the five residential uses,” Unrated “critical evidence missing.” Next to it, keep “overall project feasibility not assessed.” Dimension labels use plain phrases such as “listed residential path exists,” “extra use review required,” “slope-layer hit,” “source unavailable.” Color is only an aid. Every color must have text. The compare page may show combined RAG side by side, but it must not auto-rank by that grade or claim two same-color parcels have the same engineering burden.

The LLM may turn `reviewTasks` and verified facts into a plain-language summary. It must not add legal conclusions, numbers, risk levels, costs, or approval probabilities. On model failure, keep the deterministic summary. The first sentence must not describe a map hit as “cannot be built” or a `P` as already permitted.

## 7. 5000 Forbes Ave acceptance example

A search for `5000 Forbes Ave` first lists four candidate Parcel IDs. For `0052P00130000000`, the default card should show:

- District `EMI`; among the five rows, detached housing `P`, multi-unit housing `A`, and the other three `NOT_PERMITTED`. Pathway summary is `BY_RIGHT_PATH_IDENTIFIED`, with a note that this holds only for uses listed as `P`.
- About 2.208% overlap between the 25%+ slope layer and the parcel. Site lead is `DETECTED`; whether the proposed footprint is affected is `UNKNOWN`. The task is to check proposed location against terrain and, as needed, consult planning and survey/geotechnical professionals.
- University use in the assessment record is existing-use background only. Land availability and housing-project economics are `NOT_ASSESSED`.
- Combined screening result is **GREEN · no targeted-review task in the current checked scope**, with a note that only about 2.208% of the parcel is covered by that slope layer and that proposed-location impact is unknown. It does not mean “CMU could not have been built” or “the parcel has no slope fact.” Overall project feasibility stays `NOT_ASSESSED`. The slope layer is not rewritten as “no risk” because the campus is already built.

The other three PINs at the same address are calculated independently from their own boundaries and sources. They do not reuse this parcel’s conclusion.

## 8. Implementation boundary and validation

Split the existing scoring into four pure units: `pathwaySummary`, `mappedConstraintObservations`, `reviewTaskDerivation`, and `screeningRag`. The render layer consumes one card contract. Keep the existing GIS, CKAN, rule table, and LLM services. Keep v2.3 `easeScore` as a historical result identifier. It must not pose as the v3 combined screening RAG. Data or rule changes must update the version and regression fixtures together. Old v2.2 explicit-scenario fixtures stay as historical regression and are not mixed into the default v3 conclusion.

Minimum acceptance coverage: multiple PINs at one address; a 2.208% slope hit kept as a mapped fact with “proposed impact unknown”; Amber from 10% and Red from 50%; true zero overlap versus a sliver; split zoning; all five uses unlisted; one required source failed while other dimensions still display; FEMA floodway versus ordinary flood classes; active versus closed PLI records; the same PIN recomputed with the same rule/source versions is stable. The compare page must not treat cards with different rules or evidence scope as the same rank.

Build a review set of about 12–20 genuinely varied real parcels. Ask at least one local planning or development practitioner, case by case, whether the parcel is worth next-round diligence, what to verify first, and which sentence would mislead. Include built, unbuilt, in-approval, and delayed-by-obstacle cases. Do not calibrate only on successful projects. Watch for false exclusion, false permission implication, missed critical tasks, and missing data treated as safety. The sample is for finding counterexamples and changing rules. It does not support a statistical predictive-accuracy claim. Do not publish 0–100 scores, approval probabilities, cost, or return estimates without enough project-level cases and local calibration.
