# Deployment readiness — local integration, 2026-09-27

The browser score is deterministic and needs no score server. It does require same-origin API routes for its live public sources. `npm run dev` and local `npm run preview` use Vite proxies. `npm run build && npm start` now serves the built app and the routes below from `server/index.mjs`; a plain static server serving `dist/` still cannot. No target platform or domain has been chosen, so a hosted deployment remains unverified.

| Browser path | Upstream | Purpose |
|---|---|---|
| `/api/parcels/*` | `https://gisdata.alleghenycounty.us/arcgis/rest/services/OPENDATA/Parcels/MapServer/0/*` | Boundary geometry and canonical PIN |
| `/api/ckan/*` | `https://data.wprdc.org/api/3/action/*` | Assessment, violations, condemned records |
| `/api/zoning/*` | `https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebZoning/FeatureServer/0/*` | Centroid fallback and map use |
| `/api/pgh/{service}/*` | `https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/{service}/FeatureServer/0/*` | Zoning, slope, landslide, undermined, historic polygons |
| `/api/pasda/{layer}/*` | `https://mapservices.pasda.psu.edu/server/rest/services/pasda/PittsburghCity/MapServer/{layer}/*` | Historic-site polygon |
| `/api/fema/*` | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/*` | Flood polygons |
| `/api/explanations` | Configured server-side OpenAI-compatible provider | Optional explanation only; deterministic report fallback on any failure |
| `/api/parcel-chat` | Configured server-side OpenAI-compatible provider | Parcel report assistant; accepts JSON and SSE (`Accept: text/event-stream`), with deterministic fallback on any failure |

Route behavior must preserve GET query strings and POST `application/x-www-form-urlencoded` bodies, return JSON errors as failures, and enforce timeouts. A source failure should become `unavailable` in the report while successful sources remain visible. Verify response content type and CORS behavior on the actual target domain, including direct PIN lookup, polygon POSTs, an address candidate lookup, and a deliberately failed upstream. Bound request sizes and cache only with a visible freshness policy. Do not expose credentials in the client or proxy logs.

Local check: `npm run preview` on `127.0.0.1:4173` returned GeoJSON for `/api/parcels/query`; `python -m http.server --directory dist` on `127.0.0.1:4174` returned 404 for the same path. Thus Vite preview is useful for a build smoke test, but does not prove an arbitrary static deployment will resolve `/api/*`.

New local Node-server check on 2026-09-27: `/parcels/0011M00060000000` returned the SPA and loaded the real report; `/api/ckan/datastore_search` returned 47 records for house number 2633; `/api/explanations` returned 503 with no key and the report displayed its source-based fallback. Repeat these checks on the actual hosted domain, including a live explanation only after a key and provider eligibility are confirmed.

Parcel assistant deployment check: set `LLM_CHAT_STREAMING_ENABLED=true` to allow browser SSE. The server emits `start`, sentence-safe `delta`, and one validated `complete` or `fallback` event. Keep `LLM_CHAT_MAX_OUTPUT_TOKENS` between 300 and 2500; the default is 1500. The client still accepts a JSON response for compatibility with a proxy that buffers streams. `LLM_CHAT_DAILY_REQUEST_LIMIT`, `LLM_CHAT_PER_SESSION_LIMIT`, and `LLM_CHAT_PER_IP_LIMIT` bound usage. The optional web search adapter is disabled unless `WEB_SEARCH_ENABLED=true`; web claims are only shown when the server returns a validated URL, title, provider, and retrieval time.
