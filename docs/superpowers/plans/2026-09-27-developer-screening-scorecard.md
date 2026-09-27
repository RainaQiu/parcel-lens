# Developer Screening Scorecard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the default v2.3 headline with a source-grounded v3 parcel screening scorecard for deciding which Pittsburgh parcels deserve further residential development due diligence.

**Historical implementation plan.** Its original overlap acceptance examples are superseded by the live thresholds in [LDES v3 preliminary scorecard](../../LDES_v3_screening_scorecard.md).

**Architecture:** Keep the existing GIS, CKAN, address search, and verified §911.02 use table. Four pure units derive housing pathway status, per-source mapped observations, review tasks, and the combined RAG; a single `ScreeningScorecard` becomes the view contract for preview, report, compare, and optional LLM explanation. Retain v2.2/v2.3 functions and fixtures as historical regression behavior, but stop displaying their `easeScore` as the current headline.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 5, Node.js explanation proxy, existing MapLibre/Turf data pipeline.

**Spec:** `docs/superpowers/specs/2026-09-27-developer-screening-scorecard-design.md`

## Global Constraints

- Default input remains an address or Parcel ID; no housing scenario, unit count, or advanced filter is required.
- The headline is `Development Ease Score — Preliminary zoning & site screen`; `screeningRag` is `GREEN | AMBER | RED | UNRATED`, `projectFeasibility` is `NOT_ASSESSED`, and `scoreVersion` is `LDES-v3-screening-scorecard`.
- Use the existing five verified §911.02 residential use categories; do not claim a use-path result proves a permit, buildable envelope, site control, cost, or return.
- A parcel overlap percentage is a mapped observation, never a v3 `RED` threshold; with no project footprint, detected features have `projectImpact=UNKNOWN`.
- Missing required source evidence is `UNKNOWN`, distinct from successful zero overlap; keep successful facts visible when another source fails.
- Only a verified special review task can turn an otherwise Green screen Amber; routine due diligence does not.
- LLM text only explains deterministic evidence. Failure, invalid output, or exhausted quota uses the deterministic summary without changing the grade.
- Keep all existing historical scoring fixtures passing. Work and commits stay local; do not push.

## Review Focus

- A confirmed complete query with no matching features (`available` zero or confirmed `not_found`) must produce `NOT_DETECTED`, while a failed query produces `UNKNOWN` and, where required, `UNRATED` (Task 2 and Task 4 tests).
- A tiny geometric sliver must remain visible as boundary uncertainty without silently becoming a confirmed special review task (Task 2 and Task 3 tests).
- Duplicate address candidates must preserve separate PIN-based results, including `5000 Forbes Ave` (Task 4 identity test and Task 8 live check).
- Mixed or unverified base zoning, including point-lookup fallback, must never inherit a single district's apparent by-right path (Task 1 and Task 4 tests).
- A model explanation that invents a numeric estimate or asserts approval must be rejected and fall back to deterministic text (Task 7 tests).

---

## File map and interfaces

| File | Responsibility |
|---|---|
| `src/lib/screening/types.ts` | v3-only scorecard, source, task, and enum contracts |
| `src/lib/screening/pathways.ts` | Complete five-use table check and pathway summary |
| `src/lib/screening/constraints.ts` | Source status, overlap, FEMA category, and provenance normalization |
| `src/lib/screening/tasks.ts` | Deduplicated triggered/routine/gap next steps |
| `src/lib/screening/rag.ts` | Ordered, pure combined RAG rule |
| `src/lib/screening/scorecard.ts` | Compose the four units from one `SelectedParcel` |
| `src/lib/screening/presentation.ts` | Pure shared view labels and comparison rows |
| `src/lib/reportView.ts` | Build a report and deterministic plain-language summary from v3 |
| `src/panel/{ParcelPreview,ReportPage,ComparePage}.tsx` | Display the same scorecard contract at three levels of detail |
| `server/{explanationCore,explanations}.mjs` | Validate and explain only supplied v3 facts |

All v3 modules must be pure and deterministic; `assessedAt`/retrieval timestamps can be displayed but cannot alter the grade. `scoreScreeningParcel(selected: SelectedParcel): ScreeningScorecard` is the sole UI-facing scoring entry point. `ParcelReport.scorecard` is the new current result; any retained `ParcelReport.score` is explicitly legacy and cannot drive visible current labels.

### Task 1: V3 contract and housing pathway summary

**Files:** Create `src/lib/screening/types.ts`, `src/lib/screening/pathways.ts`, `src/lib/screening/pathways.test.ts`; reuse `src/lib/types.ts`, `src/lib/housingPathways.ts` without changing historical behavior.

