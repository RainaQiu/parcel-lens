# Parcel Lens: search, report, comparison, and explanation plan

Date: 2026-09-27
Status: implemented and verified locally.
Scope: Pittsburgh parcel screening, current LDES v2.3 deterministic scoring, existing live data sources.

## 1. Product goal and decisions

The primary user is doing early parcel due diligence. The fastest useful path is: find a specific parcel, understand the main constraints and unknowns, save other candidates, then compare evidence and next checks. Keep the default path free of advanced filters or a required housing scenario.

1. Keep the map as a parcel-finding workspace. Selecting a parcel opens a **short preview** with address, canonical parcel ID, screening result, two or three main drivers, and `View full report` / `Add to list` actions.
2. `View full report` navigates to `/parcels/:pin`, a separate page and shareable URL. It need not open a new browser tab. Back navigation restores the map position and saved list.
3. A persistent list stores canonical parcel IDs, not addresses or old result objects. Users can add parcels from search, map preview, or a report, remove them, and compare 2–4 parcels at `/compare?pins=...`. The default comparison is three or fewer columns for readability.
4. Address search always offers candidates for explicit selection. A complete address is **not** an assertion of one parcel. PIN lookup may open a unique verified parcel directly.
5. LDES score, evidence status, and rules remain deterministic. LLM text is an optional, clearly identified explanation layer. Failure or exhausted quota falls back immediately to deterministic prose and source facts.

These choices follow the existing PRD's emphasis on summary, evidence, unknowns, and next steps, and its rule that address matches cannot silently choose the first candidate.

## 2. Current findings

- The expanded panel is a full-screen overlay, but `src/App.css` applies `column-count: 3` above 1280 px. Long score cards become narrow columns while the right side appears empty. The panel also mixes summary and property fields at the same visual level.
- `searchAssessments` fetches at most 50 rows for a house number and then requires the supplied street string to appear literally in `PROPERTYADDRESS`. It cannot match `FIFTH AVENUE` to `5TH AVE`, misspellings, or a result beyond the first page.
- In the live WPRDC assessment resource, house number 2633 has five `5TH AVE` parcel IDs: `0011M00146000000`, `0028J00001000000`, `0011M00147000000`, `0011M00149000000`, and `0011M00060000000`. An address suggestion must expose this ambiguity.
- `App.tsx` holds one selected parcel, so a list and direct report route need a shared parcel-loading model. The existing deployment note says a plain static host does not provide the current `/api/*` proxies; the proposed explanation endpoint also needs server support.
- The report shows useful source observations, but its first screen leads with status jargon and a dense paragraph. It makes the user work to answer “what matters, why, what remains unknown, and what do I check next?”

## 3. Page design

### A. Map/search `/`

```text
Top bar:  [ Search address or parcel ID                         ] [Saved 2]
Map:      selected boundary, zoning controls, saved parcel markers
Preview:  2633 5TH AVE · PIN 0011M... · screening status
          Main constraint · Missing evidence
          [View full report] [Add to list]
Bottom/right tray:  Parcel A  Parcel B  [+ find another]  [Compare 2]
```

- Search dropdown shows address, city/ZIP, PIN, and enough context to distinguish duplicate addresses. Clicking a candidate shows/highlights its boundary before final add. If a boundary cannot be confirmed, show the failure and do not add a phantom parcel.
- The tray remains visible when users search again; `Add to list` confirms success and changes to `Added`. Disable comparison until two valid IDs exist. Allow reordering and removing; a duplicate add is idempotent.
- Map preview is deliberately short. No nested scrollbar or full raw report in this surface. The zoning legend should collapse by default and must not cover the selected-parcel controls.

### B. Full report `/parcels/:pin`

```text
Back to map  /  2633 5TH AVE                 [Add to list] [Print/Save]
Status + scope    Main finding (2–3 sentences)    Updated/source state
Why this result   1. Constraint -> observed fact -> effect -> next check
                  2. Constraint -> observed fact -> effect -> next check
Housing paths     Five base-zoning use rows; plain-language labels
Unknowns          Required missing data and what cannot yet be concluded
Evidence          Expandable source details, dates, joins, raw values
Property details  Expandable assessment and owner records
```

