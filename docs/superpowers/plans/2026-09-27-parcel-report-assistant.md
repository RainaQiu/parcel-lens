# Parcel Report Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a grounded `Ask ParcelLens` assistant to parcel reports that answers from verified report facts, evaluates user-provided residential concepts, and optionally labels web-sourced context without changing the deterministic scorecard.

**Architecture:** Build a pure TypeScript context and project-check layer, a Node server core for schema validation and structured LLM responses, and a separate optional web-search adapter. Add a same-origin `/api/parcel-chat` route and a responsive report drawer; deterministic handlers remain available when the model, provider, search adapter, or budget is unavailable.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node.js HTTP server, Vitest 5, OpenAI-compatible OpenCode Go endpoint, optional Tavily-compatible web search adapter.

**Spec:** `docs/superpowers/specs/2026-09-27-parcel-report-assistant-design.md`

## Global Constraints

- `screeningRag` and the existing scorecard remain deterministic and immutable during chat.
- Every web-sourced claim carries URL, title, retrieval time, provider, and a visible `Web-sourced` label.
- School, hospital, commercial, and other unsupported uses return `OUT_OF_SCOPE` rather than an inferred suitability result.
- The server never receives or forwards owner names, mailing addresses, full parcel geometry, API keys, unrelated raw API responses, or other saved parcels.
- Provider failure, no key, rate limit, timeout, invalid output, or budget exhaustion must preserve a usable deterministic report fallback.
- Secrets remain server-only; no `VITE_` LLM or search key is allowed.

## Review Focus

- User asks about a non-residential use such as a school: return `OUT_OF_SCOPE` and explain the missing rule table.
- User gives unit count without a housing form: ask a focused follow-up instead of guessing detached versus attached.
- Provider invents a percentage, citation, approval claim, or new grade: reject the output and use deterministic fallback.
- Web search is enabled but no provider key or results are available: answer from the report and label web research unavailable.
- User switches PINs or sends prompt-injection text: isolate context and preserve the scorecard contract.

---

### Task 1: Context contract and residential project checks

**Files:**
- Create: `src/lib/screening/chatContext.ts`
- Create: `src/lib/screening/chatContext.test.ts`

**Interfaces:**
- Consumes: `ParcelReport`, `ScreeningScorecard`, `SelectedParcel`, and existing source types.
- Produces: `ProjectBrief`, `ParcelChatContext`, `ProjectConceptCheck`, `buildParcelChatContext(report, projectBrief)`, `checkProjectConcept(scorecard, projectBrief)`, and `mergeProjectBrief(current, patch)`.

- [ ] **Step 1: Write failing tests** for allowlisted context, owner/mailing-field exclusion, each supported housing type, ambiguous `unitCount`, incomplete evidence, unsupported use, and patch merging.
- [ ] **Step 2: Run `npm test -- src/lib/screening/chatContext.test.ts`** and confirm the missing module/functions fail.
- [ ] **Step 3: Implement the types and pure functions** in `chatContext.ts`. Map a project housing type to the matching existing pathway row; do not infer housing form from unit count.
- [ ] **Step 4: Run the focused test and the full suite**; expect all tests to pass.
- [ ] **Step 5: Commit** with `feat: add parcel chat context and project checks`.

### Task 2: Structured chat core and deterministic fallback

**Files:**
- Create: `server/parcelChatCore.mjs`
- Create: `server/parcelChatCore.test.js`

**Interfaces:**
- Consumes: Task 1 context shape, bounded messages, optional `SearchResult[]`.
- Produces: `validateParcelChatRequest`, `buildParcelChatPrompt`, `validateParcelChatOutput`, `deterministicParcelAnswer`, and the `ParcelChatResponse` shape.

- [ ] **Step 1: Write failing tests** for valid requests, size/message limits, deterministic score/pathway answers, unsupported school questions, ambiguous project questions, unknown citations, changed grades, invented numbers, approval claims, malformed JSON, and prompt-injection text.
- [ ] **Step 2: Run the focused server tests** and confirm the new exports or expected errors are missing.
- [ ] **Step 3: Implement validation and fallback**. Use a bounded prompt that treats report facts, web snippets, and user text as untrusted content. Allow web citations only from the supplied search results and require URL, title, retrieval time, and provider for every web citation.
- [ ] **Step 4: Run focused and full tests**; expect green output.
- [ ] **Step 5: Commit** with `feat: validate grounded parcel chat responses`.

