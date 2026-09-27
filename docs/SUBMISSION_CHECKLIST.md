# Parcel Lens submission checklist

Use this page to fill the final AI Horizons 2026 submission form. The only missing item should be the public 3-5 minute demo video link.

## Track and project information

| Form field | Current answer |
|---|---|
| Which Track Are You Submitting To? | Development Feasibility & Pro Forma Navigator / Track 1 Policy to Permit |
| Project title | Parcel Lens |
| Live app link | https://parcel-lens.jessexu.me/ |
| Public repository link | https://github.com/RainaQiu/parcel-lens |
| Demo video link | TODO: add the public YouTube or viewable video link after recording |
| Team name | TODO: fill final team name |
| Team members | TODO: fill all member names, emails, and schools or organizations |
| Over 18 attestation | Confirm that all team members are 18 or older before submitting |

## Project description

Parcel Lens is an early-stage screening tool for Pittsburgh parcels. It helps small and mid-size developers and municipal planners decide whether a parcel is worth the next round of human due diligence and what should be verified first.

Users can search by address, search by Parcel ID, or click a parcel on the map. The app keeps Parcel ID as the canonical identity, shows address candidates when one address maps to multiple parcels, opens a full parcel report, and lets users save up to four parcels for side-by-side comparison.

The report combines public parcel, zoning, environmental, historic, and record evidence into a deterministic LDES v3 preliminary screening grade: GREEN, AMBER, RED, or UNRATED. The grade is traceable to the scoring rubric and the underlying public sources. The LLM assistant does not assign or change the score. It explains the report, answers bounded zoning questions, uses optional project assumptions supplied by the user, and falls back to deterministic report facts when the LLM or search provider is unavailable.

If we continued building Parcel Lens, we would validate the scorecard with local housing and planning practitioners, add project-specific scenario checks for starter homes once the user provides housing type and scale, improve data quality monitoring for public sources, and harden deployment for a planning department, nonprofit developer, or community organization.

## Data sources used

| Source | How Parcel Lens uses it |
|---|---|
| Allegheny County parcel boundary service (`https://gisdata.alleghenycounty.us/arcgis/rest/services/OPENDATA/Parcels/MapServer/0`) | Canonical Parcel ID lookup, parcel polygon, map selection, and polygon-based spatial joins. |
| Allegheny County Property Assessments via WPRDC CKAN resource `65855e14-549e-4992-b5be-d629afc676fa` | Address search, address candidate selection, parcel facts, municipality check, and property context. |
| Pittsburgh PGHWebZoning ArcGIS layer (`https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebZoning/FeatureServer/0`) | Parcel zoning, zoning map colors, base district lookup, and zoning evidence for the scorecard. |
| Pittsburgh Zoning Code Section 911.02 (`https://ecode360.com/45476784`) | Verified residential use pathway table for the five checked housing uses. |
| Pittsburgh Code Chapters 902 and 903 (`https://ecode360.com/45474093`, `https://ecode360.com/45474194`) | Official zoning reference pack for bounded assistant definitions such as `R1D-VL`. |
| Pittsburgh PGHWebSlope25 ArcGIS layer | 25%+ steep slope polygon overlap and mapped constraint tasks. |
| Pittsburgh PGHWebLandslideProne ArcGIS layer | Landslide-prone polygon overlap and mapped constraint tasks. |
| Pittsburgh PGHWebUndermined ArcGIS layer | Undermined-area polygon overlap and mapped constraint tasks. |
| FEMA National Flood Hazard Layer (`https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28`) | Flood category, floodway, SFHA, and 0.2% annual-chance flood overlap checks. |
| Pittsburgh CHD historic districts ArcGIS layer | Historic district overlap checks. |
| PASDA Pittsburgh City MapServer layer 12 (`https://mapservices.pasda.psu.edu/server/rest/services/pasda/PittsburghCity/MapServer/12`) | Individual historic site overlap checks. |
| WPRDC PLI violations resource `70c06278-92c5-4040-ab28-17671866f81c` | Active and closed violation context linked by parcel identifiers. |
| WPRDC condemned properties resource `0a963f26-eb4b-4325-bbbc-3ddf6a871410` | Active condemnation context linked by parcel identifiers. |
| Optional Tavily web search API | Used only when web research is enabled by configuration and the user allows web research in the parcel assistant. Web-sourced content is labeled separately with URL, title, provider, and retrieval time. |

## AI tool disclosure

| Tool | How it was used |
|---|---|
| OpenAI Codex | Helped plan the product architecture, implement frontend and server features, refactor documentation, write tests, review scorecard logic, and prepare submission materials. Human team members reviewed and directed the work. |
| OpenCode Go / OpenAI-compatible LLM API | Powers optional parcel report explanations and parcel assistant answers. The model receives only structured report facts, official reference snippets, user-supplied project assumptions, and optional labeled web results. It cannot assign or change the deterministic parcel grade. |
| Optional Tavily search API | Supplies web results only when enabled and requested. Web results are treated as separate evidence and are rendered with a Web-sourced label. |

## Repository and documentation map

| Path | Purpose |
|---|---|
| `README.md` | Main project overview, setup, deployment, AI explanation notes, and assistant behavior. |
| `docs/LDES_v3_screening_scorecard.md` | Live deterministic scoring contract and limitations. |
| `docs/Track1_Data_Assessment_and_PRD.md` | Product requirements and data assessment background. |
| `docs/verification/screening-v3-cases.md` | Scorecard review cases and expected behavior. |
| `docs/verification/parcel-chat-cases.md` | Parcel assistant acceptance cases. |
| `.env.example` | Server-only LLM, chat, streaming, and optional web search configuration. |

## Known limitations

- The screening grade is a preliminary zoning and site screen, not a permit approval, engineering determination, cost estimate, financial feasibility result, or investment recommendation.
- The scorecard does not assess unit capacity, setbacks, height, FAR, parking, access, buildable footprint, land control, acquisition likelihood, construction cost, or pro forma feasibility.
- A mapped polygon overlap does not prove that a proposed building footprint is affected. It identifies a review lead.
- GREEN means no targeted issue was found within the checked scope. It does not guarantee that a project can be built or approved.
- RED means a major screening issue or no listed residential pathway was found. It does not mean development is impossible.
- UNRATED means required evidence is incomplete or unresolved. It is not safer than RED.
- The LLM assistant explains evidence and answers bounded questions. It does not create new parcel facts, override the scorecard, or replace professional planning, legal, engineering, floodplain, or financial review.
- External web research is optional. When used, web-sourced content is labeled separately and does not change the deterministic score.

## Final submission items

| Item | Status |
|---|---|
| Team name | TODO |
| Three member names, emails, and schools or organizations | TODO |
| Track selection | Ready |
| Project title | Ready |
| Project description | Ready |
| 3-5 minute demo video link | TODO |
| Live app URL | Ready |
| Public repository URL | Ready |
| Data sources list | Ready |
| AI tool disclosure | Ready |
| Over 18 attestation | Confirm before submit |
