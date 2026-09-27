# Parcel Lens

Pittsburgh parcel screening prototype. Search by a 16-character county PIN, choose an address candidate, or click a map parcel. The browser retrieves all currently connected sources and shows five residential use pathways, zoning/environment/historic RAG results, original source links, missing evidence, and next checks. No advanced options or hidden unit-count scenario are required.

```bash
npm install
npm run dev
```

Try public PIN `0052G00030000000` (5051 Castleman St). A row-level `NOT_PERMITTED` and a parcel-level GREEN can coexist because the five housing uses are screened separately. PIN `0051N00300000000` is split-zoned and stays UNRATED. The report uses `LDES-v2.3-parcel-screen`.

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

The browser currently requests relative `/api/*` URLs. Vite's proxy supports local development and `vite preview`, while a plain static host does not provide those API routes. Before a public deployment, implement equivalent routes on the target host and verify each upstream and error state. See [deployment readiness](docs/verification/deployment-readiness.md). No backend database is needed for this local prototype; the score itself is a deterministic browser function.
