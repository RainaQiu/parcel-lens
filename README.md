# Parcel Lens

Pittsburgh parcel screening prototype. Search by a 16-character county PIN, choose an address candidate, or click a map parcel. The map shows a short preview; a full report opens at `/parcels/:pin`. Add up to four verified parcel IDs to a local saved list and compare them at `/compare?pins=...`. The browser retrieves the connected public sources and calculates LDES v2.3 deterministically. No advanced options or hidden unit-count scenario are required.

```bash
npm install
npm run dev
```

Try public PIN `0052G00030000000` (5051 Castleman St). A row-level `NOT_PERMITTED` and a parcel-level GREEN can coexist because the five housing uses are screened separately. PIN `0051N00300000000` is split-zoned and stays UNRATED. The report uses `LDES-v2.3-parcel-screen`.

Address example: `2633 fifth avenue` and `2633 5th ave` both return five distinct `2633 5TH AVE` parcel candidates. Choose the intended parcel ID; the app will not silently choose one address match. Common suffixes, numbered street names, and nearby typos are candidate-search aids, not proof of parcel identity.

```bash
npm test
npm run build
npm run lint
```

## Scope and data

The source boundary PIN is the canonical parcel ID. County assessment data provides the address and property facts; Pittsburgh GIS zoning is spatially clipped to the parcel and joined to the verified §911.02 use table. GIS layers for 25% slope, landslide-prone areas, undermined land, FEMA NFHL flood hazards, city/PASDA historic areas, and WPRDC violations/condemned records are queried automatically. Each report distinguishes available, no matching record, and unavailable sources. Source update dates are shown only when known; retrieval time is separate.

The headline is a scoped suitability screen. It does not evaluate unit capacity, setbacks, height/FAR, parking, access, permits, professional geotechnical or floodplain determinations, or financial feasibility. Development potential remains UNRATED. Four public [regression parcels](docs/verification/real-parcel-cases.md) show the current rule boundaries.

## Product documents

Start here: **[docs/README.md](docs/README.md)** (index), **[LDES v2.3 parcel screening](docs/LDES_v2.3_parcel_screen.md)** (live spec), and the [PRD](docs/Track1_Data_Assessment_and_PRD.md).

- [Team collaboration guide](CONTRIBUTING.md)
- [LDES v2.1 rubric (historical)](docs/Development_Ease_Score.md)
- [Track 1 PRD and data assessment](docs/Track1_Data_Assessment_and_PRD.md)
- [Housing expert interview guide](docs/Track1_Expert_Interview_Guide.md)

## Deployment

The browser requests relative `/api/*` URLs. Vite proxies public data during `npm run dev` and `npm run preview`; `npm run build && npm start` serves the built app, report/compare deep links, public-source proxies, and the explanation endpoint from one Node process (default port 4173, overridable with `PORT`). Deploy the Node server or equivalent same-origin routes; a plain static host cannot supply the APIs. See [deployment readiness](docs/verification/deployment-readiness.md). The score remains a deterministic browser function; no database is required for the local prototype.

## Optional AI explanations

Copy `.env.example` to `.env` and fill `LLM_API_KEY` **only after the API provider and deployment are ready**. `.env` is ignored by Git. The server reads it at startup, so restart the process after changing it. Do not put the key in a `VITE_` variable; those variables are exposed to browser bundles. With no key, an exhausted budget, a provider error, an invalid response, or a timeout, the full report still shows a deterministic plain-language summary and original evidence.

The template defaults to OpenCode Go's OpenAI-compatible `chat/completions` endpoint with `glm-5.3-flash`. Its [documentation](https://opencode.ai/docs/go/#endpoints) lists that model and endpoint, but also describes Go as intended for coding-agent traffic. Confirm that your account is permitted to use it for end-user parcel explanations before enabling the key. The `LLM_BASE_URL` and `LLM_MODEL` variables make the adapter replaceable with another compatible provider.

The service sends only score drivers, missing-evidence labels, rule versions, and source identifiers/values. It does not send owner or mailing records. The model cannot change the score; outputs with unknown driver IDs, unknown gaps, or new numeric claims are rejected. Requests are limited per IP and per day, and successful explanations are cached against their fact payload.
