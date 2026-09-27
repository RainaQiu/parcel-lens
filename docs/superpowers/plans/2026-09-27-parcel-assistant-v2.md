# Parcel Assistant V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ParcelLens Assistant answer parcel questions and stable general Pittsburgh zoning questions with official citations, preserve multi-turn context, and stream validated responses into the report drawer.

**Architecture:** Add a versioned server-side zoning reference and deterministic intent router before the LLM. Build Prompt V2 from bounded conversation history and clearly separated evidence layers. Extend the existing endpoint with fetch-based SSE while preserving JSON compatibility; streamed text is provisional until the final structured response passes the existing validator.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node.js HTTP, Vitest 5, OpenAI-compatible chat completions, server-sent events over `fetch`, optional Tavily search.

**Spec:** `docs/superpowers/specs/2026-09-27-parcel-assistant-v2-design.md`

## Global Constraints

- The assistant never changes `screeningRag`, pathway rows, or any deterministic scorecard result.
- Official reference facts come only from the versioned allowlist and carry a verified source ID and URL.
- Web-supported statements retain URL, title, retrieval time, provider, and a visible `Web-sourced` label.
- User project statements remain assumptions and never become parcel or legal facts.
- Invalid, interrupted, unsupported, or unavailable model output resolves to a deterministic answer where one exists.
- Owner names, mailing addresses, full geometry, secrets, raw prompts, and raw provider output are never logged or sent to the model.
- Product copy is English.
- Existing non-stream JSON callers remain compatible with `POST /api/parcel-chat`.

## Review Focus

- A code that contains letters and digits, such as `R1D-VL`, must parse as one zoning code and must not trigger the unverified-number validator; Task 1 tests it.
- A follow-up that uses pronouns or omitted nouns must receive the previous bounded turns; Task 2 tests it.
- A streamed provider response split inside a JSON escape sequence or Unicode sequence must reconstruct the exact answer; Task 3 tests it.
- A final response that fails citation or policy validation after provisional deltas must replace those deltas with fallback; Tasks 3 and 4 test it.
- A user who scrolls upward during generation must not be forced back to the bottom; Task 5 tests the scroll-state helper and browser behavior.

---

### Task 1: Official zoning reference and deterministic intent routing

**Files:**
- Create: `server/data/pittsburgh-zoning-reference-v1.json`
- Create: `server/zoningReference.mjs`
- Create: `server/zoningReference.test.js`
- Modify: `server/parcelChatCore.mjs`
- Modify: `server/parcelChatCore.test.js`

**Interfaces:**
- Consumes: the latest question, `ParcelChatContext`, and the versioned official reference JSON.
- Produces: `parseZoningCode(value)`, `lookupZoningReference(question, context)`, `classifyParcelChatIntent(request, referenceResult)`, and `OfficialReferenceCitation` with `kind: 'official'`.

- [ ] **Step 1: Write failing reference tests.** Cover `R1D-VL`, lowercase and punctuation variants, unknown codes, `R1D` without a density suffix, and official source metadata. Assert that `R1D-VL` resolves to `R1D = Single-Unit Detached Residential`, `VL = Very Low-Density`, and Chapters 902/903 citations.
- [ ] **Step 2: Run `npm test -- server/zoningReference.test.js`** and confirm the missing module fails.
- [ ] **Step 3: Add the versioned reference JSON.** Include the district codes already recognized by ParcelLens, residential density suffixes, pathway symbols `P/A/S/C`, source IDs, titles, URLs, and retrieval date. Keep interpretation text factual and short.
- [ ] **Step 4: Implement `parseZoningCode(value: string)` and `lookupZoningReference(question, context)`.** A lookup may use a code in the question or the current parcel’s district when the question clearly refers to it; it must return `null` for an unrecognized code.
- [ ] **Step 5: Write failing intent tests.** Pin `parcel_fact`, `zoning_reference`, `project_scenario`, `current_external`, and `unsupported_suitability`, including the distinction between `What does EMI mean?` and `Is this parcel suitable for a school?`.
- [ ] **Step 6: Implement `classifyParcelChatIntent(request, referenceResult)`.** Prefer deterministic code/reference matches before broad keyword rules.
- [ ] **Step 7: Run the focused tests and `npm test`.** Expect all tests to pass.
- [ ] **Step 8: Commit** with `feat: add official zoning reference answers`.

