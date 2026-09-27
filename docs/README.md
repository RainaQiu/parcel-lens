# Parcel Lens documents

Read **[LDES v3 preliminary scorecard](LDES_v3_screening_scorecard.md)** first. It describes the default no-scenario screen (`scoreVersion = LDES-v3-screening-scorecard`).

## Live product

| File | Role |
|---|---|
| [LDES_v3_screening_scorecard.md](LDES_v3_screening_scorecard.md) | Current default scoring contract |
| [verification/screening-v3-cases.md](verification/screening-v3-cases.md) | V3 public parcel checks and pending expert review |
| [verification/deployment-readiness.md](verification/deployment-readiness.md) | API routes and production checks |
| [verification/parcel-chat-cases.md](verification/parcel-chat-cases.md) | Parcel report assistant acceptance cases |

## Research (do not treat as live spec)

| File | Role |
|---|---|
| [Track1_Data_Assessment_and_PRD.md](Track1_Data_Assessment_and_PRD.md) | Track 1 PRD and data inventory |
| [Track1_Expert_Interview_Guide.md](Track1_Expert_Interview_Guide.md) | Expert interview guide |

## Code map

| Path | What it does |
|---|---|
| `src/data/pittsburgh-use-pathways-v1.ts` | Verified §911.02 cells (`codeAsOf` 2026-06-11) |
| `src/lib/housingPathways.ts` | GIS `zon_new` → `districtKey`; five-use lookup |
| `src/lib/ldes.ts` | Live GIS collection (POST polygon clip + point zoning fallback) |
| `src/lib/ldes/*.ts` | Zoning / environment / historic / potential / combine |
| `src/lib/screening/*.ts` | Current v3 pathway, mapped evidence, review-task, and RAG rules |
| `src/lib/score.ts` | Historical v2.3 scoring regression API |
| `src/panel/ReportPage.tsx` | Current full report and source details |

Run `npm test` for historical fixtures and current parcel-screening cases.
