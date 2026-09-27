# Track 1 parcel screening tool: data assessment and draft PRD

Version: v0.9 · 2026-09-26 · Track 3. Clarifies parcel joins, confidence, and N/A handling.

## 1. Bottom line

**Current implementation note (2026-09-27):** The default report is the [LDES v3 scoped combined-RAG screening scorecard](LDES_v3_screening_scorecard.md), which satisfies Track 1’s scoring display. The items below keep the original research trade-offs and historical context. This RAG does not mean a specific project is approved, cheap, or financially feasible.

**Problem:** A user may know only a candidate parcel and not yet the housing type or unit count. They need public facts, zoning, and terrain constraints before spending on the next round of human due diligence. The product puts evidence, obstacles, unknowns, and next steps into a traceable report. It does not make permit, legal, engineering, financing, or investment conclusions.

**Suggested demo scope:** Pittsburgh city parcels only. First complete “enter a parcel → confirm the boundary → query zoning and terrain layers → show parcel constraints, unknowns, and sources.” Multi-parcel compare is an extra. End-to-end real-parcel demo is last. The [official challenge brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit) mentions a Development Ease Score. Without a specific construction proposal, current colors may only represent verified **parcel constraints**. They must not pose as full development ease for a project.

**Data judgment:** `Core` in the official catalog is a cross-track catalog label. It does not mean Track 1 must ingest every Core dataset. Current Basic first depends on parcel boundaries, the zoning map, and one verified terrain layer. Regulatory mapping of a specific residential use waits for a proposal feature. County assessment, permits, market, and macro data are used only in matching features. Section 3.1 maps features to sources and marks deferred items.

## 2. Desk research: roles, tasks, and boundaries

### 2.1 Facts public sources can confirm