### Task 2: Prompt V2, multi-turn context, and stronger grounded fallback

**Files:**
- Modify: `server/parcelChatCore.mjs`
- Modify: `server/parcelChatCore.test.js`
- Modify: `server/parcelChat.mjs`
- Modify: `src/lib/parcelChat.ts`
- Modify: `src/lib/parcelChat.test.ts`

**Interfaces:**
- Consumes: Task 1 `OfficialReferenceResult`, intent, bounded request messages, report facts, project brief, and optional web results.
- Produces: `buildParcelChatPrompt(request, officialReferences, searchResults, options)`, Prompt V2 cache keys, `kind: 'official'` citations, and expanded deterministic answers.

- [ ] **Step 1: Write failing prompt tests.** Assert the prompt includes the last `LLM_CHAT_MAX_TURNS` messages in order, separates `CONVERSATION`, `PARCEL REPORT FACTS`, `OFFICIAL REFERENCE FACTS`, `USER PROJECT ASSUMPTIONS`, and `WEB RESULTS`, and instructs adaptive two-to-five-sentence definitions.
- [ ] **Step 2: Write failing validation tests.** Accept known official citations, reject altered official URLs/source IDs, preserve the current grade, and treat numbers supplied by official reference facts as known numbers.
- [ ] **Step 3: Write failing fallback tests.** Assert `What does R1D-VL zoning mean?` receives a deterministic official definition and citation without an LLM key; assert a parcel-specific duplex follow-up uses both history and housing pathways.
- [ ] **Step 4: Run `npm test -- server/parcelChatCore.test.js src/lib/parcelChat.test.ts`** and confirm the new assertions fail.
- [ ] **Step 5: Replace the chat system prompt and implement `buildParcelChatPrompt(...)`.** Define developer/planner audiences, direct-answer-first behavior, adaptive length, source-layer separation, and concise next checks. Pass bounded history rather than only `latestQuestion()`.
- [ ] **Step 6: Extend the response/citation contract.** Add internal `intent`, add citation kind `official`, validate it against only the supplied reference pack, and keep report/web validation unchanged.
- [ ] **Step 7: Improve `deterministicParcelAnswer(...)`.** Route recognized definitions to Task 1, retain report handlers, distinguish unsupported suitability from general definitions, and return source-based copy without provider-error text.
- [ ] **Step 8: Update cache version to `parcel-chat-v2`.** Include bounded history, official reference version, project brief, web mode, and model.
- [ ] **Step 9: Run focused tests and `npm test`.** Expect all tests to pass.
- [ ] **Step 10: Commit** with `feat: improve parcel assistant grounding and context`.

### Task 3: Provider streaming and SSE endpoint

**Files:**
- Create: `server/openAiStream.mjs`
- Create: `server/openAiStream.test.js`
- Modify: `server/parcelChat.mjs`
- Modify: `server/parcelChat.test.js`
- Create: `api/parcel-chat.js`
- Modify: `server/index.mjs`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Prompt V2 and the existing OpenAI-compatible endpoint.
- Produces: `streamModelCompletion(prompt, sessionId, signal, onChunk)`, `extractAnswerDeltas(state, chunk)`, and SSE events `start`, `delta`, `complete`, `fallback`, and `error`.