**Interfaces:** `summarizePathways(evidence: LdesEvidence): { status: PathwaySummary; rows: HousingPathwayRow[]; gaps: EvidenceGap[] }`, with `PathwaySummary = BY_RIGHT_PATH_IDENTIFIED | REVIEW_PATH_ONLY | NO_LISTED_PATH | UNKNOWN`. Define `ScreeningScorecard`, `MappedConstraint`, `ReviewTask`, `EvidenceGap`, and `ScreeningRag` in `types.ts` for later tasks. A complete table means exactly five verified rows for a single verified base district, with valid parcel/city/overlay evidence; missing cell, multiple districts, unhandled overlay, or point-only zoning makes the summary `UNKNOWN`. `P_OR_S` counts as a review path until lot width is known.

- [ ] Write failing Vitest cases for EMI `P/A/NOT_PERMITTED×3` → `BY_RIGHT_PATH_IDENTIFIED`, five `NOT_PERMITTED` → `NO_LISTED_PATH`, five review-only rows → `REVIEW_PATH_ONLY`, and one unknown cell, split base districts, unhandled overlay, or unverified point lookup → `UNKNOWN` with a named gap.
- [ ] Run `npm test -- src/lib/screening/pathways.test.ts`; expect missing module/function failure.
- [ ] Implement the v3 types and `summarizePathways`, retaining verified row metadata and never using the row's historical `rag` as the combined grade.
- [ ] Run `npm test -- src/lib/screening/pathways.test.ts`; expect all cases pass.
- [ ] Commit locally: `git add src/lib/screening && git commit -m "feat: define verified screening pathways"`.

### Task 2: Source-grounded mapped constraints

**Files:** Create `src/lib/screening/constraints.ts`, `src/lib/screening/constraints.test.ts`; read `src/lib/ldes/geometry.ts`, `src/lib/evidence.ts`.

**Interfaces:** `observeMappedConstraints(evidence: LdesEvidence): { constraints: MappedConstraint[]; gaps: EvidenceGap[] }`. One stable item per slope, landslide, undermined, FEMA, historic district, and historic site source; status `DETECTED | NOT_DETECTED | UNKNOWN`. Carry `sourceId`, URL, source/retrieval dates, join method, category, raw overlap area/percent, and `boundaryUncertain`. For positive effective geometry or FEMA hit, set `projectImpact=UNKNOWN`; for successful zero, `NOT_APPLICABLE`. Unknown has no fabricated zero. Preserve `FLOODWAY` separately from `SFHA` and `PCT_0_2`. Reuse existing `effectiveOverlap` sliver boundary policy, but retain raw measurements and label the suppressed sliver as uncertain.

- [ ] Write failing tests for confirmed zero/`not_found` vs unavailable; 2.208% slope; 55% slope still `DETECTED` without a Red field; a `<10 sqft` and `<0.1%` sliver as boundary-uncertain; floodway and ordinary flood hits; source provenance carried unchanged.
- [ ] Run `npm test -- src/lib/screening/constraints.test.ts`; expect missing module/function failure.
- [ ] Implement `observeMappedConstraints` with stable source order and explicit `UNKNOWN` for absent or failed required observations.
- [ ] Run `npm test -- src/lib/screening/constraints.test.ts`; expect all cases pass.
- [ ] Commit locally: `git add src/lib/screening && git commit -m "feat: normalize mapped screening evidence"`.

### Task 3: Actionable review tasks

**Files:** Create `src/lib/screening/tasks.ts`, `src/lib/screening/tasks.test.ts`.

**Interfaces:** `deriveReviewTasks(evidence: LdesEvidence, pathway: PathwaySummary, constraints: MappedConstraint[], gaps: EvidenceGap[]): ReviewTask[]`. Each task has stable `id`, `trigger`, `whyItMatters`, `whoToConsult`, `sourceRefs`, `scoreEffect: triggered | routine | gap`. One root cause appears once. Review-only housing path, effective mapped hit, active condemnation, active violation, and pertinent historic status create targeted tasks; closed violation history is context only. Routine tasks cover specific project dimensions/location and land control/economics without changing grade; missing evidence creates gap tasks. No task claims engineering impact from parcel overlap alone.

- [ ] Write failing tests for review-only use, a detected slope with unknown project impact, floodway-specific next check, active vs closed PLI record, duplicate trigger deduplication, routine-only parcel, and uncertain sliver causing no confirmed triggered task.
- [ ] Run `npm test -- src/lib/screening/tasks.test.ts`; expect missing module/function failure.
- [ ] Implement `deriveReviewTasks` and fixed wording that names the source and tells the user what to verify next.
- [ ] Run `npm test -- src/lib/screening/tasks.test.ts`; expect all cases pass.
- [ ] Commit locally: `git add src/lib/screening && git commit -m "feat: derive parcel review tasks"`.

### Task 4: Combined RAG and scorecard composition

