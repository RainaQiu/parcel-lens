import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { buildParcelChatPrompt, deterministicParcelAnswer, validateParcelChatOutput, validateParcelChatRequest } from './parcelChatCore.mjs'

if (existsSync('.env')) process.loadEnvFile('.env')

const cache = new Map()
const minuteBuckets = new Map()
const sessionBuckets = new Map()
const dailyBuckets = new Map()
const CACHE_MS = 24 * 60 * 60 * 1000
const MAX_BODY = 96 * 1024

function send(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(value))
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new Error('Request too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function configuredNumber(name, fallback, min, max) {
  const value = Number(process.env[name])
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : fallback
}

function withinBucket(store, key, limit, windowMs) {
  const now = Date.now()
  const current = store.get(key) ?? { start: now, count: 0 }
  if (now - current.start >= windowMs) { current.start = now; current.count = 0 }
  current.count += 1
  store.set(key, current)
  return current.count <= limit
}

function withinDailyBudget(day) {
  const limit = configuredNumber('LLM_CHAT_DAILY_REQUEST_LIMIT', configuredNumber('LLM_DAILY_REQUEST_LIMIT', 200, 1, 10000), 1, 10000)
  const current = dailyBuckets.get(day) ?? 0
  if (current >= limit) return false
  dailyBuckets.set(day, current + 1)
  return true
}

function cacheKey(request, searchResults) {
  return createHash('sha256').update(JSON.stringify({ request, searchResults, model: process.env.LLM_MODEL ?? 'deepseek-v4.1-flash', prompt: 'parcel-chat-v1' })).digest('hex')
}

async function modelCompletion(prompt, sessionId) {
  const baseUrl = process.env.LLM_BASE_URL || 'https://opencode.ai/zen/go/v1'
  const model = process.env.LLM_MODEL || 'deepseek-v4.1-flash'
  const timeout = configuredNumber('LLM_TIMEOUT_MS', 60000, 3000, 90000)
  const maxTokens = configuredNumber('LLM_CHAT_MAX_OUTPUT_TOKENS', 1500, 300, 2500)
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.LLM_API_KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'parcel-lens/1.0', 'x-opencode-session': sessionId },
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: maxTokens, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'You are ParcelLens Assistant. Return JSON only and follow the supplied response contract.' },
      { role: 'user', content: prompt },
    ] }),
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`Provider unavailable (${response.status})`)
  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Provider returned no text')
  return content
}

export async function searchWeb(query, options = {}) {
  const provider = process.env.WEB_SEARCH_PROVIDER || ''
  const key = process.env.TAVILY_API_KEY || process.env.WEB_SEARCH_API_KEY
  if (provider !== 'tavily' || !key) return { results: [], available: false, reason: 'Web search provider is not configured.' }
  const baseUrl = process.env.WEB_SEARCH_BASE_URL || 'https://api.tavily.com/search'
  const response = await fetch(baseUrl, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, query: query.slice(0, 800), max_results: Math.min(options.maxResults ?? 5, 8), include_answer: false }), signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`Web search unavailable (${response.status})`)
  const data = await response.json()
  const retrievedAt = new Date().toISOString()
  const results = Array.isArray(data.results) ? data.results.slice(0, 8).map((item) => ({ url: String(item.url ?? ''), title: String(item.title ?? ''), snippet: String(item.content ?? item.snippet ?? '').slice(0, 1000), retrievedAt, provider: 'tavily' })).filter((item) => /^https?:\/\//i.test(item.url) && item.title) : []
  return { results, available: true, reason: results.length ? null : 'The search provider returned no usable results.' }
}

function webQuery(request) {
  const question = [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? ''
  return `${request.reportFacts.address} Pittsburgh ${question}`.slice(0, 800)
}

function fallbackResponse(request, reason = null, webSearch = { available: false, used: false }) {
  const answer = deterministicParcelAnswer(request, request.reportFacts, null)
  return { ...answer, fallback: true, fallbackReason: reason, webSearch: { ...webSearch, used: false } }
}

export function resetParcelChatState() {
  cache.clear(); minuteBuckets.clear(); sessionBuckets.clear(); dailyBuckets.clear()
}

export async function handleParcelChatRequest(req, res) {
  if (req.method !== 'POST') { send(res, 405, { error: 'Method not allowed' }); return }
  let request
  try { request = validateParcelChatRequest(await readJson(req)) } catch { send(res, 400, { error: 'Invalid parcel chat request' }); return }
  const ip = req.socket?.remoteAddress ?? 'local'
  const sessionId = String(req.headers['x-parcel-chat-session'] ?? ip).slice(0, 120)
  if (!withinBucket(minuteBuckets, ip, configuredNumber('LLM_CHAT_PER_IP_LIMIT', 20, 1, 100), 60_000) || !withinBucket(sessionBuckets, sessionId, configuredNumber('LLM_CHAT_PER_SESSION_LIMIT', 12, 1, 50), 24 * 60 * 60 * 1000)) {
    send(res, 429, { error: 'Parcel chat rate limit reached' }); return
  }

  let searchResults = []
  let webSearch = { available: false, used: false, reason: null }
  if (request.allowWebSearch && process.env.WEB_SEARCH_ENABLED === 'true') {
    try {
      const result = await searchWeb(webQuery(request), { maxResults: 5 })
      searchResults = result.results
      webSearch = { available: result.available, used: searchResults.length > 0, reason: result.reason }
    } catch { webSearch = { available: false, used: false, reason: 'Web search failed; report facts remain available.' } }
  } else if (request.allowWebSearch) {
    webSearch = { available: false, used: false, reason: 'Web search is not configured.' }
  }

  const fallback = fallbackResponse(request, null, webSearch)
  const llmEnabled = process.env.LLM_CHAT_ENABLED !== 'false' && Boolean(process.env.LLM_API_KEY)
  if (!llmEnabled) { send(res, 200, fallback); return }
  const key = cacheKey(request, searchResults)
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < CACHE_MS) { send(res, 200, { ...cached.value, cached: true, webSearch }); return }
  if (!withinDailyBudget(new Date().toISOString().slice(0, 10))) { send(res, 200, { ...fallback, fallbackReason: 'Daily chat budget reached' }); return }
  try {
    const raw = await modelCompletion(buildParcelChatPrompt(request, searchResults), sessionId)
    const value = validateParcelChatOutput(raw, request, searchResults)
    const response = { ...value, fallback: false, webSearch }
    if (cache.size > 200) cache.delete(cache.keys().next().value)
    cache.set(key, { time: Date.now(), value: response })
    send(res, 200, response)
  } catch {
    send(res, 200, fallbackResponse(request, 'AI response unavailable; showing the source-based answer.', webSearch))
  }
}