- [ ] **Step 1: Write failing OpenAI stream-parser tests.** Cover multiple `data:` frames in one chunk, one frame split across chunks, `[DONE]`, escaped quotes/newlines, Unicode split across byte chunks, provider error frames, and a non-stream JSON response.
- [ ] **Step 2: Write failing incremental-answer tests.** Feed partial JSON where the `answer` field starts late, contains escapes, or is followed by other fields. Assert emitted text reconstructs the final answer exactly and only ends at safe sentence or line boundaries.
- [ ] **Step 3: Run `npm test -- server/openAiStream.test.js`** and confirm the module is missing.
- [ ] **Step 4: Implement `streamModelCompletion(...)`.** Send `stream: true`, parse OpenAI-compatible SSE with `TextDecoder`, accumulate the complete model JSON, and expose answer deltas. Fall back to the non-stream completion path when the provider does not return an event stream.
- [ ] **Step 5: Add `validateStreamedAnswerPrefix(candidate, request, officialReferences, searchResults)`.** Reuse grade, known-number, and prohibited-claim rules before emitting a completed sentence or line.
- [ ] **Step 6: Write failing route tests.** Assert SSE headers, event order, cached immediate completion, deterministic immediate completion, client abort, provider timeout, invalid final JSON after deltas, and fallback replacement.
- [ ] **Step 7: Extend `handleParcelChatRequest`.** Select SSE when `Accept: text/event-stream`, preserve current JSON behavior otherwise, emit citations only in `complete`/`fallback`, and stop provider work on request close.
- [ ] **Step 8: Add `api/parcel-chat.js`.** Mirror the existing serverless explanation entry point with body parsing disabled and route to the shared handler. Keep local Node and Vite middleware on the same implementation.
- [ ] **Step 9: Document `LLM_CHAT_STREAMING_ENABLED=true`.** When false, send one validated `complete` event so the browser protocol still works.
- [ ] **Step 10: Run focused server tests and `npm test`.** Expect all tests to pass.
- [ ] **Step 11: Commit** with `feat: stream validated parcel assistant responses`.

### Task 4: Streaming browser client and cancellation

**Files:**
- Modify: `src/lib/parcelChat.ts`
- Modify: `src/lib/parcelChat.test.ts`

**Interfaces:**
- Consumes: Task 3 SSE event contract.
- Produces: `streamParcelChat(request, handlers, signal): Promise<ParcelChatResponse>` and a testable SSE decoder.

- [ ] **Step 1: Write failing client parser tests.** Cover arbitrary byte chunk boundaries, multi-line SSE data, unknown event names, malformed JSON, `complete`, `fallback`, server errors, and abort.
- [ ] **Step 2: Write failing lifecycle tests.** Assert `onStart`, ordered `onDelta`, exactly one terminal callback, and rejection when the stream ends without `complete` or `fallback`.
- [ ] **Step 3: Run `npm test -- src/lib/parcelChat.test.ts`** and confirm the new APIs are missing.
- [ ] **Step 4: Implement `streamParcelChat(...)`.** Request `text/event-stream`, decode the body incrementally, ignore unknown events, and fall back to parsing a JSON response when the server does not stream.
- [ ] **Step 5: Preserve `sendParcelChat(...)` as a compatibility wrapper** or migrate its existing callers to the new function without duplicating request logic.
- [ ] **Step 6: Run the focused tests and `npm test`.** Expect all tests to pass.
- [ ] **Step 7: Commit** with `feat: add parcel chat streaming client`.

### Task 5: Streaming conversation UX

**Files:**
- Modify: `src/panel/ParcelChat.tsx`
- Modify: `src/App.css`
- Create: `src/lib/chatScroll.ts`
- Create: `src/lib/chatScroll.test.ts`

**Interfaces:**
- Consumes: Task 4 streaming callbacks and terminal response.
- Produces: provisional assistant messages, stop/retry/clear controls, source-mode badges, and non-disruptive latest-message scrolling.