### Task 3: Chat route and optional web search adapter

**Files:**
- Create: `server/parcelChat.mjs`
- Modify: `server/index.mjs`
- Modify: `.env.example`
- Create: `server/parcelChat.test.js`

**Interfaces:**
- Consumes: Task 2 validators/fallback and existing `modelCompletion` behavior.
- Produces: `handleParcelChatRequest(req, res)` mounted at `POST /api/parcel-chat`, plus a provider adapter returning `SearchResult[]`.

- [ ] **Step 1: Write failing route tests** for missing key, valid deterministic answer, model call, provider timeout, daily/session budget, search disabled, search provider failure, and JSON error status.
- [ ] **Step 2: Run route tests** and confirm the route module or handler is missing.
- [ ] **Step 3: Implement the route** with server-only env loading, request size bounds, per-IP/per-session rate limits, SHA-256 cache keys, configurable model/token limits, and deterministic fallback.
- [ ] **Step 4: Implement the optional web adapter** using `WEB_SEARCH_PROVIDER=tavily` and `TAVILY_API_KEY`; normalize URL/title/snippet/retrieval time. Do not call it unless `allowWebSearch` and `WEB_SEARCH_ENABLED` are both true.
- [ ] **Step 5: Mount the route and document env variables**. Run focused route tests and the full suite.
- [ ] **Step 6: Commit** with `feat: add parcel chat server route`.

### Task 4: Browser client and report chat drawer

**Files:**
- Create: `src/lib/parcelChat.ts`
- Create: `src/panel/ParcelChat.tsx`
- Create: `src/lib/parcelChat.test.ts`
- Modify: `src/panel/ReportPage.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: Task 1 context builder and Task 3 `/api/parcel-chat` response.
- Produces: report-level `Ask ParcelLens` drawer with prompts, messages, project brief chips, citations, evidence links, retry, clear, loading, and fallback states.

- [ ] **Step 1: Write failing client tests** for request mapping, session reset on PIN change, deterministic fallback rendering, web-source badge mapping, and project brief patching.
- [ ] **Step 2: Run focused client tests** and confirm the client module is missing.
- [ ] **Step 3: Implement the client request mapper and local fallback** without adding a new dependency.
- [ ] **Step 4: Implement the drawer**. Keep the report summary readable, separate source facts from AI prose, render citations as safe links, and label assumptions and web-sourced claims.
- [ ] **Step 5: Add responsive styles and report anchors**, then run client tests, full tests, build, and lint.
- [ ] **Step 6: Commit** with `feat: add grounded parcel report assistant`.

### Task 5: Browser acceptance and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/verification/deployment-readiness.md`
- Create: `docs/verification/parcel-chat-cases.md`

**Interfaces:**
- Consumes: the completed route and UI.
- Produces: reproducible setup, manual acceptance cases, and provider/fallback documentation.

- [ ] **Step 1: Add the setup and provenance rules** to the README and deployment notes.
- [ ] **Step 2: Record acceptance cases** for `0052N00176000000`, 20-unit multifamily, school out-of-scope, web-sourced citation, no-key fallback, source failure, and PIN switching.
- [ ] **Step 3: Run `npm test`, `npm run build`, and `npm run lint`**.
- [ ] **Step 4: Start the local server and use the browser** to verify the report drawer, source anchors, responsive layout, and fallback.
- [ ] **Step 5: Commit** with `docs: verify parcel report assistant`.

## Plan self-review

- Spec coverage: context, project assumptions, deterministic concept check, web provenance, API validation, fallback, budget controls, UI, and acceptance cases map to Tasks 1–5.
- Interface consistency: Task 1 produces `ProjectBrief` and `ParcelChatContext`; Task 2 consumes them and produces the response contract; Tasks 3–4 consume the same contract.
- Review focus coverage: each listed failure mode has a focused test in Tasks 1–3 or a browser case in Task 5.
- Scope: no new score, no new zoning rule table, no general non-residential feasibility, and no external search without a configured provider.
- No placeholders or unresolved names remain.