- Report width about 1100–1200 px, centered. Use a readable main column (about 65–70%) and a compact summary/section-navigation rail; collapse to one column on smaller screens. Avoid CSS newspaper columns. Keep paragraphs short and line width roughly 60–80 characters.
- The first viewport answers: which parcel, what the score covers, two/three important constraints, and one immediate next action. Use labels such as `Environment: constraint found` alongside color, and explain `UNRATED` as “not enough evidence to rate.”
- Separate **observed fact**, **rule interpretation**, and **AI explanation** visually. Each important claim links to a source observation. Evidence and property details remain available, but collapsed after the decision summary.
- Direct link refresh must load by canonical PIN. Invalid/missing PIN gets a recoverable error and search entry. The deployment host must rewrite page routes to the app entry point.
- Replace the expanded-overlay action with `View full report`. Until the new route is ready, a short CSS fix can remove `column-count` and constrain card width; do not treat that as the finished report design.

### C. Compare `/compare?pins=A,B[,C,D]`

```text
                          Parcel A        Parcel B        Parcel C
Address / PIN             ...             ...             ...
Screening and scope       RED             AMBER           UNRATED
Top constraint            ...             ...             ...
Zoning use pathways       ...             ...             ...
Environment / history     ...             ...             ...
Evidence gaps             ...             ...             ...
What to verify next       ...             ...             ...
Sources and retrieval     ...             ...             ...
                         [Report]        [Report]        [Report]
```

- Desktop: fixed row labels and sticky parcel headers; differences highlighted, empty data shown explicitly. Mobile: select two parcels and switch pairs or use stacked parcel cards. Do not squeeze four full reports into narrow columns.
- Compare the same dimensions for every parcel; never compare a known Green with an Unknown as if Unknown meant worse. Show version and source coverage. If rule versions or required evidence differ, explain why the headline statuses are not directly comparable.
- No automatic “best parcel” ranking. A red parcel may still be preferable under an unmodeled project plan. Comparison should help users choose what to investigate next.
- List is stored locally as PINs only (`localStorage`); reload current facts when opened. Preserve the list after route changes, and handle one failed parcel without clearing the others. No account or shared persistence in this phase.

## 4. Address and PIN search design

### Retrieval and ranking

1. Preserve the original query for display and diagnostics. Parse PIN separately from address. PIN still requires an exact boundary-confirmed lookup.
2. Normalize the query **and candidate addresses** for retrieval/ranking: case, whitespace, punctuation, street suffixes (`AVENUE`/`AVE`), and spelled/numeric ordinals (`FIFTH`/`5TH`). Parse directional words and unit numbers without deleting them blindly. Original source spelling remains on screen.
3. Query by house number and paginate through *all* returned candidates within a bounded count. Rank exact normalized address first, then close street spelling, then other nearby matches. Do not silently drop all candidates when the street has a typo.
4. For missing or mistyped house numbers, add a small server-side searchable assessment index with normalized aliases and typo-tolerant ranking; refresh it with a visible data date. This is more reliable than downloading the entire assessment file into the browser or requesting only the first CKAN page. The index returns candidate PINs, not final facts; candidate selection and boundary lookup still verify identity.
5. Suggestion UI: show up to 8 strong matches with a `Show more` path, distinguish duplicate addresses by PIN and map location, and label approximate matches. A candidate click selects its boundary; pressing Enter selects only a keyboard-highlighted candidate. Escape closes the list. If no reliable candidate exists, offer a broader search or map selection—never guess.

The exact phrase `2633 fifth avenue` should rank the five `2633 5TH AVE` parcels. `2633 5th ave` should produce the same candidate set. A one-letter street typo should offer labeled approximate matches. A wrong house number should suggest nearby candidates only when the match is clear enough to inspect; it must never auto-open another property.

### Data identity invariant

