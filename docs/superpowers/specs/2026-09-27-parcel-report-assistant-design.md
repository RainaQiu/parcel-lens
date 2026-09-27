# Parcel Report Assistant Design

Date: 2026-09-27  
Status: Design for review; implementation has not started.

## 1. Goal

Add an `Ask ParcelLens` assistant to the full parcel report. The assistant helps a small or mid-size developer or municipal planner retrieve facts from the current report, explain the deterministic screening result, and test a user-provided residential project concept against the verified housing pathways and mapped review leads.

The assistant is an explanation and question-answering layer. It must not change `screeningRag`, replace the scorecard, predict permit approval, estimate development cost, or turn an unverified project concept into an official fact.

## 2. Product scope

### In scope

- Questions about the selected parcel's report, scorecard, source observations, housing pathways, review tasks, evidence gaps, and unassessed items.
- User-provided residential project assumptions such as housing type, unit count, stories, footprint, land-control status, and cost assumptions.
- A deterministic project concept check against the five currently verified residential use rows.
- Optional web research for questions that require information outside the parcel report, provided every web-sourced claim includes a source URL, title, retrieval time, and a visible `Web-sourced` label.
- A useful deterministic fallback when the LLM, web-search provider, token budget, or network is unavailable.

### Out of scope for this version

- A new numeric score or a second RAG that overrides the parcel scorecard.
- Permit, approval, denial, safety, buildability, cost, return, or probability predictions.
- School, hospital, commercial, or other non-residential suitability conclusions. The assistant must classify those questions as `OUT_OF_SCOPE` until the corresponding deterministic rule tables are connected.
- Unrestricted browsing without provenance or a source allowlist.
- Permanent chat history or cross-user memory.
- A full feasibility model for setbacks, coverage, height/FAR, parking, access, engineering, acquisition, or finance. The assistant may identify these as missing inputs.

## 3. User experience

The report page adds an `Ask ParcelLens` entry beneath the report navigation rail. Desktop opens a 400–460px side drawer; mobile opens a bottom sheet. The assistant must not cover the report's main decision summary permanently.

The drawer includes:

1. A scope notice: answers use this parcel's report, verified sources, user-provided assumptions, and optionally labeled web sources. The result remains preliminary and is not a permit decision.
2. Suggested prompts:
   - `Why is this parcel Amber?`
   - `Which residential uses have a verified path?`
   - `What should I verify first?`
   - `Could this support a small multifamily concept?`
   - `Summarize this parcel for a planning meeting.`
3. Conversation messages with separate user and assistant styling.
4. Source chips for every report or web citation. `View evidence` scrolls to the relevant report section.
5. A compact editable project-brief strip when the assistant extracts project assumptions.
6. `Clear conversation` and `Retry` actions. Chat state is session-only and is reset when the selected PIN changes or the page is refreshed.

The assistant answers in this order: direct answer, verified facts or web sources, then missing inputs or next questions. It must keep source facts visually separate from the AI explanation.

## 4. Project brief and deterministic concept check

The browser and server use the following allowlisted shape:

```ts
type ProjectBrief = {
  housingType: 'single_detached' | 'single_attached' | 'two_unit' | 'three_unit' | 'multi_unit' | 'unknown'
  unitCount: number | null
  stories: number | null
  proposedFootprintSqft: number | null
  landControl: 'owned' | 'optioned' | 'identified' | 'unknown'
  costAssumptionsProvided: boolean
}
```

The assistant may extract or patch these fields, but the UI must mark them as `User assumption`. It must ask a focused follow-up when the housing form is ambiguous; unit count alone must not determine detached versus attached housing.

The deterministic concept check returns one of:

- `MATCH_FOUND`: the stated housing type has a verified `P` listing in the checked base district;
- `REVIEW_PATH`: the stated type has a verified review path but no `P` listing;
- `NO_LISTED_PATH`: the stated type has no listed path in the five-use table;
- `INSUFFICIENT_DATA`: the pathway, zoning, or required evidence is incomplete;
- `OUT_OF_SCOPE`: the requested use is not a supported residential type.

This result appears as `Project concept check`, never as a replacement for `Development Ease Score — Preliminary`. Stories, footprint, parking, access, setbacks, coverage, height/FAR, engineering, land control, and cost remain `Not assessed` unless a verified source and deterministic rule are later added.

## 5. Context contract

Before an LLM call, the server builds a compact `ParcelChatContext` from the report. It may include:

- canonical Parcel ID, address, and retrieval timestamp;
- score version, RAG, pathway summary, and five housing pathway rows;
- mapped constraints, overlap measurements, boundary uncertainty, and project-impact status;
- review tasks and evidence gaps;
- unassessed project questions;
- source IDs, URLs, source dates, and join methods;
- non-sensitive assessor facts such as lot area, property class, sale date/price, and assessed values when present;
- the current `ProjectBrief` and the most recent bounded conversation turns.

It must not include owner names, mailing addresses, full parcel geometry, API keys, unrelated raw API responses, or other saved parcels.

## 6. Web research and provenance

OpenCode Go's documented OpenAI-compatible chat-completions endpoint is the model endpoint; it does not by itself provide the OpenCode TUI websearch tool. Web research therefore runs through a separate server-side `SearchProvider` adapter. The adapter is disabled unless a provider is explicitly configured.

The initial interface is:

