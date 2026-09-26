# Parcel Lens

Interactive Pittsburgh parcel screening prototype. The report-first workspace keeps parcel search, scenario input, evidence and next steps in a resizable left panel beside the map.

```bash
npm install
npm run dev
```

## Guided mock use case

1. Click **Load demo parcel** to select the invented `DEMO-PL-001` site and its preset two-unit duplex scenario.
2. Click **Run early screening**. The illustrative report displays an Amber zoning/site grade, its rule version, a synthetic flood overlay and follow-up actions.
3. Toggle **Flood review overlay** on the map. Drag the divider to give the report more or less width on desktop.
4. Click **Pin for comparison**. Enter `DEMO-PL-002` in the search box (or use its shortcut), run screening again and open **Compare A / B**. The two invented parcels use the same scenario and mock rubric; the second is Green because its invented parcel does not intersect the invented flood shape.

**All demo geometry, zoning assumptions, grades and layer versions are synthetic.** They are not FEMA or City findings. The comparison is illustrative, not a ranking of real development opportunities.

Live county parcels remain **“Unrated — evidence incomplete”**. The app currently has a zoning lookup at one point, but no full parcel zoning intersection, verified use-rule engine or official flood/steep-slope overlap. It does not claim a permit, financial or overall development feasibility decision. Different reading focuses change next-step guidance only, not parcel facts or grades.

## Product documents

- [Team collaboration guide](CONTRIBUTING.md)
- [Track 1 PRD and data assessment](docs/Track1_Data_Assessment_and_PRD.md)
- [Housing expert interview guide](docs/Track1_Expert_Interview_Guide.md)
- [Development Ease rating method and validation plan](docs/Development_Ease_Scoring_Proposal.md)

The PRD distinguishes verified sources, an initial subject-matter expert reply, and product assumptions that still need validation.