`search query -> user-chosen assessment PARID -> exact parcel boundary PIN -> report PIN`. The map highlight, report title, saved list, comparison, and source joins all use the verified canonical PIN. Ambiguous or missing boundaries stop the flow with a useful error.

## 5. Explainability and LLM boundary

### What merits explanation

| Information | Default treatment | LLM role |
|---|---|---|
| Headline result and main drivers | Short plain-language summary, with score scope | Explain why observed evidence produced this result and what it means for early screening |
| Red/amber constraint or `UNRATED` | Fact, rule, consequence, next check, source | Explain the consequence and next check; cite only provided facts |
| Housing pathways | Human-readable rule labels and caveats | Optional brief explanation only for unusual mixed/ambiguous rows |
| Source observations, owner/assessment fields | Collapsed but inspectable raw facts | No routine LLM paraphrase |
| Multi-parcel comparison | Same deterministic row matrix | Optional later trade-off summary after single-report explanation is stable |

Create a deterministic explanation template first. It should already say why each red/amber/unknown driver appears and retain source IDs. This becomes the offline/no-budget fallback. The LLM improves phrasing and prioritization, not the facts or classification.

### Service contract

- Add a same-origin server/serverless `POST /api/explanations` endpoint. The browser sends a compact allowlisted payload: verified PIN, score/rule version, statuses, driver codes and values, missing evidence, source IDs/URLs/dates, and a content hash. Exclude owner names, mailing addresses, full polygons, and other unrelated fields.
- Server validates size and schema, creates a constrained prompt, calls the configured provider, validates a structured JSON response, and returns `summary`, `drivers[]`, `unknowns[]`, `nextSteps[]`, cited source IDs, generation time, and model/prompt version. Render text safely; do not render provider HTML. Reject source IDs absent from the input. Keep original numeric facts and official citations adjacent to explanations.
- Cache by PIN + evidence hash + score version + prompt version + locale; stale evidence must not reuse old explanations. Apply rate limits, timeout, output-token cap, and a small budget guard. Only request an explanation when the full report opens, not for every map click or keystroke.
- On no key, disabled LLM, 429/quota exhaustion, timeout, malformed response, or provider outage: immediately show the deterministic summary plus the same evidence and raw values. The rest of the report and comparison must work. A small `AI explanation unavailable; showing source-based summary` label is enough; no blocking spinner after timeout.
- The LLM must not recalculate LDES, override the score, assert permits/approval/feasibility, invent new facts or citations, or hide an unknown. Treat source text as data, not instructions. Check output against the input contract before displaying it.

