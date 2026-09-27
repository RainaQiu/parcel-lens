# Parcel Lens

Interactive Pittsburgh parcel screening prototype. Select a live county parcel and review public facts plus an LDES v2.2 RAG screen (green / amber / red / unrated). It is not a permit, financial, or overall development-feasibility decision.

```bash
npm install
npm run dev
npm test
```

Current scoring: verified §911.02 housing pathways, GIS polygon clips, and a headline that uses already-rated suitability. Development potential stays unrated until bulk/parking/overlay dimensions are encoded.

## Product documents

Start here: **[docs/README.md](docs/README.md)** (index) and **[LDES v2.2 RAG](docs/LDES_v2.2_RAG.md)** (live spec).

- [Team collaboration guide](CONTRIBUTING.md)
- [LDES v2.1 rubric (historical)](docs/Development_Ease_Score.md)
- [Track 1 PRD and data assessment](docs/Track1_Data_Assessment_and_PRD.md)
- [Housing expert interview guide](docs/Track1_Expert_Interview_Guide.md)

Work lives on branch `feat/ldes-rag-use-pathways` until it is pushed/PR’d.
