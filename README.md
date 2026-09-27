# Parcel Lens

Pittsburgh parcel screening prototype. Search by a 16-character county PIN, choose an address candidate, or click a map parcel. The map shows a short preview; a full report opens at `/parcels/:pin`. Add up to four verified parcel IDs to a local saved list and compare them at `/compare?pins=...`. The browser retrieves the connected public sources and calculates the **LDES v3 preliminary screening RAG** deterministically. No advanced options or hidden unit-count scenario are required.

```bash
npm install
npm run dev
```

Try public PIN `0052P00130000000` (5000 Forbes Ave). It has an EMI residential use listing and a 2.208% mapped 25%+ slope overlap, which remains GREEN under the low-overlap screening threshold while keeping project impact visible as unknown. The report keeps financial feasibility unassessed. PIN `0051N00300000000` is split-zoned and stays UNRATED. The report uses `LDES-v3-screening-scorecard`.

Address example: `2633 fifth avenue` and `2633 5th ave` both return five distinct `2633 5TH AVE` parcel candidates. Choose the intended parcel ID; the app will not silently choose one address match. Common suffixes, numbered street names, and nearby typos are candidate-search aids, not proof of parcel identity.

```bash
npm test
npm run build
npm run lint
```

## Scope and data

The source boundary PIN is the canonical parcel ID. County assessment data provides the address and property facts; Pittsburgh GIS zoning is spatially clipped to the parcel and joined to the verified §911.02 use table. GIS layers for 25% slope, landslide-prone areas, undermined land, FEMA NFHL flood hazards, city/PASDA historic areas, and WPRDC violations/condemned records are queried automatically. Each report distinguishes available, no matching record, and unavailable sources. Source update dates are shown only when known; retrieval time is separate.

The headline is a scoped residential zoning and site screen. RED means none of the five checked housing uses has a verified listed path; mapped overlap percentage alone cannot make a parcel RED. It does not evaluate unit capacity, setbacks, height/FAR, parking, access, permits, professional geotechnical or floodplain determinations, land availability, costs, or financial feasibility. Project feasibility is `NOT_ASSESSED`. See the [v3 rule and review cases](docs/LDES_v3_screening_scorecard.md).

## Product documents

Start here: **[docs/README.md](docs/README.md)** (index), **[LDES v3 preliminary scorecard](docs/LDES_v3_screening_scorecard.md)** (live spec), and the [PRD](docs/Track1_Data_Assessment_and_PRD.md).

- [Team collaboration guide](CONTRIBUTING.md)
- [Track 1 PRD and data assessment](docs/Track1_Data_Assessment_and_PRD.md)
- [Housing expert interview guide](docs/Track1_Expert_Interview_Guide.md)

## Deployment

The browser requests relative `/api/*` URLs. Vite proxies public data during `npm run dev` and `npm run preview`; `npm run build && npm start` serves the built app, report/compare deep links, public-source proxies, and the explanation endpoint from one Node process (default port 4173, overridable with `PORT`). Deploy the Node server or equivalent same-origin routes; a plain static host cannot supply the APIs. See [deployment readiness](docs/verification/deployment-readiness.md). The score remains a deterministic browser function; no database is required for the local prototype.

## Optional AI explanations

Copy `.env.example` to `.env` and fill `LLM_API_KEY` **only after the API provider and deployment are ready**. `.env` is ignored by Git. The server reads it at startup, so restart the process after changing it. Do not put the key in a `VITE_` variable; those variables are exposed to browser bundles. With no key, an exhausted budget, a provider error, an invalid response, or a timeout, the full report still shows a deterministic plain-language summary and original evidence.

The template defaults to OpenCode Go's OpenAI-compatible `chat/completions` endpoint with `deepseek-v4.1-flash`. A real `5000 Forbes Ave` report returned a validated explanation in local testing with `LLM_MAX_OUTPUT_TOKENS=2500`. The cap includes the provider's internal reasoning tokens, so it is not the length of the text shown to the user. The [OpenCode Go documentation](https://opencode.ai/docs/go/#endpoints) lists the model and endpoint, and describes Go as intended for coding-agent traffic; check that your account permits end-user parcel explanations before enabling the key. `LLM_BASE_URL` and `LLM_MODEL` let the adapter use another compatible provider.

The service sends only v3 grade, pathway status, mapped observations, review tasks, evidence gaps, and rule/source identifiers. It does not send owner or mailing records. The model cannot change the grade; outputs with unknown task IDs, unknown gaps, unsupported approval claims, or new numeric claims are rejected. Requests are limited per IP and per day, and successful explanations are cached against their fact payload.

## Parcel report assistant

The full report includes an **Ask about this parcel** drawer. It accepts questions about the current report and optional residential project assumptions (housing form, units, stories, footprint, and land control). The assistant can return a project-specific pathway check, but it never changes the deterministic RAG, presents a pathway as a permit, or assesses cost, safety, or financial feasibility. School, hospital, commercial, and other non-residential questions remain explicitly out of scope until a verified use-specific rule table exists.

The drawer uses `/api/parcel-chat`. With no valid LLM response it returns a deterministic answer from the same report facts, so the feature remains usable when the key, budget, provider, or network is unavailable. Set `WEB_SEARCH_ENABLED=true` and configure the optional Tavily key only when external research is desired. Web results are passed to the model as separate evidence and rendered with a **Web-sourced** label, URL, title, provider, and retrieval time. The acceptance matrix is in [parcel report assistant cases](docs/verification/parcel-chat-cases.md).

The assistant also handles bounded general zoning definitions from the checked Pittsburgh reference pack. For example, `R1D-VL` is decomposed into the R1D and VL components and cited to the official zoning chapters; the answer still does not infer a permit, buildability, cost, or approval result. The browser requests SSE by default, renders validated answer text as it arrives, and falls back to the same deterministic answer if streaming or validation fails. Run `npm run evaluate:chat` against a running `npm start` server to smoke-test the stream, official citation, report grounding, and multi-turn context.
