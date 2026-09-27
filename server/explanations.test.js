import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { handleExplanationRequest } from './explanations.mjs'

let server
let provider
afterEach(async () => {
  delete process.env.LLM_API_KEY; delete process.env.LLM_BASE_URL; delete process.env.LLM_ENABLED
  if (server) await new Promise((resolve) => server.close(resolve))
  if (provider) await new Promise((resolve) => provider.close(resolve))
  server = null; provider = null
})

async function endpoint() {
  server = createServer(handleExplanationRequest)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${server.address().port}`
}

describe('explanation API fallback', () => {
  it('returns unavailable without a key and never contacts a provider', async () => {
    delete process.env.LLM_API_KEY
    const url = await endpoint()
    const response = await fetch(url, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
    expect(response.status).toBe(503)
    expect((await response.json()).error).toMatch(/not configured/)
  })

  it('rejects invalid facts before any model request', async () => {
    process.env.LLM_API_KEY = 'test-only'
    const url = await endpoint()
    const response = await fetch(url, { method: 'POST', body: JSON.stringify({ pin: 'bad', drivers: [], missingRequired: [] }), headers: { 'Content-Type': 'application/json' } })
    expect(response.status).toBe(400)
  })

  it('uses the configured OpenAI-compatible chat endpoint and returns validated text', async () => {
    let requestedPath = ''
    provider = createServer((req, res) => {
      requestedPath = req.url
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'The AMBER preliminary screen calls for a mapped slope review.', tasks: [], unknowns: [] }) } }] }))
    })
    await new Promise((resolve) => provider.listen(0, '127.0.0.1', resolve))
    process.env.LLM_API_KEY = 'test-only'
    process.env.LLM_BASE_URL = `http://127.0.0.1:${provider.address().port}/v1`
    process.env.LLM_ENABLED = 'true'
    const url = await endpoint()
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      pin: '0011M00146000000', scoreVersion: 'LDES-v3-screening-scorecard', ruleVersion: 'v1', screeningRag: 'AMBER', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED',
      fallbackSummary: 'AMBER preliminary screen.', constraints: [], reviewTasks: [], evidenceGaps: [],
    }) })
    expect(response.status).toBe(200)
    expect(requestedPath).toBe('/v1/chat/completions')
    expect((await response.json()).summary).toMatch(/slope review/)
  })
})