| Fact | Product implication | Source |
|---|---|---|
| The competition lists four personas and four use cases. Success criteria include a single- or multi-parcel Development Ease Score, main obstacles, sources, and human-review points. | Cover all four roles in requirements. That does not mean the competition MVP must ship four full workflows. | [Official challenge brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit) |
| Even if the district allows a two-family house, a specific parcel still must meet lot size, setbacks, parking, and other rules. | A zoning use class must not be written as “already approved to build.” Unchecked dimensions and overlays must be listed as unknown. | [Pittsburgh Zoning FAQ](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Zoning-FAQ) |
| Pittsburgh Zoning Review has Basic, Site Plan, and Planning Commission tracks, depending on location and project. Development that affects natural slopes of 25% or more may enter Planning Commission Review. | Environmental-layer intersection is a review lead, not a standalone inference of review level. The report provides official review entry points. | [City Planning: Planning Application and Process](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning/Planning-Applications-and-Processes) |
| OneStopPGH Insights already publishes planning/zoning applications and permits, with maps, stats, and search. | Existing workflows are not “no data.” Product value is assembling evidence around one parcel and proposal and explaining limits. | [OneStopPGH Insights guide](https://insightshelp.pittsburghpa.gov/) |
| Regrid’s Pittsburgh page is a parcel-map UI with search, parcel details, layers, filters, and export. The team [parcel-lens repo](https://github.com/RainaQiu/parcel-lens) already has address/parcel ID search, map click, boundary highlight, and a detail sidebar. | **Reuse the existing map as the find-and-confirm entry**, then attach a housing proposal and analysis report. Do not copy Regrid’s project management, bulk import, and other advanced features. This is a code inspection, not a runtime verification. | [Regrid Pittsburgh](https://app.regrid.com/us/pa/allegheny/pittsburgh), [App.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/App.tsx), [ParcelMap.tsx](https://github.com/RainaQiu/parcel-lens/blob/main/src/map/ParcelMap.tsx) |
| URA Rental Gap Program eligibility, underwriting, and affordability constraints go beyond zoning and environmental layers. PHFA applications also require parcel, market-study, and funding documentation. | Nonprofits may use this product for land/code screening. Results must not be called financing or delivery feasibility for a whole affordable-housing project. | [URA Rental Gap Program](https://www.ura.org/pages/rental-gap-program), [PHFA application guidelines](https://borrows.phfa.org/mhp/developers/housingapplication.aspx) |
| In the user-provided #housing-sme-help record, Steve Wray (City of Pittsburgh SME) said a key feasibility question for developers and nonprofits is **financial feasibility**, needing rent/value or sale comps from similar neighborhoods. | This is a later financial-research lead. The team defers B12 financial brief and features this round and must not treat existing parcel data as financial analysis. | User-provided Slack, Steve Wray reply to Het Sheth, 2026-09-26 11:27 ET; no message permalink yet |
| A later scoring reply relayed by the user said there is **no prescribed scoring system**. The team may propose something intuitive for potential users, with green / amber / red as an example (green: easy to develop as-is; amber: needs a change of permit or subsidy; red: major zoning, financial, or terrain obstacles). | Color is an expert **optional example**, not an official threshold or an approval of ParcelLens rules. The team may use a readable grade instead of arbitrary numeric weights. The current prototype lacks financial and complete site evidence, so “green” must not mean the whole project is easy to deliver. | User-relayed Slack scoring reply, 2026-09-26; respondent identity, time, and permalink still missing |
| The city continues to discuss housing-related zoning amendments. As of city pages checked for this version, some amendments are still in review. | A policy-analyst view must mark code-in-force status and data date. Proposed rules must not mix into in-force calculations. | [Housing Needs Assessment amendments](https://engage.pittsburghpa.gov/implementing-housing-needs-assessment), [Zoning Amendment Hub](https://engage.pittsburghpa.gov/pittsburghs-zoning-code-amendment-hub) |

Web rows above are **facts from public documents**. The two Slack replies are **expert feedback**; the scoring respondent is not yet verified. Team map capability has been verified in the browser with real parcel search and selection. Thresholds, tasks, and priorities below remain **product assumptions** to validate.

### 2.2 Task assumptions for the four personas

| Persona | Typical input and decision | What to see first in the shared report | What this screen must not decide |
|---|---|---|---|
| Small/Mid-Size Developer (MVP primary) | Has a candidate parcel, maybe not housing type or unit count yet. Decides whether to spend on the next round of due diligence. | District, terrain constraints, items to verify, and which department to consult. | Buying land, design, approval probability, and return. |
| Housing Nonprofit/CDC | Has a candidate parcel or a neighborhood project goal. Decides whether to spend on early design and funding-package prep. | Same parcel evidence as the developer, plus a clear flag that funding / site control / affordability assumptions and comps still need verification. | URA/PHFA project eligibility, whether funding is awarded, and community support. |
| Municipal Planner | Evaluates one or more candidate parcels. Decides which rule to review first or which review path to send an applicant toward. | Code cites, evidence dates, split zoning/overlays, human-review points. Multi-parcel compare is an extra. | Formal zoning determinations, permit decisions, or approval timing. |
| Policy Analyst | Studies where a housing type is limited by rules or facilities. Decides which policy barrier to investigate next. | Comparable rule classes, data coverage, versions, and unknowns. Clustering and policy scenarios need scaled data. | Infer neighborhood-level policy benefit from a single-parcel sample. |

**MVP core decision:** whether the next round of human due diligence is worth it, and what to verify first. **Geography:** Pittsburgh city only. Broader county parcel coverage does not mean city zoning rules apply in other municipalities.

### 2.3 Use-case ranking and demo promise

| Official use case | Demonstrable task in this product | Priority and preconditions |
|---|---|---|
| A developer enters a parcel ID and gets a score and obstacles. | Do not require a preset housing type/unit count. First show parcel zoning, terrain constraints, insufficient evidence, and every identified obstacle. Color means only verified parcel constraints. | **Basic main path:** finish parcel facts and layer classification. End-to-end real-parcel demo last. |
| A planner compares several parcels to find starter-home sites. | Two parcels, same rules and layer versions, side-by-side zoning, terrain, obstacles, and unknowns. Without a housing proposal, do not judge starter-home use permission. | **If time:** after the single-parcel path is stable. Do not compare unequal grades. |
| A city finds low-scoring parcels and evaluates zoning reform or infrastructure upgrades. | From the low-score reason, open code/facility evidence and separate known obstacles from missing data. | **Later:** needs wide parcel coverage, reliable facility data, and verified policy-scenario rules. |
| An agency clusters community scores to allocate investment. | Aggregate parcels, show coverage and distribution, and do not treat data-missing areas as low demand. | **Later:** needs representative data, equity review, and explicit investment criteria. |

### 2.4 Information-architecture decisions

Detailed UI and IA for the four roles is **deferred (B10)**. The current main path is parcel, result report, evidence, and sources. The user does not have to set a housing proposal or unit count first.

**Where the existing map sits:** Treat the team’s Regrid-style map as the find-and-confirm canvas. The repo already has address/parcel ID search, map click, boundary highlight, and parcel details. After a parcel is selected, show zoning, terrain, and the evidence report. Housing proposal or unit count is not an entry gate. Detailed UI waits for B10.

**Gap between repo code and this PRD (not the same as already fixed):** Current [zoning.ts](https://github.com/RainaQiu/parcel-lens/blob/main/src/lib/zoning.ts) queries zoning from a single computed point and returns the first hit. B4 requires split-district and overlay handling, which the data/interface track must validate with polygon intersection or an explicit “not yet checked” mark. Sale price and county assessed value in the sidebar are not a full financial analysis; B12 is deferred. The above is from reading code. Actual data returns, deployment, and interaction still need runtime tests.

## 3. Source selection

“Availability” below is a **catalog and source-page check as of September 24**. Samples have not yet been downloaded to validate fields, parcel-ID hit rate, or GIS math. Those are the first post-kickoff validation tasks. P0 = demo main path, P1 = add after the basic path runs, P2 = not relied on this round.

| Level | Data / entry | Use and join | Current judgment and risk |
|---|---|---|---|
| **P0** | [Allegheny County Parcel Boundaries](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1) | Find the parcel polygon by parcel/block-lot ID, compute area, overlay other layers. Page lists Esri REST, GeoJSON, CSV, SHP. Official notes say the file is large; filter downloads. PASDA is the more authoritative entry. | **Required; resource path found.** The catalog link without a trailing `1` is wrong. Must verify ID format, CRS, and that selected samples exist. |
| **P0** | [Pittsburgh zoning GIS layer](https://services1.arcgis.com/YZCmUqbcsUpOKfj7/ArcGIS/rest/services/PGHWebZoning/FeatureServer/0) | Intersect the parcel polygon with zoning polygons and read `zon_new` and other district fields. | **Required; query layer and fields checked.** WPRDC zoning links in the catalog are unstable; use the city ArcGIS layer first. A parcel may cross districts; show all, do not pick one at random. |
| **P1** | [City zoning page](https://www.pittsburghpa.gov/Business-Development/City-Planning/Zoning) → [Zoning Code §911.02 use table](https://ecode360.com/45476784) | Later, when the user names a specific use, look up use class from “district + proposed housing type.” | Current Basic only shows zoning facts. It does not infer residential use or unit count. Code mapping starts with the specific-proposal feature. |
| **P0** | [Pittsburgh 25%+ steep slope](https://data.wprdc.org/dataset/25-or-greater-slope) | Polygon intersection with the parcel; show overlap area/share and related risk. Page lists GeoJSON, REST, SHP. | **Preferred environmental layer; formats checked.** Overlap means possible further review, not “cannot build.” |
| **P1** | [County property assessments](https://data.wprdc.org/dataset/property-assessments) | Use parcel/block-lot ID to add address and lot/building traits that help identify the parcel. Page has CSV, API versions, and a dictionary. | **Easy to add, not a precondition for judging zoning.** Assessed value is not market price. Download vs API field types and date formats differ. |
| **P1** | [Pittsburgh undermined areas](https://data.wprdc.org/dataset/undermined-areas) | Intersect the parcel with the undermined layer to flag “needs geotechnical verification.” | **Good second environmental layer.** Historic mine maps may be incomplete or imprecise. Do not make a safety decision from them. |
| **P1** | [FEMA National Flood Hazard Layer](https://www.fema.gov/flood-maps/national-flood-hazard-layer) | Overlay flood zones; mark risk and layer version. | **High value, harder to connect.** First verify needed layers, coverage, and spatial accuracy. The map is not an official flood determination. |
| **P1** | [PLI permits](https://data.wprdc.org/dataset/pli-permits) | Show permit history for related addresses or nearby parcels as a review-path and evidence hint. | **Historical background, not a “housing is allowed” label.** Records start in 2019; after 2024, Building & Development Application changed classification. Address/parcel joins, type, and status need verification. Historical approval rates are not this project’s approval probability. |
| **P2** | [OneStopPGH](https://onestoppgh.pittsburghpa.gov/), [ZBA decisions](https://www.pittsburghpa.gov/Business-Development/City-Planning) | Human lookup of current cases or special exceptions. | The first is an interactive portal; the second is mostly unstructured. Weekend work does not treat automated bulk scrape as the main path. |
| **P2** | PA DEP, PASDA/USGS LiDAR, PennDOT, OSM, sales/rents, HUD FMR/Income Limits | Deeper environmental, access, or financial analysis. | Do not connect first. Portals still need a specific layer. Road proximity ≠ legal access. Area rents ≠ project income. |

**Explicitly out:** ACS, CHAS, census, HMDA, Zillow/Redfin, and other macro or area-market metrics must not directly decide whether a single parcel is “easy to get approved.” If a financial pro forma is added later, use market, income, and cost data at their real spatial grain and with stated assumptions.

### 3.1 Feature–data dependency matrix

The mapping below follows the official [Public Data Catalog](https://docs.google.com/spreadsheets/d/19CKyt1kansUZ3VGOAOBihYYxNFuitx5VTkzOiEy4iXA/edit?gid=2076065299#gid=2076065299) sheets `Data Catalog`, `Read Me`, and `Brief Source Map`, narrowed to this product’s single-parcel main path. `Core` / `Useful` keep catalog labels. **P0/P1/P2 are this PRD’s ingest priority.** Catalog “Typical update” is a general frequency. Reports must still record the actual resource version or retrieval date.

| Feature | Datasets needed | Data / join into the feature | Required vs missing behavior |
|---|---|---|---|
| **B1 Find parcel and failure states** | [Allegheny County Parcel Boundaries](https://data.wprdc.org/dataset/allegheny-county-parcel-boundaries1) (Core/P0); [County Property Assessments](https://data.wprdc.org/dataset/property-assessments) (Core/P1) | Locate the parcel uniquely with a standardized `parcel_id` / block-lot. Boundaries return a polygon; assessments add address and other search clues. Address is candidate matching only, not a substitute for parcel ID. | Boundary and unique ID are blocking. No unique match, no run. If assessments fail, work from parcel ID and show address fields as unknown. |
| **B3 Parcel facts, map, and report stay linked** | Parcel Boundaries (Core/P0); Property Assessments (Core/P1) | `parcel_id` is the primary key for map, details, and report. Polygon computes/checks area. Assessments supply address, use description, assessed value, and other raw records. | Inconsistent boundary or ID blocks analysis. Assessed value and historic sales stay in “raw parcel facts” and do not enter the constraint grade. |
| **B4 Zoning district classification** | [City Zoning Map](https://pittsburghpa.maps.arcgis.com/apps/instant/sidebar/index.html?appid=4bb79ea64bf848b3a0560e3856efeccb) and [Pittsburgh Zoning Districts](https://data.wprdc.org/dataset/pittsburgh-zoning) (Core/P0, city ArcGIS layer ok); Parcel Boundaries (Core/P0) | Intersect the full parcel polygon with zoning polygons. Show every district/overlay, code, and source. | Point query or untreated split zoning is unknown. Without a housing proposal, do not classify use permission. |
| **B5 One environmental layer** | [Pittsburgh Steep Slopes (25% or greater)](https://data.wprdc.org/dataset/25-or-greater-slope) (Core/P0); Parcel Boundaries (Core/P0) | Polygon spatial join. Output `intersects`, overlap area, share of parcel, layer version/date, and accuracy notes. | P0 demo must have one verified environmental layer. Layer failure makes the environmental conclusion unknown and dependent B6 `unrated`. Intersection only produces a review hint. |
| **B6 Parcel constraint grade** | Structured output of B3–B5; no new dataset | Rule engine reads district intersections, slope observations, and versions, and emits `parcel_constraint_band`, `drivers[]`, `missing_required[]`. County assessed values and market data do not participate. | Incomplete critical evidence is `unrated`. Do not emit an overall Development Ease Score. The LLM does not generate the color or fill facts. |
| **B7 Obstacles, unknowns, next steps** | B4–B6 observations/drivers; official source URLs; optional OneStopPGH/ZBA human entries | Each driver stores fact, impact, next department/professional, original source, data date, and rule version. Permit/case entries are for further review only. | A driver without source or date cannot be a verified obstacle; move it to unknowns. Even with no hits, list unchecked dimensions, overlays, infrastructure, and similar items. |
| **B8 Readable explanation and fallback** | Structured B3–B7 results; no extra catalog data | Template or AI may only restate allowed fields and verified rules. Inputs keep source, scope, and unknown status. | On AI failure, use the template. Do not change the B6 grade, hide unknowns, or invent data from common sense. |
| **B9 Dates, sources, and scope** | Metadata of every called resource; catalog `Read Me` quality rules | Each evidence row stores steward, resource URL, access format, retrieved_at, source_updated_at/vintage, field definitions, transforms, and applicable geography. | Incomplete metadata may show as “version pending review,” not as current fact. Unknown version on critical evidence may drop B6 to `unrated`. |
| **B10 deferred** | Team planning later | UI and report views for the four roles designed separately. | Not in current Basic. |
| **B11 wrap-up** | Data snapshots, rule versions, and human-check notes actually used by B1–B9 | Lock one real `parcel_id` last. Record sources, versions, expected result, and human check. | Not in this Basic build. Synthetic mocks must not pose as real verification. |
| **B12 deferred** | Financial data not chosen | No financial brief or analysis yet. | Not in current Basic. Assessed value and sale price must not pose as financial feasibility. |
| **Nice 3 two-parcel compare** | Each parcel’s own zoning and terrain evidence | Field-by-field compare only when rule version, source/vintage, layer coverage, and evidence scope match. Join key remains each parcel ID. | Missing evidence or version mismatch on either side: compare facts, do not rank grades. |
| **Nice 4 undermined / FEMA** | [Pittsburgh Undermined Areas](https://data.wprdc.org/dataset/undermined-areas) (Core/P1); [FEMA National Flood Hazard Layer](https://www.fema.gov/flood-maps/national-flood-hazard-layer) (Core/P1); Parcel Boundaries | Same polygon spatial join as B5. Store hit type, overlap extent, layer/panel or community ID, version, and limits. | Do not feed B6 until coverage, accuracy, and version are checked. A hit is a professional-review lead, not a safety or official flood determination. |
| **Nice 5 Permit history** | [PLI Permits](https://data.wprdc.org/dataset/pli-permits) (Core/P1); [OneStopPGH](https://onestoppgh.pittsburghpa.gov/) (Core/P2); ZBA decisions (Useful/P2) | PLI: exact join when a parcel ID exists, else standardized address. OneStopPGH: application number as record key, join by address. ZBA: case number as record key; prefer extracted parcel ID, else address and human review. Show record ID, type, status, date, join quality, and official link. | Historical background / review entry only. Do not infer this proposal’s approval probability. Multiple candidates, fuzzy address, or no unique location: do not force a parcel ID; show “possibly related” or N/A. |
| **Nice 6 Minimal financial brief** | Property Sale Transactions (Core/P2); HUD FMR (Core/P2); HUD Income Limits, BLS PPI (Useful/P2); Zillow/Redfin/Realtor.com public aggregates (Core/P2); user-entered samples | Each sample stores address/area, date, type, value, source, spatial grain, and filter reason. Sales records first drop non-arm’s-length / nominal transfers. | Brief and assumption log only. Do not auto-form an investment recommendation or `overall_band`. Public aggregates from listing sites are not listing-level data rights. |
| **Later area / policy / batch features** | ACS, Decennial Census, CHAS, TIGER/Line, Census GEOID; then transit, EJScreen, NLCD, etc. as needed | Join statistical geography with GEOID/FIPS. Maintain a geography-vintage crosswalk. Show coverage, error, and missingness. | Do not backfill into a single-parcel permission judgment. Do not open neighborhood ranking or investment sort until representativeness, equity, and policy rules are validated. |

#### 3.1.1 Parcel join results and N/A rules

`parcel_id` uses only the canonical ID from Parcel Boundaries (current implementation field: `PIN`). Other source IDs stay in `source_native_parcel_id` or `source_record_id`. Do not rename a permit ID, application number, case number, ZIP, FIPS, GEOID, or panel number as parcel ID. Join results go in `parcel_link_status` with method, quality, and version. If a unique parcel cannot be joined safely, `parcel_id = null`.

| Source | Native parcel ID | Resulting `parcel_link_status` | Join method and output | When a reliable join is impossible |
|---|---|---|---|---|
| Parcel Boundaries | Yes: `PIN` | `exact_id` | Canonical `parcel_id`. First check non-empty, uniqueness, format, and valid geometry. | Missing boundary or ID: parcel cannot be analyzed. Show N/A and stop parcel-dependent calculations. |
| Property Assessments | Yes: `PARID` | `exact_id` | Normalize case, spaces, hyphens, and leading zeros, then match `PIN`. Keep original value and transform notes. | No unique match: `parcel_id = null`, assessment fields N/A. Do not auto-overwrite from address. |
| Property Sale Transactions | Usually a parcel ID | `exact_id` | One-to-one / one-to-many check against the boundary ID, then keep the sale/deed record key. | No ID, or historic splits/merges cannot be confirmed: `manual_review`. Price does not enter automatic scoring. |
| Zoning Districts | No | `derived_spatial` | Intersect full parcel polygon with zoning polygons. Keep every district/overlay, overlap area, and share. | Geometry, CRS, coverage, or version unavailable: N/A. Do not fall back to a point result as a whole-parcel conclusion. |
| Steep Slopes, Undermined Areas | No | `derived_spatial` | Polygon intersection. Store `intersects`, `overlap_area`, `overlap_ratio`, and layer version. | Layer unavailable, no coverage, or spatial calc failed: N/A. N/A is not the same as no intersection. |
| FEMA NFHL | No; has community/panel source IDs | `derived_spatial` | Intersect parcel polygon with flood layers. Keep zone, panel/community ID, layer version, and limits. | Service, coverage, accuracy, or version unverifiable: N/A. No official flood determination. |
| PLI Permits | Some records | `exact_id` if ID present; else `derived_address` | If a parcel field exists, check against `PIN`. Else standardize address and store candidate count, distance, and match quality. | Multiple candidates or fuzzy match only: `parcel_id = null`, `needs_review = true`, show “possibly related” or N/A. |
| OneStopPGH | Do not treat application number as parcel ID | `derived_address` or `manual_review` | Application number is `source_record_id`. Find candidate parcels from standardized address or verified coordinates. | No address, location, or unique candidate: N/A, keep the official record entry. |
| ZBA decisions | Sometimes in text | `exact_id`, `derived_address`, or `manual_review` | Case number is the record key. Extracted parcel IDs must be checked against boundaries; otherwise generate address candidates and review. | Multiple candidates, missing address, or uncertain text extract: N/A. Do not enter automatic rules. |
| Zoning Code | Not a direct parcel join | Inherits zoning evidence `parcel_id` | Join by zoning district, code section, and effective date. Code text itself does not create a parcel ID. | Unknown district or code version: rule result N/A, keep the section pending review. |
| HUD FMR, Income Limits, Zillow/Redfin/Realtor area aggregates | No parcel ID | `regional_context` | Join by ZIP, county, HUD Area, and similar keys. State `geographic_level`. Area background only. | No matching area or vintage: N/A. Do not write area numbers as that parcel’s facts. |
| ACS, Census, CHAS | No parcel ID | `regional_context` | Locate the parcel’s area with GEOID/FIPS and statistical boundaries. Keep geography vintage and error. | Incompatible crosswalk or boundary vintage: N/A. Do not backfill a single-parcel permission judgment. |
| BLS PPI and other national/industry indexes | None and not applicable | `n/a` | Join only by series ID, month, and financial scenario. `parcel_id = null`. | UI shows “not parcel-level / N/A.” Scenario background only. |

**Join priority and usable scope:** `exact_id` > verified `derived_spatial` > unique high-quality `derived_address` > `manual_review`. Only the first three may be parcel evidence. Address joins must show quality. `manual_review`, fuzzy matches, and `n/a` do not enter automatic grades or scores. `regional_context` may appear in the same parcel report if labeled with area grain. It cannot become a parcel-level claim.

**Canonical join table `parcel_data_link`** stores at least: `parcel_id`, `source_id`, `source_record_id`, `source_native_parcel_id`, `parcel_link_status`, `join_method`, `match_quality`, `intersects`, `overlap_area`, `overlap_ratio`, `distance_m`, `geographic_level`, `source_version`, `retrieved_at`, `n_a_reason`, `needs_review`. If one source record matches several candidate parcels, each candidate is its own row. None may be marked `exact_id` before human confirmation.

**Shared data contract:** Every adapter emits at least `source_id`, `source_url`, `steward`, `retrieved_at`, `source_updated_at`/`vintage`, `geographic_scope`, `parcel_link_status`, `source_native_parcel_id`, `join_method`, `match_quality`, `raw_identifier`, `n_a_reason`, `needs_review`, and `transform_notes`. Spatial overlays also emit `geometry_source`, `crs`, `intersects`, `overlap_area`, `overlap_ratio`, and accuracy/coverage notes. B6, B7, B9, Nice 3, and export reuse the same evidence. The page layer does not re-guess sources.

### 3.2 Acceptance checklist before data enters the product

For each ingested source, record: steward, resource URL, format, download/call time, data-update time, fields used and definitions, CRS, license/attribution, missingness. For the same real parcel, verify:

1. The parcel ID uniquely locates in the boundary data, and the geometry lands correctly on the map.
2. The zoning layer returns district codes and can detect and display multiple districts.
3. Official Zoning Map and GIS district fields agree. Without a specific housing proposal, do not infer use permission.
4. Environmental overlay units, CRS, and overlap share are spot-checked by a human.
5. For every source with a native parcel ID, measure non-empty rate, exact hit rate against boundary `PIN`, one-to-many / many-to-one, and historic split/merge cases.
6. For spatial joins, check CRS, geometry validity, layer coverage, boundary-touch rules, and at least one human spot-check. A point hit cannot replace full parcel-polygon intersection.
7. For address joins, record standardization steps, candidate count, distance, and match quality. Multiple candidates or fuzzy matches go to `manual_review` and must not auto-enter scoring.
8. For area data, check ZIP/FIPS/GEOID and vintage. The page must show area grain and must not write area metrics as parcel attributes.

On any failure, the UI should show “data missing / cannot judge” or N/A, plus `n_a_reason` and an actionable next step, while keeping retrieved evidence. Do not silently treat as low risk, zero, or a perfect score. N/A means a reliable parcel join cannot be formed now. It does not mean the risk, record, or phenomenon is absent.

## 4. PRD: site features

### 4.1 User flow

1. **Find a parcel on the existing map:** Search by parcel ID, inspect address candidates, or click the map. Address and ZIP code are not unique parcel IDs. The user must confirm one specific parcel.
2. **Confirm the parcel:** The map highlights the boundary. The sidebar shows ID, available address, area, and Pittsburgh city-limits status. Housing type or unit count is not required first. Do not run analysis without a unique location.
3. **Generate the evidence report:** First show parcel zoning, terrain class, and grade scope; then every identified obstacle, unknowns, source dates, and human-review steps.
4. **Act or review:** The user opens official original sources and records items to verify. If a source fails, already-retrieved evidence remains visible, and it is clear which result is unavailable.

### 4.2 Basic: must ship

Plain-language meeting notes: [B1–B12 in plain language](Track1_Basic_Plain_Language.md).

| ID | Feature | Acceptable behavior |
|---|---|---|
| B1 | Reuse the map to find a parcel, confirm, and handle failure | Map click or parcel-ID search locates the same `parcel_id`. Address search with several candidates requires an explicit choice. Empty, no match, and outside city limits give a reason and next step. No unique parcel, no calculation. Existing repo implements some of this; it still needs runtime verification. |
| B3 | Parcel facts, map, and report stay linked | Map highlight, detail sidebar, and result report always cite the same `parcel_id`. Boundary, ID, area, and city-limits status trace to a source. Missing area or address shows “unknown,” not a guessed value. |
| B4 | Zoning district classification | Using the [City of Pittsburgh official Zoning Map](https://pittsburghpa.maps.arcgis.com/apps/instant/sidebar/index.html?appid=4bb79ea64bf848b3a0560e3856efeccb) as reference, show every district the parcel intersects, with name/code, source, and date. Split districts or overlays are listed separately. This is a **which-district** fact class. Without a construction proposal, do not infer that a housing type can be built, approved, or built at a given unit count. The linked map is a zoning map, not a flat/hilly map. |
| B5 | Terrain class and environmental layer | At least check the 25%+ steep-slope layer. Show whether it intersects the parcel, verified overlap area/share, and layer date. UI may say “slope overlap found / no overlap found / insufficient data.” Do not call the whole parcel “flat” or “hilly” without a defined threshold. Intersection does not mean the proposed footprint is affected and does not auto-judge review level. |
| B6 | Scoped parcel-constraint grade | Interpretable green / amber / red means **checked zoning and terrain constraints**. Missing critical evidence is gray. Without a construction proposal, do not read the color as a housing project’s Development Ease, approval probability, or buildable units. Show rule version, GIS source, decision chain, verified vs uncovered factors. The result comes from testable rules, not the LLM. A later project Development Ease Score needs a defined proposal and a re-evaluation. Percent deductions remain an uncalibrated experiment; see 4.4. |
| B7 | All identified obstacles, unknowns, and next steps | **List every** identified obstacle. No three-item cap. Each item has observed fact, impact, who to check next, and source. A summary may highlight the highest-priority items, but the full list must stay visible. Unknowns are listed separately and do not count as zero risk. With no obstacles, still list unchecked items. |
| B8 | Readable explanation and fallback | AI explanation may use only structured observations and verified rules. On service failure, a templated summary stays readable and must not change facts or conclusions. |
| B9 | Dates, sources, and scope | Every key result shows source, data date/retrieval date, and applicable scope. The first screen of results says “early screen, needs human review.” Code version and proposed-policy status must be distinguishable. |

**Deferred (keep original IDs for tracking; not in current Basic):** B10 four-persona UI is planned separately; B11 repeatable real-parcel demo is last wrap-up; B12 financial brief/features wait for suitable data. Current reports still must not claim finances or overall development feasibility were assessed.

### 4.3 If there is time

| Level | Feature | Preconditions |
|---|---|---|
| Nice 1 | Use-rule judgment after the user defines a proposal | User voluntarily supplies housing type and needed parameters. Rules are human-verified. Changing the proposal re-runs the judgment. |
| Nice 2 | Multi-role attention views | Detailed B10 UI planned later. |
| Nice 3 | Lock parcel A, search parcel B, compare row by row | Show both parcels’ zoning, terrain, obstacles, and unknowns. Compare constraint grades only when rule/data versions and evidence scope match. The competition prototype may demo the interaction with two clearly labeled synthetic parcels. |
| Nice 4 | Undermined or FEMA flood layers | Coverage, spatial accuracy, and overlay results already checked. |
| Nice 5 | Permit history or a downloadable report | Match quality, dates, sources, and unknown flags stay in display/export. |
| Nice 6 | Minimal financial brief: user manually records a few dated/addressed rent or sale comps and assumptions | First confirm with a developer/nonprofit SME which inputs actually change an early decision. Do not treat county assessed value as rent/sale comps. Do not auto-compute investment advice. |
| Later | Policy scenarios, area heatmaps, batch screening, full financial pro forma, Agent/MCP | Separately validate wide data coverage, policy rules, investment criteria, and user tasks. |

### 4.4 Parcel-constraint grade vs a future Development Ease Score: scope and rules

The [official challenge brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit) does not prescribe a formula. The expert reply used red/amber/green as an example. [England’s draft local-plan site-assessment guidance](https://www.gov.uk/guidance/assessing-sites-for-local-plans-stage-2) also separates suitability, availability, and achievability and prefers RAG. The **method structure** can be borrowed. It is not Pittsburgh code, and its conclusions cannot be applied directly to a city single-parcel permit. Live no-proposal screening rules are in the [LDES v3 scorecard](LDES_v3_screening_scorecard.md).

**Open risk:** The official use case asks for a Development Ease Score. After dropping proposal input this round, ease of a specific housing scheme cannot be judged rigorously. Ship parcel-constraint classification first. Before final submission the team must decide how to explain this scope gap to judges, or add project-level scoring in a later flow with a defined proposal.

**Gap vs then-current implementation:** When this section was written, the prototype still had an unverified 0–100 score. The current default implementation is the [LDES v3 scorecard](LDES_v3_screening_scorecard.md).

- **Current Basic grade:** `parcel_constraint_band = green | amber | red | unrated` refers only to verified zoning and terrain constraints. Missing critical evidence is gray. **Do not call it a Development Ease Score for a housing proposal.** Green means no constraint was found in the current checked scope, not that the parcel is buildable or easy to develop.
- **Unassessed dimensions:** Housing use, proposed scale, land availability, and finances do not enter the current judgment. No overall ease grade is produced. Financial brief B12 is deferred, but the page must not imply finances were judged.
- **Method:** Official Zoning Map/GIS and the 25%+ slope layer are fact inputs, classified by versioned rules. Split districts, slope overlap, and missing layers are explained separately. A map overlap alone must not auto-mean undevelopable. Next to the color show reason, scope, source, version, and next step. Answering a specific housing use and scale later needs a proposal and a redesigned, validated scoring rule.
- **Numeric experiment:** A 100-start deduction with caps/blocks for severe obstacles may stay an internal candidate. Specific deductions and thresholds have no official or local empirical basis yet. **Do not show a percent score publicly** until local cases and sensitivity calibration are done. Jev may help extract unstructured text. It does not decide code results or scores.

The data/interface track can prepare `parcel_constraint_band`, `scope`, `rule_version`, `drivers[]` (fact, reason, source, date), `missing_required[]`, and `not_assessed[]` in parallel. **The prototype at the time of writing could honestly show only gray:** parcel facts plus a point zoning query were not enough for full-parcel intersection and slope overlay. End-to-end real-parcel verification is B11 wrap-up. Cross-parcel compare uses the same rules and evidence scope. A fuller “parcel + defined proposal” method is not the scoring spec for this no-proposal Basic.

### 4.5 Non-functional and usability requirements

- Key conclusions are not color-only. “Unknown,” “needs verification,” and “no layer overlap found” use different words.
- Source links open from results and exports. Layer, rule, and snapshot dates are inspectable.
- Failure of some sources does not clear retrieved evidence. AI failure does not make the report unusable.
- On narrow screens keep reading order: summary → obstacles → unknowns → evidence → sources.

## 5. Pages and states

- **Map workbench:** Reuse the existing map, address/parcel ID search, and boundary highlight. After a parcel is selected, show zoning and terrain evidence. Do not require a housing proposal first.
- **Unified result report:** Keep the same selected parcel on the map. Show the parcel-constraint grade or gray insufficient evidence, every identified obstacle, unknowns, and next steps. A summary may highlight priorities; the full list stays available. Existing assessed values / historic sale prices are raw parcel facts, not financial conclusions.
- **Attention views:** B10 deferred. Role UI and page layout planned separately.
- **Loading / partial failure:** Show find progress in steps. On a source failure, keep retrieved content and name the failed source and its effect on the grade.
- **Error states:** Empty ID, no match, multiple matches, outside city limits, split zoning/overlay, rule not covered, source failure, and AI failure each have a clear next step.

**Example result copy (structure only, not a real-parcel conclusion):**

> Parcel `[verified ID]`. District(s) `[code pending check]`; 25%+ slope layer `[intersects / does not intersect / unknown]`. Housing type and scale have not been provided, so residential use permission, unit count, and permit path are not judged. Each observation includes source and date.

This example does not show green / amber / red because no real report has finished the required verification.

## 6. Demo acceptance

1. Enter a parcel ID on the web. Result and map point to the same parcel. Housing type or unit count is not required first.
2. Zoning and terrain classification include openable official sources, dates, and unverified items.
3. If red / amber / green is shown, call it a “parcel constraint grade” and state coverage. Insufficient evidence is gray. Do not call it a full Development Ease Score for a specific housing project. If a 0–100 experimental score is also shown, it must meet the calibration and disclosure bar in this document.
4. At least one real “unknown / needs human verification” appears and is not treated as zero risk.
5. B10 role-UI acceptance is deferred and defined later.
6. Entering analysis from an existing map click or search keeps the same parcel on map, detail sidebar, and report. Limits of the existing point zoning query must not be hidden.
7. The user can see **all** identified obstacles and their official review entries. The report states it does not contain a specific-project, permit, or financial conclusion.
8. B11 real-parcel end-to-end demo and repo delivery notes are last wrap-up acceptance, not a blocker for this Basic feature design.

## 7. Parallel work and interview feedback

Track 3’s [Slack expert interview guide](Track1_Expert_Interview_Guide.md) only asks for practice judgments that desk research cannot answer. **Interview replies are not a start condition for the PRD, data collection, or interface design.** This version first checks parcel, zoning, and terrain fields and the page/API contract. Specific housing proposals and financial features are planned separately.

| Decision | Reversible assumption now | How late interviews feed back |
|---|---|---|
| Primary user | Small/mid-size developer early single-parcel diligence. Nonprofit and planner share the report. | If several experts clearly say another user’s decision is more urgent, adjust summary order and demo narrative. Do not recapture the same parcel facts. |
| Report content | Summary + evidence + unknowns + next steps side by side. Grade is only bounded supporting information. | Interviews may change obstacle order and copy, not overwrite code facts. |
| Scoring | Versioned zoning/terrain constraint classification only. A no-proposal grade does not stand for overall Development Ease. Numeric deductions stay an internal experiment. | Use real parcels to ask experts for misleading counterexamples. Scoring a specific proposal is a separate rule set. |
| Finance | B12 financial brief and features deferred. Existing assessed values / sale prices are not rent/sale comps. | After suitable financial data exists, decide requirements and priority. |
| Multi-role interaction | B10 UI deferred. | Team later plans each role’s interaction separately. |

Interview replies are recorded as “respondent role, date, quote/case, which requirement, whether to change, owner.” One late comment does not automatically override verified rules. Claims about code or data go back to an authoritative source. The three tracks first align zoning, terrain, obstacles, and unknowns on **the same parcel**.

Historical contest constraints are in the [participant handbook](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?tab=t.0): project code must be written after 2026-09-26 09:00 ET start. This document is requirements. Submission rules still follow the latest organizer announcement.

## Sources

- [AI for Housing participant handbook](https://docs.google.com/document/d/1L-UYid6Q0JDRH3iy4cpqGIDlZNpJspok_rPxIsILbLQ/edit?tab=t.0)
- [Track 1 official brief](https://ai-horizons-2026-ai-for-housing-hackathon.brandon831577.chatgpt.site/challenges/policy-to-permit)
- [Official Public Data Catalog](https://docs.google.com/spreadsheets/d/19CKyt1kansUZ3VGOAOBihYYxNFuitx5VTkzOiEy4iXA/edit?gid=2076065299#gid=2076065299): Data Catalog, Read Me, and Brief Source Map sheets
- Team file *Housing AI Horizon Team Meeting Agenda.pdf*, especially Relevant Datasets and Scoring Mechanism
