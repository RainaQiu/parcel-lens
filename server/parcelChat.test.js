import { createServer } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handleParcelChatRequest, resetParcelChatState } from './parcelChat.mjs'

let server
let provider

beforeEach(() => {
  for (const key of ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_ENABLED', 'LLM_CHAT_ENABLED', 'LLM_MODEL', 'LLM_CHAT_MAX_OUTPUT_TOKENS', 'LLM_CHAT_PER_SESSION_LIMIT', 'LLM_CHAT_DAILY_REQUEST_LIMIT', 'WEB_SEARCH_ENABLED', 'WEB_SEARCH_PROVIDER', 'TAVILY_API_KEY', 'WEB_SEARCH_BASE_URL']) delete process.env[key]
})

const context = {
  pin: '0052N00176000000', address: '5000 FORBES AVE', scoreVersion: 'LDES-v3-screening-scorecard', screeningRag: 'AMBER', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED',
  housingPathways: [{ useType: 'multi_unit', useLabel: 'Multi-unit (4+)', pathway: 'A', reviewStatus: 'verified', sourceUrl: 'https://ecode360.com/45476784', ruleVersion: 'use-table-v1' }],
  mappedConstraints: [{ id: 'slope', label: '25%+ steep slope', status: 'DETECTED', overlapPct: 28.051, projectImpact: 'UNKNOWN', boundaryUncertain: false,
    source: { sourceId: 'pgh-slope25', sourceUrl: 'https://example.test/slope', sourceUpdatedAt: null, retrievedAt: '2026-09-27' } }],
  reviewTasks: [{ id: 'mapped-slope', trigger: '25%+ steep slope map overlaps the parcel.', whyItMatters: 'The proposed footprint is unknown.', whoToConsult: 'Planning staff', sourceRefs: ['pgh-slope25'], scoreEffect: 'triggered' }],
  evidenceGaps: [], unassessed: ['Financial feasibility'],
  sources: [{ sourceId: 'pgh-slope25', sourceUrl: 'https://example.test/slope', sourceUpdatedAt: null, retrievedAt: '2026-09-27' }],
  assessor: { lotArea: 10000, propertyClass: null, useDescription: null, saleDate: null, salePrice: null, assessedTotal: null }, retrievedAt: '2026-09-27',
  projectBrief: { housingType: 'unknown', unitCount: null, stories: null, proposedFootprintSqft: null, landControl: 'unknown', costAssumptionsProvided: false },
}

const payload = (question = 'Why is this parcel Amber?') => ({ pin: context.pin, reportFacts: context, projectBrief: context.projectBrief,
  messages: [{ role: 'user', content: question }], allowWebSearch: false })

afterEach(async () => {
  for (const key of ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_ENABLED', 'LLM_CHAT_ENABLED', 'LLM_MODEL', 'LLM_CHAT_MAX_OUTPUT_TOKENS', 'LLM_CHAT_PER_SESSION_LIMIT', 'LLM_CHAT_DAILY_REQUEST_LIMIT', 'WEB_SEARCH_ENABLED', 'WEB_SEARCH_PROVIDER', 'TAVILY_API_KEY', 'WEB_SEARCH_BASE_URL']) delete process.env[key]
  resetParcelChatState()
  if (server) await new Promise((resolve) => server.close(resolve))
  if (provider) await new Promise((resolve) => provider.close(resolve))
  server = null; provider = null
})

async function endpoint() {
  server = createServer(handleParcelChatRequest)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${server.address().port}`
}

describe('parcel chat API', () => {
  it('returns a deterministic answer without an LLM key', async () => {
    const response = await fetch(await endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parcel-chat-session': 'test-session' }, body: JSON.stringify(payload()) })
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.answer).toContain('AMBER')
    expect(result.fallback).toBe(true)
  })

  it('calls the configured OpenAI-compatible provider and returns validated output', async () => {
    let requestedPath = ''
    provider = createServer((req, res) => {
      requestedPath = req.url
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        expect(JSON.parse(body).response_format.type).toBe('json_object')
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ mode: 'fact', answer: 'The parcel is AMBER because the mapped slope requires review.', projectCheck: null, citations: [{ sourceId: 'pgh-slope25', reportSection: 'drivers', kind: 'report' }], missingInputs: [], suggestedQuestions: [] }) } }] }))
      })
    })
    await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve))
    process.env.LLM_API_KEY = 'test-only'
    process.env.LLM_CHAT_ENABLED = 'true'
    process.env.LLM_BASE_URL = `http://127.0.0.1:${provider.address().port}/v1`
    const response = await fetch(await endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parcel-chat-session': 'provider-session' }, body: JSON.stringify(payload()) })
    expect(response.status).toBe(200)
    expect(requestedPath).toBe('/v1/chat/completions')
    expect((await response.json()).fallback).toBe(false)
  })

  it('falls back when the provider returns invalid output', async () => {
    provider = createServer((req, res) => { req.resume(); req.on('end', () => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content: '{bad' } }] })) }) })
    await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve))
    process.env.LLM_API_KEY = 'test-only'; process.env.LLM_CHAT_ENABLED = 'true'; process.env.LLM_BASE_URL = `http://127.0.0.1:${provider.address().port}/v1`
    const response = await fetch(await endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parcel-chat-session': 'invalid-session' }, body: JSON.stringify(payload()) })
    expect(response.status).toBe(200)
    expect((await response.json()).fallback).toBe(true)
  })

  it('enforces a per-session budget', async () => {
    process.env.LLM_CHAT_PER_SESSION_LIMIT = '1'
    const url = await endpoint()
    const headers = { 'Content-Type': 'application/json', 'x-parcel-chat-session': 'limited-session' }
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload()) })).status).toBe(200)
    expect((await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload('What should I verify first?')) })).status).toBe(429)
  })

  it('rejects malformed requests before answering', async () => {
    const response = await fetch(await endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: 'bad' }) })
    expect(response.status).toBe(400)
  })

  it('keeps the report fallback when the optional web provider fails', async () => {
    provider = createServer((req, res) => { req.resume(); req.on('end', () => { res.writeHead(500); res.end('{}') }) })
    await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve))
    process.env.WEB_SEARCH_ENABLED = 'true'; process.env.WEB_SEARCH_PROVIDER = 'tavily'; process.env.TAVILY_API_KEY = 'test-only'; process.env.WEB_SEARCH_BASE_URL = `http://127.0.0.1:${provider.address().port}/search`
    const body = { ...payload('What is the current planning review rule?'), allowWebSearch: true }
    const response = await fetch(await endpoint(), { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parcel-chat-session': 'search-failure' }, body: JSON.stringify(body) })
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.fallback).toBe(true)
    expect(result.webSearch.available).toBe(false)
  })
})