**Files:** Create `src/lib/screening/rag.ts`, `src/lib/screening/rag.test.ts`, `src/lib/screening/scorecard.ts`, `src/lib/screening/scorecard.test.ts`; read `src/lib/ldes/fixtures/verified-parcels.json` and keep it unchanged as historical evidence.

**Interfaces:** `combineScreeningRag(input: { identityVerified: boolean; pathway: PathwaySummary; requiredSourcesComplete: boolean; tasks: ReviewTask[] }): ScreeningRag`; `scoreScreeningParcel(selected: SelectedParcel): ScreeningScorecard`. Derive canonical PIN, Pittsburgh city/boundary verification and required-source completeness from existing `ldes`/`ldesLayers` observations. Required sources are slope, landslide, undermined, FEMA, historic district, historic site, violations, and condemned status; `not_found` counts as complete only when the underlying query confirmed no matching record. Rule order: identity/pathway unknown → `UNRATED`; verified five-use no-path → `RED`; listed path plus missing required source → `UNRATED`; review-only path or triggered task → `AMBER`; otherwise `GREEN`. Collect gaps from every unit even when Red has precedence. `unassessed` always includes project size/location, land control, engineering cost, and financial feasibility. Never infer land availability from owner/use data.

- [ ] Write failing `rag.test.ts` cases for every precedence branch, including `NO_LISTED_PATH` plus failed FEMA remains Red with a retained gap; a listed path plus failed FEMA is Unrated; routine-only tasks remain Green; 55% overlap with only a triggered review task is Amber.
- [ ] Write failing `scorecard.test.ts` cases using a documented input snapshot for `0052P00130000000` (EMI rows and 2.208% slope from the approved spec), checking Amber, unknown project impact, and `NOT_ASSESSED`; add two separate PINs with identical address but different inputs to prove identity isolation. Also cover point fallback, split zoning, source failure with successful facts retained, and deterministic repeated grade. Do not claim the existing four historical fixtures are CMU records.
- [ ] Run `npm test -- src/lib/screening/rag.test.ts src/lib/screening/scorecard.test.ts`; expect missing module/function failure.
- [ ] Implement `combineScreeningRag` and `scoreScreeningParcel`; keep v2.3 `scoreEvidence`/`scoreParcel` and legacy fixtures untouched.
- [ ] Run `npm test -- src/lib/screening/rag.test.ts src/lib/screening/scorecard.test.ts src/lib/ldes`; expect all pass.
- [ ] Commit locally: `git add src/lib/screening && git commit -m "feat: compose preliminary screening scorecard"`.

### Task 5: Report model and deterministic explanation

**Files:** Modify `src/lib/reportView.ts`, `src/lib/reportView.test.ts`; create `src/lib/screening/copy.ts`, `src/lib/screening/copy.test.ts`.

**Interfaces:** `ParcelReport.scorecard: ScreeningScorecard`; `buildScreeningFallback(scorecard: ScreeningScorecard): string`. `makeParcelReport` calls `scoreScreeningParcel` and binds the result to the selected canonical PIN. A fixed `screeningMeaning(rag: ScreeningRag): string` supplies the four meanings from the spec. Fallback first sentence states scope and grade, then the most relevant verified task or gap; Red says only the five listed use paths are absent. Do not expose historical `easeScore` as current `score` unless existing callers require a temporary compatibility property, and remove that property by Task 6.

- [ ] Write failing tests for one report per PIN at a shared address, all four grade meanings, a no-path Red without “unbuildable,” an Amber overlap without “whole parcel affected,” an Unrated failed source, and no driver/task text overclaiming permit approval.
- [ ] Run `npm test -- src/lib/reportView.test.ts src/lib/screening/copy.test.ts`; expect new assertions fail.
- [ ] Implement the report model and deterministic copy; preserve the address display and source details.
- [ ] Run `npm test -- src/lib/reportView.test.ts src/lib/screening/copy.test.ts`; expect all pass.
- [ ] Commit locally: `git add src/lib/reportView.ts src/lib/reportView.test.ts src/lib/screening && git commit -m "feat: bind reports to v3 screening"`.

### Task 6: Preview, full report, and comparison

**Files:** Modify `src/panel/ParcelPreview.tsx`, `src/panel/ReportPage.tsx`, `src/panel/ComparePage.tsx`, `src/App.css`; create `src/lib/screening/presentation.ts`, `src/lib/screening/presentation.test.ts`.

**Interfaces:** `screeningPresentation(scorecard: ScreeningScorecard)` returns grade text, pathway text, top task, first gap, and scope disclaimer; `comparisonRows(reports: ParcelReport[])` returns fixed-label rows in user-supplied PIN order plus a version/required-source coverage warning. All three surfaces read `report.scorecard`, not `report.score.easeScore`. Preview gives PIN, headline RAG plus text, housing path, top review task, gap, and report/list actions. Full report leads with the four user questions; has a compact score/scope banner, review tasks, all five use rows, mapped observations including percentages and project-impact unknown, evidence gaps, `unassessed`, and expandable raw source/assessment details. Compare aligns the same fields for 2–4 PINs and does not sort or recommend parcels by RAG.

