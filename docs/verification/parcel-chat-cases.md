# Parcel Report Assistant acceptance cases

These cases verify the assistant against the product boundary. They can be run locally with `npm test`, `npm run build`, and the report page at `/parcels/0011M00060000000`.

| Case | Action | Expected result |
| --- | --- | --- |
| Report grounding | Open a report and ask “Why is this parcel rated this way?” | Answer repeats the current deterministic grade and points to a report section; it does not invent a new score. |
| General zoning definition | Ask “What does the R1D-VL zoning mean?” on any report | Answer explains the official R1D and VL components, links the official Pittsburgh zoning reference, and states that the code alone is not a permit or project feasibility decision. |
| Multi-turn follow-up | Ask a zoning definition question, then ask how it affects the current parcel | The second answer receives the bounded conversation context and connects the definition to the report without changing the deterministic grade. |
| Pathway lookup | Ask which residential paths are listed | Answer lists the checked base-district rows and states that dimensions, parking, access, overlays, and feasibility remain unassessed. |
| Project assumption | Open **Project assumptions**, choose a supported housing form, and provide units or footprint | The request includes the assumptions; a response may return `MATCH_FOUND`, `REVIEW_PATH`, `NO_LISTED_PATH`, or `INSUFFICIENT_DATA`. |
| Unsupported use | Ask whether the parcel can support a school, hospital, office, or commercial use | The answer is `OUT_OF_SCOPE` and identifies the missing use-specific zoning rules. |
| Report fallback | Remove `LLM_API_KEY`, exhaust the daily budget, or force a provider failure | The UI shows a deterministic report-facts answer and identifies that it is a fallback. |
| Web provenance | Enable web research and configure Tavily; ask a question that needs current external context | Any web-supported response includes a visible **Web-sourced** citation with URL, title, retrieval time, and provider. |
| Citation navigation | Select a report citation | The drawer closes and the report scroll target opens (`#overview`, `#drivers`, `#pathways`, `#unknowns`, or `#evidence`). |
| Privacy boundary | Inspect the request payload or prompt | Owner and mailing fields are absent; only the allowlisted report context is sent. |
| Streaming lifecycle | Submit a question while the API advertises `text/event-stream` | The UI shows sentence-safe answer deltas, keeps the current conversation readable, and ends on one validated `complete` or `fallback` event. |
| Stop and retry | Start a response, choose **Stop generating**, then choose **Retry last answer** | The in-flight request is aborted without losing prior turns; retry removes the incomplete turn and starts one fresh request. |

## Automated smoke evaluation

After `npm run build && npm start`, run `npm run evaluate:chat` in a second terminal. Set `PARCEL_CHAT_URL` when the server is not on the default `http://127.0.0.1:4173/api/parcel-chat`. The evaluator exercises a general R1D-VL definition, a report-grounded question, and a multi-turn follow-up. It requires an official citation for the zoning definition and a terminal SSE event for every case. It works with the deterministic fallback, so it does not consume an LLM request when no key is configured.

## Local verification snapshot

- `npm test`: 29 files, 228 tests passed.
- `npm run build`: passed; Vite reports the existing `ParcelMap` chunk-size warning.
- `npm run lint`: passed.
- `npm run evaluate:chat`: requires a running local Node server and verifies the SSE endpoint and three representative questions.
- Browser smoke test: report loaded, assistant opened, a score question was submitted, and the UI displayed a grounded fallback answer with a report citation.
