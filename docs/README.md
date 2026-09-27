# Parcel Lens documents

Read **[LDES v2.3 parcel screening](LDES_v2.3_parcel_screen.md)** first. It describes the default no-scenario screen (`scoreVersion = LDES-v2.3-parcel-screen`).

Older files below are kept as history. They still mention 0–100 scores, letter-group zoning guesses, or “no score implemented.” Those descriptions are not the running app.

## Live product

| File | Role |
|---|---|
| [LDES_v2.3_parcel_screen.md](LDES_v2.3_parcel_screen.md) | Current default scoring contract |
| [plans/codex-use-table.md](plans/codex-use-table.md) | Phase 1 plan: verified §911.02 pathways for five housing uses |
| [plans/unlock-rated-headline.md](plans/unlock-rated-headline.md) | Follow-up plan: stop UNRATED headline when suitability is already rated |

## Historical / research (do not treat as live spec)

| File | Role |
|---|---|
| [Development_Ease_Score.md](Development_Ease_Score.md) | LDES v2.1 0–100 + RAG mix; **superseded** by v2.2 RAG |
| [LDES_v2.2_RAG.md](LDES_v2.2_RAG.md) | Historical scenario-based RAG rules; superseded for the default flow |
| [Development_Ease_Scoring_Proposal.md](Development_Ease_Scoring_Proposal.md) | Early methods memo (v0.2); predates the live engine |
| [Track1_Data_Assessment_and_PRD.md](Track1_Data_Assessment_and_PRD.md) | Track 1 PRD and data inventory |
| [Track1_Expert_Interview_Guide.md](Track1_Expert_Interview_Guide.md) | Expert interview guide |

## Code map

| Path | What it does |
|---|---|
| `src/data/pittsburgh-use-pathways-v1.ts` | Verified §911.02 cells (`codeAsOf` 2026-06-11) |
| `src/lib/housingPathways.ts` | GIS `zon_new` → `districtKey`; five-use lookup |
| `src/lib/ldes.ts` | Live GIS collection (POST polygon clip + point zoning fallback) |
| `src/lib/ldes/*.ts` | Zoning / environment / historic / potential / combine |
| `src/lib/score.ts` | `scoreEvidence` / `scoreSummary` |
| `src/panel/ParcelDetails.tsx` | Sidebar matrix and RAG chips |

Run `npm test` for historical fixtures and current parcel-screening cases.
