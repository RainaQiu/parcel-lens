# Parcel Assistant V2 Design

Date: 2026-09-27
Status: Ready for review

## 1. Goal

Improve ParcelLens Assistant so it can answer both parcel-specific questions and stable, general Pittsburgh zoning questions, preserve meaning across follow-up turns, and stream useful answers without weakening source validation or the deterministic scorecard.

The primary users remain small and mid-size developers and municipal planners. Answers should help them understand the current parcel, decide whether further due diligence is worthwhile, and identify the next verification step.

## 2. Problems in the current implementation

- Only the latest user question is included in the model prompt, so follow-up references such as “that district” or “what about a duplex?” lose their context.
- The prompt defines restrictions but does not define an audience-aware answer structure or adaptive depth.
- General questions such as “What does R1D-VL zoning mean?” are absent from the parcel report and therefore receive generic or fallback answers.
- Official zoning references are not represented as a first-class evidence type; citations support only report facts and ad hoc web results.
- Any provider error or rejected structured response silently becomes a narrow keyword-based fallback.
- The endpoint waits for the entire JSON response before rendering any answer.
- The repository has a local `/api/parcel-chat` route but no `api/parcel-chat.js` serverless entry point for Vercel.

## 3. Answer sources and precedence

The assistant uses four evidence layers in this order:

1. **Parcel report facts:** the deterministic scorecard, pathways, mapped observations, evidence gaps, assessor fields, and connected report sources.
2. **Official zoning reference:** a small versioned dictionary derived from official Pittsburgh Code Chapters 902, 903, and 911. It explains district-code components, use and development subdistrict names, and source links. It does not independently change the parcel score.
3. **User assumptions:** housing type, units, stories, footprint, land control, cost assumptions, and facts stated in conversation. They are labeled assumptions and never promoted to official facts.
4. **Web results:** used only when web research is allowed and the first three layers cannot answer a current or external question. Every supported sentence is labeled `Web-sourced` and cites its exact search result.

The first official reference version must include all district codes already recognized by ParcelLens and the five residential density suffixes. For example, `R1D-VL` decomposes into `R1D` (Single-Unit Detached Residential use subdistrict) and `VL` (Very Low-Density development subdistrict). A definition must also say that permitted uses and project standards require the applicable use table, site standards, overlays, and parcel-specific review.

Official source seeds:

- Chapter 902, Zoning Districts in General: `https://ecode360.com/45474093`
- Chapter 903, Residential Zoning Districts: `https://ecode360.com/45474194`
- Chapter 911, Primary Uses: `https://ecode360.com/45476600`

## 4. Intent and answer behavior

The server classifies each question into one of these internal intents:

- `parcel_fact`: asks about the current score, evidence, pathways, property record, or report section.
- `zoning_reference`: asks what a zoning code, zoning term, pathway symbol, or stable official concept means.
- `project_scenario`: asks about a user-provided housing concept on the current parcel.
- `current_external`: asks for current rules, programs, policies, or facts outside the bundled references.
- `unsupported_suitability`: asks ParcelLens to decide suitability for a use whose deterministic rules are not connected, such as a school or hospital.

Simple definitions should be concise: direct definition, what it means for this parcel if relevant, and one limitation. Parcel and scenario answers use this order when useful:

1. direct answer;
2. evidence and reasoning;
3. implication for a developer or planner;
4. next verification step;
5. remaining unknowns.

The model must not add every section mechanically. It should answer a simple definition in two to five sentences and reserve longer structured answers for scenarios.

Unsupported suitability remains out of scope, but the assistant may explain the general meaning of a non-residential district or use when an official reference is available. “What does EMI mean?” is a reference question; “Is this parcel suitable for a school?” is a suitability question.

## 5. Prompt V2

The system prompt defines the assistant as an early due-diligence explainer for developers and planners. It tells the model to answer the user’s actual question first, use plain English, avoid repeating blanket disclaimers, and distinguish verified facts, official references, user assumptions, and web-sourced material.

The user prompt contains bounded sections rather than one undifferentiated JSON block:

