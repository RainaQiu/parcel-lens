function emitSseData(data, onEvent) {
  if (data.length > 0) onEvent(data)
}

export function createSseParser(onEvent) {
  let buffer = ''
  let dataLines = []

  function processLine(line) {
    if (line === '') {
      emitSseData(dataLines.join('\n'), onEvent)
      dataLines = []
      return
    }
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
  }

  return {
    push(chunk) {
      buffer += String(chunk)
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() ?? ''
      for (const line of lines) processLine(line)
    },
    finish() {
      if (buffer) processLine(buffer)
      if (dataLines.length) emitSseData(dataLines.join('\n'), onEvent)
      buffer = ''
      dataLines = []
    },
  }
}

function decodeEscape(value, index) {
  const next = value[index + 1]
  const simple = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }
  if (next in simple) return { value: simple[next], nextIndex: index + 2 }
  if (next === 'u' && /^[0-9a-f]{4}$/i.test(value.slice(index + 2, index + 6))) {
    return { value: String.fromCharCode(Number.parseInt(value.slice(index + 2, index + 6), 16)), nextIndex: index + 6 }
  }
  return null
}

function readAnswerValue(raw) {
  const key = /"answer"\s*:\s*"/.exec(raw)
  if (!key || key.index === undefined) return { value: '', complete: false }
  const start = key.index + key[0].length
  let value = ''
  for (let index = start; index < raw.length; index += 1) {
    const character = raw[index]
    if (character === '"') return { value, complete: true }
    if (character !== '\\') { value += character; continue }
    const decoded = decodeEscape(raw, index)
    if (!decoded) return { value, complete: false }
    value += decoded.value
    index = decoded.nextIndex - 1
  }
  return { value, complete: false }
}

function safeBoundary(value) {
  let boundary = 0
  for (let index = 0; index < value.length; index += 1) {
    if (!/[.!?]/.test(value[index])) continue
    if (index === value.length - 1 || /\s/.test(value[index + 1])) boundary = index + 1
  }
  return boundary
}

export function extractAnswerDeltas(state, fragment) {
  state.raw = `${state.raw}${fragment ?? ''}`
  const parsed = readAnswerValue(state.raw)
  const boundary = parsed.complete ? parsed.value.length : safeBoundary(parsed.value)
  const text = parsed.value.slice(state.emitted, boundary)
  state.emitted = Math.max(state.emitted, boundary)
  return { text, value: parsed.value, complete: parsed.complete }
}

export async function streamModelCompletion(prompt, sessionId, signal, onDelta, options = {}) {
  const baseUrl = options.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://opencode.ai/zen/go/v1'
  const model = options.model ?? process.env.LLM_MODEL ?? 'deepseek-v4.1-flash'
  const maxTokens = options.maxTokens ?? Math.min(Math.max(Number(process.env.LLM_CHAT_MAX_OUTPUT_TOKENS) || 1500, 300), 2500)
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${options.apiKey ?? process.env.LLM_API_KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'parcel-lens/1.0', 'x-opencode-session': sessionId },
    body: JSON.stringify({ model, temperature: 0.2, max_tokens: maxTokens, stream: true, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: options.systemPrompt ?? 'Return one JSON object only.' },
      { role: 'user', content: prompt },
    ] }),
    signal,
  })
  if (!response.ok) throw new Error(`Provider unavailable (${response.status})`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream') || !response.body) {
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('Provider returned no text')
    return { raw: content, streamed: false }
  }

  const state = { raw: '', emitted: 0 }
  const parser = createSseParser((data) => {
    if (data === '[DONE]') return
    const value = JSON.parse(data)
    if (value?.error) throw new Error(String(value.error.message ?? 'Provider stream error'))
    const fragment = value?.choices?.[0]?.delta?.content
    if (typeof fragment !== 'string') return
    const delta = extractAnswerDeltas(state, fragment)
    if (delta.text) onDelta(delta.text)
  })
  const decoder = new TextDecoder()
  for await (const chunk of response.body) parser.push(decoder.decode(chunk, { stream: true }))
  parser.push(decoder.decode())
  parser.finish()
  return { raw: state.raw, streamed: true }
}
