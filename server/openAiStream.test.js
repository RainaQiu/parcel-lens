import { describe, expect, it } from 'vitest'
import { createSseParser, extractAnswerDeltas, streamModelCompletion } from './openAiStream.mjs'

describe('OpenAI-compatible stream helpers', () => {
  it('reconstructs SSE frames split across arbitrary chunks', () => {
    const events = []
    const parser = createSseParser((data) => events.push(data))
    parser.push('data: {"choices":[{"delta":{"content":"{\\"answer\\":\\"First"}}]}\n\n')
    parser.push('data: {"choices":[{"delta":{"content":" line.\\"}"}}]}\n\n')
    parser.push('data: [DONE]\n\n')
    parser.finish()
    expect(events).toHaveLength(3)
    expect(events[2]).toBe('[DONE]')
    expect(JSON.parse(events[0]).choices[0].delta.content).toContain('answer')
  })

  it('extracts sentence-safe answer deltas from partial JSON string content', () => {
    const state = { raw: '', emitted: 0 }
    expect(extractAnswerDeltas(state, '{"answer":"The parcel is ')).toEqual({ text: '', value: 'The parcel is ', complete: false })
    const second = extractAnswerDeltas(state, 'AMBER. Verify the base zoning district next."}')
    expect(second.text).toBe('The parcel is AMBER. Verify the base zoning district next.')
    expect(second.value).toBe('The parcel is AMBER. Verify the base zoning district next.')
    expect(extractAnswerDeltas(state, '').complete).toBe(true)
  })

  it('uses the non-stream response when the provider does not stream', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"answer":"Complete."}' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    try {
      const result = await streamModelCompletion('prompt', 'session', undefined, () => {})
      expect(result.streamed).toBe(false)
      expect(result.raw).toContain('Complete.')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