- [ ] Add failing `presentation.test.ts` cases: Amber and Green meanings differ, Unrated is explicitly evidence-incomplete, top task/source is visible, report order is unchanged by RAG, and mismatched version/required-source coverage warns.
- [ ] Run `npm test -- src/lib/screening/presentation.test.ts`; expect missing module/function failure.
- [ ] Implement the three views and responsive CSS. Remove stale “major constraints,” zoning Green implying approval, and domain Red from percentage-only overlap. Keep links to original sources and the existing list/search navigation.
- [ ] Run `npm test -- src/lib/screening/presentation.test.ts`, `npm run build`, and `npm run lint`; expect all pass and no `report.score` UI references remain (`rg -n 'report\.score\b|easeScore' src/panel`).
- [ ] Commit locally: `git add src/panel src/App.css src/lib/screening && git commit -m "feat: present developer screening across views"`.

### Task 7: Bounded LLM explanation and fallback

**Files:** Modify `server/explanationCore.mjs`, `server/explanations.mjs`, `server/explanationCore.test.js`, `server/explanations.test.js`, `src/panel/ReportPage.tsx`; preserve `.env` and proxy secrets outside Git.

**Interfaces:** `explanationInput(report)` sends v3 version, canonical PIN, `screeningRag`, pathway summary, verified constraints, review tasks, gaps, and deterministic fallback. Server validation accepts only those facts and constrains model text to explanation of supplied claims; it cannot choose or change a grade. Returned task explanations reference stable task IDs. Failed API, budget exhaustion, malformed JSON, invented numerical claim, invented approval/prohibition, or mismatched IDs returns deterministic copy and raw facts.

- [ ] Write failing server tests for valid v3 input/output, unsupported invented number, approval/prohibition claim, unknown task ID, malformed model response, and daily budget exhaustion; add a report-side fallback test if a pure request mapper is extracted.
- [ ] Run `npm test -- server/explanationCore.test.js server/explanations.test.js`; expect new assertions fail.
- [ ] Update request schema, prompt, output validator, and report mapper; keep existing OpenAI-compatible endpoint and token-budget settings configurable.
- [ ] Run the two server tests and `npm run build`; expect all pass. Check `git status --short` to ensure no `.env` is staged.
- [ ] Commit locally: `git add server src/panel/ReportPage.tsx && git commit -m "feat: explain verified scorecard facts"`.

### Task 8: Real-parcel review set, documentation, and final verification

**Files:** Create `docs/verification/screening-v3-cases.md`; modify `docs/LDES_v2.3_parcel_screen.md` only to mark it historical and link a new `docs/LDES_v3_screening_scorecard.md`; update `docs/verification/real-parcel-cases.md` and relevant PRD/README references that describe the default grade. No invented expert judgment or statistical accuracy claim.

**Interfaces:** Review document records PIN, selected source snapshots/date, expected pathway/constraints/tasks/RAG, reason, and open question. Begin with existing verified parcel cases and the known CMU PIN; use live search to record the other three `5000 Forbes Ave` candidate PINs and assess each independently. Expand toward 12–20 varied real cases as evidence is available. Mark local planning/developer expert review as pending until a human actually performs it.

- [ ] Add a failing fixture-backed test or extend `scorecard.test.ts` for every currently available real PIN used in the review set, including duplicate-address independence and a missing-source case. Do not fabricate data to reach 12 cases.
- [ ] Run the fixture test; expect at least the newly asserted v3 case to fail before final adjustments.
- [ ] Add the v3 rule/source/copy documentation and the review ledger; update any implementation gaps the cases reveal.
- [ ] Run `npm test`, `npm run build`, `npm run lint`; expect zero failures. In the running app, manually check `5000 Forbes Ave` search → four choices → EMI report → compare with another PIN; check narrow viewport, LLM-on and forced-fallback report; record outcomes in the review ledger. Confirm no secret is tracked and `git diff --check` is clean.
- [ ] Commit locally: `git add docs src && git commit -m "docs: validate v3 parcel screening"`.

## Completion criteria

The default product shows v3 from search preview through comparison; every displayed RAG has a bounded meaning and visible basis; legacy tests and source details remain available; real CMU evidence produces the specified Amber interpretation; build, lint, tests, and browser checks pass. Local expert review is explicitly pending if no reviewer has yet examined the 12–20-case set. Stop after local verification and provide commit hashes plus remaining limitations; do not push or merge without the user's later instruction.
