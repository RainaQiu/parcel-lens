# Deployment readiness — local integration, 2026-09-27

The browser score is deterministic and needs no score server. It does require a same-origin API proxy or equivalent serverless routes for its live public sources. `npm run dev` and local `npm run preview` use Vite's proxy configuration; a plain static server serving `dist/` returned HTTP 404 for `/api/parcels/query` in a local check. A production host must supply the routes below. No target platform or domain has been chosen, so production behavior remains unverified.

| Browser path | Upstream | Purpose |
|---|---|---|
| `/api/parcels/*` | `https://gisdata.alleghenycounty.us/arcgis/rest/services/OPENDATA/Parcels/MapServer/0/*` | Boundary geometry and canonical PIN |
| `/api/ckan/*` | `https://data.wprdc.org/api/3/action/*` | Assessment, violations, condemned records |
| `/api/zoning/*` | `https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/PGHWebZoning/FeatureServer/0/*` | Centroid fallback and map use |
| `/api/pgh/{service}/*` | `https://services1.arcgis.com/YZCmUqbcsUpOKfj7/arcgis/rest/services/{service}/FeatureServer/0/*` | Zoning, slope, landslide, undermined, historic polygons |
| `/api/pasda/{layer}/*` | `https://mapservices.pasda.psu.edu/server/rest/services/pasda/PittsburghCity/MapServer/{layer}/*` | Historic-site polygon |
| `/api/fema/*` | `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/*` | Flood polygons |

Route behavior must preserve GET query strings and POST `application/x-www-form-urlencoded` bodies, return JSON errors as failures, and enforce timeouts. A source failure should become `unavailable` in the report while successful sources remain visible. Verify response content type and CORS behavior on the actual target domain, including direct PIN lookup, polygon POSTs, an address candidate lookup, and a deliberately failed upstream. Bound request sizes and cache only with a visible freshness policy. Do not expose credentials in the client or proxy logs.

Local check: `npm run preview` on `127.0.0.1:4173` returned GeoJSON for `/api/parcels/query`; `python -m http.server --directory dist` on `127.0.0.1:4174` returned 404 for the same path. Thus Vite preview is useful for a build smoke test, but does not prove an arbitrary static deployment will resolve `/api/*`.
