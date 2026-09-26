# Parcel Lens

Interactive Pittsburgh parcel screening prototype. Select a live county parcel, enter a housing scenario, and review available public facts, evidence gaps, sources, and next steps in one map workspace.

```bash
npm install
npm run dev
```

The screening panel deliberately shows **“Data insufficient to score”**. The app currently has a zoning lookup at one point, but no full parcel zoning intersection, verified use-rule engine, steep-slope overlap, or approved scoring formula. It does not claim a permit, financial, or development feasibility decision. The four reading focuses change next-step guidance only; they do not change parcel facts.

## Product documents

- [Team collaboration guide](CONTRIBUTING.md)
- [Track 1 PRD and data assessment](docs/Track1_Data_Assessment_and_PRD.md)
- [Housing expert interview guide](docs/Track1_Expert_Interview_Guide.md)

The PRD distinguishes verified sources, an initial subject-matter expert reply, and product assumptions that still need validation.