- [ ] **Step 1: Write failing scroll-state tests.** Define `shouldFollowLatest({distanceFromBottom, userScrolled, thresholdPx})` and assert auto-follow within 48px, no forced scroll after manual upward scrolling, and reset after `Jump to latest`.
- [ ] **Step 2: Run `npm test -- src/lib/chatScroll.test.ts`** and confirm the helper is missing.
- [ ] **Step 3: Implement the scroll helper** and use it to replace unconditional scrolling in `ParcelChat.tsx`.
- [ ] **Step 4: Add streaming message state.** Append `delta` text to one provisional assistant turn, mark it `Generating…`, replace it with the terminal validated response, and replace it with deterministic fallback when `fallback` arrives.
- [ ] **Step 5: Add controls.** `Stop generating` aborts without clearing prior turns; `Retry` resends the latest user question; `Clear conversation` aborts and resets messages, project extraction state, notices, and the composer.
- [ ] **Step 6: Add citation presentation.** Render `Report`, `Official source`, and `Web-sourced` labels distinctly; do not show citations on provisional text.
- [ ] **Step 7: Preserve the current layout behavior.** Context collapses after the first question, the composer expands while typing and compacts after submit, and the answer pane remains the primary scroll surface.
- [ ] **Step 8: Add CSS for the streaming cursor, compact source badge, stop/retry controls, and `Jump to latest`.** Respect `prefers-reduced-motion`.
- [ ] **Step 9: Run focused tests, `npm test`, `npm run build`, and `npm run lint`.** Expect all checks to pass.
- [ ] **Step 10: Use the local browser** to verify a definition, a follow-up question, stop/retry, manual upward scrolling, fallback replacement, and narrow-screen layout.
- [ ] **Step 11: Commit** with `feat: add streaming parcel assistant experience`.

### Task 6: Quality evaluation and deployment verification

**Files:**
- Create: `scripts/evaluate-parcel-chat.mjs`
- Modify: `docs/verification/parcel-chat-cases.md`
- Modify: `README.md`
- Modify: `docs/verification/deployment-readiness.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: the completed local or deployed `/api/parcel-chat` endpoint.
- Produces: `npm run evaluate:chat`, an English prompt suite, latency/source/fallback results, and reproducible deployment checks.

- [ ] **Step 1: Add evaluator fixtures** for `What does R1D-VL zoning mean?`, `Does that mean I can build a duplex?`, score explanation, mapped hazard, project scenario, current external rule, school suitability, provider failure, and invalid model output.
- [ ] **Step 2: Implement `scripts/evaluate-parcel-chat.mjs`.** Accept `PARCEL_CHAT_BASE_URL`, run prompts sequentially with a fixed session, record time to first delta and total time, and print pass/fail without printing secrets or raw prompts from external users.
- [ ] **Step 3: Add `evaluate:chat` to `package.json`** and document the optional live-provider requirement.
- [ ] **Step 4: Update acceptance documentation.** Record expected intent, required facts, forbidden claims, citation type, streaming expectation, and fallback behavior for every case.
- [ ] **Step 5: Update README and deployment notes.** Document the official reference version, streaming env flag, Vercel function, web-source behavior, and debugging reason codes.
- [ ] **Step 6: Run `npm test`, `npm run build`, `npm run lint`, and `npm run evaluate:chat`** against the local server. Expect unit checks to pass and every configured acceptance case to report PASS.
- [ ] **Step 7: Verify the deployed Vercel endpoint.** Confirm `Content-Type: text/event-stream`, at least one `delta` before `complete` with a streaming-capable provider, direct report-page routing, and deterministic behavior when the API key is unavailable.
- [ ] **Step 8: Commit** with `docs: verify parcel assistant v2 quality`.

## Plan self-review

- Spec coverage: general zoning questions, official sources, multi-turn history, improved prompt behavior, deterministic fallback, streaming, cancellation, citations, UI, Vercel deployment, and evaluation each map to a task.
- Type consistency: Task 1 produces official references and intent; Task 2 includes them in the prompt and final contract; Task 3 streams that contract; Tasks 4–5 consume the same terminal response.
- Streaming safety: provisional text is sentence-buffered and policy-checked; citations appear only after full validation; invalid completion triggers replacement fallback.
- Review focus: each listed parser, history, validation, fallback, and scroll edge case has a named test in the owning task.
- Proportion: the plan avoids a vector database or full zoning-code crawler; the added official knowledge remains small, versioned, and reviewable.