- `CONVERSATION`: the last configured user and assistant turns, including the latest question;
- `PARCEL REPORT FACTS`: current deterministic context;
- `OFFICIAL REFERENCE FACTS`: only reference entries relevant to the question or parcel districts;
- `USER PROJECT ASSUMPTIONS`;
- `WEB RESULTS`;
- `RESPONSE CONTRACT`.

`LLM_CHAT_MAX_TURNS` controls the history window and defaults to eight messages. The cache key and prompt version change to `parcel-chat-v2`.

The final response preserves the existing `ParcelChatResponse` shape and adds an internal `intent` plus a third citation kind, `official`. An official citation is accepted only when its source ID and URL exist in the supplied official reference pack.

## 6. Streaming protocol

`POST /api/parcel-chat` supports both JSON and streaming responses. The browser requests `Accept: text/event-stream`; existing JSON callers remain compatible.

The streaming response uses server-sent events over the fetch response body:

- `start`: request ID and selected intent;
- `delta`: validated answer text added to the provisional assistant message;
- `complete`: the final validated `ParcelChatResponse` with citations and suggestions;
- `fallback`: a complete deterministic response that replaces any provisional text;
- `error`: a recoverable user-facing error when neither model nor fallback can answer.

The OpenAI-compatible provider request uses `stream: true`. The provider still returns the structured JSON contract. The server incrementally extracts the `answer` string, buffers it to sentence or line boundaries, and applies the existing grade, number, and prohibited-claim checks before emitting each `delta`. The full raw response must pass `validateParcelChatOutput` before `complete` is emitted. If parsing or final validation fails, the server emits `fallback`; the UI replaces provisional text rather than preserving an unvalidated answer.

If the provider does not support streaming or returns a non-stream body, the server uses the current non-stream completion and emits one `complete` event. Cached and deterministic answers may also complete immediately.

The browser must abort the stream when the drawer closes, the parcel changes, or the user retries. A blinking cursor and `Generating…` label indicate an active stream. Citations appear only after `complete` or `fallback`.

## 7. Deterministic behavior and fallback

Stable zoning definitions are deterministic and available without an API key. `lookupZoningReference()` answers recognized code and symbol questions directly from the versioned official dictionary, including citations.

The deterministic fallback also covers score meaning, mapped observations, housing pathways, evidence gaps, next review task, assessor fields, and supported project checks. It should identify the actual fallback reason internally while the UI shows concise copy such as `Answered from verified ParcelLens sources.`

Fallback must not present a model/provider error as part of the answer. Development logs may record a reason code, never raw prompts, API keys, or untrusted provider output.

## 8. UX requirements

- Preserve the current conversation-focused drawer, collapsing context after the first question.
- Stream into the newest assistant message and keep it in view unless the user has manually scrolled upward.
- Do not force-scroll a user who is reading an earlier answer; show a `Jump to latest` control instead.
- Keep the composer expanded while typing and compact after submission.
- Add `Stop generating`, `Retry`, and `Clear conversation` actions.
- Render report, official, and web citations with distinct labels: `Report`, `Official source`, and `Web-sourced`.
- Show a small source-mode indicator on each completed answer, not a large repeated warning.
- All product copy remains English.

## 9. Acceptance criteria

1. `What does R1D-VL zoning mean?` receives a concise definition that decomposes both code components, cites Chapters 902/903, and does not claim project approval.
2. A follow-up `Does that mean I can build a duplex?` uses the prior turn and current parcel pathways rather than treating “that” as an unknown term.
3. A parcel score question cites the report and preserves the deterministic RAG.
4. A project scenario separates user assumptions from verified facts and identifies the next missing input.
5. A current external question either uses visibly labeled web citations or states that web research is unavailable.
6. A school-suitability question remains unsupported while a general definition question about an official district may be answered.
7. The first valid streamed text appears before the full response completes when the provider streams successfully.
8. Invalid streamed output is replaced by deterministic fallback, and unvalidated citations are never rendered.
9. Closing the drawer or changing parcels aborts the active request.
10. Local Node, Vite middleware, and Vercel expose the same endpoint and behavior.

## 10. Scope boundary

V2 does not add a vector database, crawl the whole zoning code, calculate permit approval, estimate cost or return, or add new score inputs. The structured official reference is intentionally small and reviewable. A retrieval system can be considered later if the maintained reference corpus grows beyond what can be safely versioned in the repository.
