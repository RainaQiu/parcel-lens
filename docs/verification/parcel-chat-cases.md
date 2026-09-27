# Parcel Report Assistant acceptance cases

These cases verify the assistant against the product boundary. They can be run locally with `npm test`, `npm run build`, and the report page at `/parcels/0011M00060000000`.

| Case | Action | Expected result |
| --- | --- | --- |
| Report grounding | Open a report and ask “Why is this parcel rated this way?” | Answer repeats the current deterministic grade and points to a report section; it does not invent a new score. |
| Pathway lookup | Ask which residential paths are listed | Answer lists the checked base-district rows and states that dimensions, parking, access, overlays, and feasibility remain unassessed. |
| Project assumption | Open **Project assumptions**, choose a supported housing form, and provide units or footprint | The request includes the assumptions; a response may return `MATCH_FOUND`, `REVIEW_PATH`, `NO_LISTED_PATH`, or `INSUFFICIENT_DATA`. |
| Unsupported use | Ask whether the parcel can support a school, hospital, office, or commercial use | The answer is `OUT_OF_SCOPE` and identifies the missing use-specific zoning rules. |
| Report fallback | Remove `LLM_API_KEY`, exhaust the daily budget, or force a provider failure | The UI shows a deterministic report-facts answer and identifies that it is a fallback. |
| Web provenance | Enable web research and configure Tavily; ask a question that needs current external context | Any web-supported response includes a visible **Web-sourced** citation with URL, title, retrieval time, and provider. |
| Citation navigation | Select a report citation | The drawer closes and the report scroll target opens (`#overview`, `#drivers`, `#pathways`, `#unknowns`, or `#evidence`). |
| Privacy boundary | Inspect the request payload or prompt | Owner and mailing fields are absent; only the allowlisted report context is sent. |

## Local verification snapshot

- `npm test`: 25 files, 191 tests passed.
- `npm run build`: passed; Vite reports the existing `ParcelMap` chunk-size warning.
- `npm run lint`: passed.
- Browser smoke test: report loaded, assistant opened, a score question was submitted, and the UI displayed a grounded fallback answer with a report citation.