Configuration template: root `.env.example` contains server-only `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, and bounds. Copy it to ignored `.env` when selecting a provider. The present frontend has no explanation server yet, so adding a key alone does not activate LLM. Never use `VITE_LLM_API_KEY`: Vite exposes prefixed variables to browser code.

## 6. Delivery phases and acceptance checks

### Phase 0 — report model and acceptance fixtures

- Extract a stable `ParcelReport` model and one loader from `App.tsx` so map preview, direct report URL, and comparison share canonical PIN, score inputs, source status, and errors. Reuse `scoreParcel`; do not change LDES calculations here.
- Record fixed examples: current Muriel Street screenshot, `2633 FIFTH AVENUE`/`2633 5TH AVE` (five candidates), one ambiguous/failed source, one `UNRATED`, and two contrasting parcels. Include source/version notes.
- Accept when a direct PIN report, map selection, and saved list refer to the same PIN and partial source failures remain visible.

### Phase 1 — find the intended parcel

- Update `src/lib/ckan.ts` retrieval to paginate house-number candidates; add address normalization/ranking module and focused tests for ordinal/suffix aliases, typos, duplicates, and no match. Preserve original result labels.
- Replace current search `listbox` with accessible combobox behavior and explicit selection. Show city, ZIP, PIN and duplicate-address context; map confirms selected boundary.
- Add the server-side typo-tolerant search index if API-only retrieval cannot satisfy mistyped house-number cases. Document refresh and index date.
- Accept when `2633 fifth avenue` and `2633 5th ave` return the same five distinct choices; Enter with no highlighted choice does not select one; a typo suggests candidates but never silently changes the parcel.

### Phase 2 — full report and readable map preview

- Add route handling for `/`, `/parcels/:pin`, and later `/compare`; add host rewrite configuration. Refactor `ParcelDetails` into a compact preview and report sections. Remove expanded overlay newspaper-column layout.
- Add short deterministic `What matters / Why / Unknown / Next check` copy driven by the existing score, with source links and clearly scoped colors. Place raw fields in expandable evidence/property sections.
- Check the screenshot desktop width, a typical laptop width, and mobile. Accept when the report uses the available page width without narrow multi-columns, survives direct URL refresh, and presents key findings in the first viewport.

### Phase 3 — saved list and comparison

- Add a PIN-only saved-list store, tray, `Add/Remove` actions, map markers, and comparison route. Load 2–4 reports independently; show a parcel-specific failure without losing the rest.
- Build a fixed comparison matrix using shared report fields, source coverage, and version; implement sticky headers and mobile pair view. Preserve list and map context during navigation.
- Accept when a user searches A, adds it, searches B, adds it, compares, opens either full report, returns, and still has both parcels. Duplicate addresses remain distinct by PIN.

### Phase 4 — optional AI explanation service

- Implement `POST /api/explanations` and server-only env loading; validate request/response, citations, caching, cost bounds and error fallback. Set a provider and model only after the actual deployment platform is chosen.
- Add the AI explanation only to headline and meaningful red/amber/unknown sections. Keep deterministic text and source facts underneath, available without any key.
- Accept when valid output cites existing facts, and disabled key/429/timeout/malformed output all show a complete deterministic report with raw evidence. No key is present in the browser bundle, logs, or Git.

### Phase 5 — usability and release verification

- Check keyboard search, focus on route change, screen-reader labels, status text without color dependence, small screens, map legend overlap, loading/empty/error states, and print layout.
- Check source freshness, rule-version differences, and honest `UNRATED`/missing-data language in report and comparison. Add a short guided demo path using known parcels.
- Run unit tests for search normalization and report mapping, integration checks for add/compare/direct-link/fallback, browser checks at desktop/mobile widths, build/lint, and production-host `/api/*` and route-refresh smoke tests.

## 7. Risks and product limits

- **Address certainty:** no fuzzy search can guarantee the correct parcel for every typo. Explicit candidate selection and map boundary confirmation are part of correctness.
- **Source freshness:** saved PINs reopen live facts, so old explanations and screenshots can differ. Show source retrieval date and invalidate LLM cache when evidence changes.
- **Comparison scope:** LDES colors are limited parcel screening, not ranked development potential. Different source coverage must remain visible.
- **Deployment:** static `dist/` alone cannot serve the existing GIS proxies or new LLM endpoint. Decide the host and same-origin API layer before AI implementation.
- **Cost/privacy:** explanations are generated only for deliberate report views; no owner data is sent to the model. Server secret management and budget controls are required before enabling the provider.

## 8. Recommended first review checkpoint

Review the three page sketches, comparison row set, exact-search behavior for five `2633 5TH AVE` candidates, and the explanation scope. After this design is approved, implement Phases 0–2 first so the core single-parcel experience is readable and reliable, then list/compare, then LLM service.

## 9. Technical references

- [CKAN DataStore API documentation](https://docs.ckan.org/en/2.11/maintaining/datastore.html): query, filters, limit/offset, and pagination behavior.
- [USPS Publication 28, street suffix abbreviations](https://pe.usps.com/text/pub28/28apc_002.htm): source for common suffix aliases such as Avenue/AVE. Spelled/numeric street ordinals are an application-specific retrieval alias and must be tested against source records.
- [W3C ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/): accessible suggestion list and keyboard selection behavior.
- [Vite environment variables](https://vite.dev/guide/env-and-mode): `VITE_` variables are included in browser bundles and cannot contain API keys.