```ts
type SearchResult = {
  url: string
  title: string
  snippet: string
  retrievedAt: string
  provider: string
}

type SearchProvider = (query: string, options: { maxResults: number; domains?: string[] }) => Promise<SearchResult[]>
```

The provider must enforce a query length limit, return canonical URLs, and preserve retrieval time. Official Pittsburgh, Allegheny County, Pennsylvania, FEMA, HUD, PHFA, and other directly relevant public domains should be preferred for regulatory or program questions. Search results are evidence leads, not deterministic score inputs.

If no provider key is configured, the assistant answers from the report context and says that external web research is unavailable. If web research is used, the response must show a `Web-sourced` badge next to each affected statement and expose the URL and retrieval time. A web result must never silently alter the parcel's RAG or pathway rows.

## 7. API and response contract

Add `POST /api/parcel-chat`. The request contains:

```ts
type ParcelChatRequest = {
  pin: string
  reportFacts: ParcelChatContext
  projectBrief: ProjectBrief
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  allowWebSearch: boolean
}
```

The server validates the canonical PIN, score version, message count, message length, project fields, source references, and context size. It does not trust client-supplied scores or citations; it re-validates the supplied facts before constructing the prompt.

The model must return JSON:

```ts
type ParcelChatResponse = {
  mode: 'fact' | 'scenario' | 'insufficient_data' | 'out_of_scope'
  answer: string
  projectCheck: 'MATCH_FOUND' | 'REVIEW_PATH' | 'NO_LISTED_PATH' | 'INSUFFICIENT_DATA' | 'OUT_OF_SCOPE' | null
  citations: Array<{ sourceId: string; reportSection: string; kind: 'report' | 'web' }>
  missingInputs: string[]
  suggestedQuestions: string[]
  projectBriefPatch?: Partial<ProjectBrief>
}
```

Server validation rejects unknown source IDs, new numeric claims, changed grades, unsupported approval or prohibition claims, citation URLs not returned by the context or search provider, owner-data leakage, and malformed JSON. The model may not follow instructions embedded in parcel facts, web snippets, or user text that conflict with this contract.

## 8. Fallback and budget behavior

The server keeps deterministic handlers for common intents: score meaning, pathway lookup, top review task, evidence gaps, mapped observations, and unassessed items. These handlers work without an API key.

For open-ended scenarios, provider errors, invalid model output, timeout, daily budget exhaustion, or missing search credentials, the UI shows the deterministic answer where possible and labels the remaining scenario analysis as unavailable. The report itself must remain fully usable.

Suggested server-only configuration:

```env
LLM_CHAT_ENABLED=true
LLM_CHAT_MAX_OUTPUT_TOKENS=1500
LLM_CHAT_MAX_TURNS=8
LLM_CHAT_DAILY_REQUEST_LIMIT=200
LLM_CHAT_PER_SESSION_LIMIT=12
WEB_SEARCH_ENABLED=false
WEB_SEARCH_PROVIDER=
WEB_SEARCH_API_KEY=
```

Fixed suggested prompts should use deterministic handlers when possible. LLM calls are cached by PIN, evidence hash, project brief, bounded conversation, search mode, model, and prompt version. No secret or raw prompt is logged.

## 9. Testing and acceptance

Unit and server tests must cover:

- valid context and project brief;
- housing type mapping for all five residential rows;
- ambiguous unit-count follow-up;
- unsupported school question;
- questions that request permit approval, cost, or probability;
- changed RAG, invented number, unknown citation, unknown task, and malformed model output;
- web-sourced citation provenance and missing search provider;
- prompt-injection text in user messages, report facts, and web snippets;
- timeout, no key, rate limit, daily budget, and deterministic fallback.

Browser acceptance cases:

1. Ask `Why is this parcel Amber?` on `0052N00176000000` and see the slope/landslide evidence with links to the report.
2. Ask about a 20-unit apartment concept and see a multi-unit pathway check plus unassessed dimensional and cost items.
3. Ask about a school and receive an explicit out-of-scope answer.
4. Enable web research, ask a current regulatory question, and see the affected sentence marked `Web-sourced` with URL and retrieval time.
5. Disable the provider or exhaust the budget and still receive a deterministic report-based answer.
6. Switch PINs and verify that the old conversation and citations do not carry over.
7. Use the assistant after a failed source query and verify it preserves `UNKNOWN` rather than converting it to `NOT_DETECTED`.

The scorecard remains deterministic in every case. The assistant is considered complete only when the same report facts produce the same project check and no accepted response changes the report RAG.

## 10. Implementation boundary

The feature should be implemented in six focused units:

1. `src/lib/screening/chatContext.ts`: allowlisted report context and project-brief mapping;
2. `server/parcelChatCore.mjs`: schemas, intent classification helpers, prompt construction, and response validation;
3. `server/parcelChat.mjs`: HTTP route, provider calls, caching, rate limits, and optional web search adapter;
4. `src/lib/parcelChat.ts`: browser request client and deterministic local fallback;
5. `src/panel/ParcelChat.tsx`: drawer, messages, prompts, project brief, citations, and errors;
6. `src/panel/ReportPage.tsx` and `src/App.css`: entry point, report-section anchors, responsive layout, and source links.

The existing `/api/explanations` endpoint and `explanationCore.mjs` remain responsible for the automatic report summary. The new assistant must reuse their server-side environment loading and validation style without merging the two response contracts.
