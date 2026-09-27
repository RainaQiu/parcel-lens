const endpoint = process.env.PARCEL_CHAT_URL ?? 'http://127.0.0.1:4173/api/parcel-chat'

const reportFacts = {
  pin: '0011M00060000000',
  scoreVersion: 'LDES-v3-screening-scorecard',
  screeningRag: 'UNRATED',
  pathwaySummary: 'UNKNOWN',
  address: '2633 5TH AVE',
  housingPathways: [],
  mappedConstraints: [],
  reviewTasks: [],
  evidenceGaps: [{ id: 'zoning-gap', dimension: 'zoning', reason: 'Verified zoning pathway is incomplete.', sourceRefs: [] }],
  unassessed: ['Permit approval', 'Cost and financial feasibility'],
  sources: [{ sourceId: 'parcel-assessment', sourceUrl: 'https://data.wprdc.org/' }],
  projectBrief: { housingType: 'unknown', unitCount: null, stories: null, proposedFootprintSqft: null, landControl: 'unknown', costAssumptionsProvided: false },
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function parseSse(text) {
  const events = []
  for (const block of text.split(/\r?\n\r?\n/)) {
    const event = block.match(/^event:\s*(.+)$/m)?.[1]
    const data = block.match(/^data:\s*(.+)$/m)?.[1]
    if (!event || !data) continue
    events.push({ event, data: JSON.parse(data) })
  }
  return events
}

async function runCase(name, messages, checks) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'x-parcel-chat-session': `evaluation-${name}` },
    body: JSON.stringify({ pin: reportFacts.pin, reportFacts, projectBrief: reportFacts.projectBrief, messages, allowWebSearch: false }),
  })
  const body = await response.text()
  assert(response.ok, `${name}: HTTP ${response.status} ${body.slice(0, 200)}`)
  const events = parseSse(body)
  const terminal = [...events].reverse().find((item) => item.event === 'complete' || item.event === 'fallback')
  assert(terminal, `${name}: no terminal SSE event`)
  assert(typeof terminal.data.answer === 'string' && terminal.data.answer.length >= 15, `${name}: terminal answer is missing`)
  for (const check of checks) check(terminal.data, events)
  const deltaCount = events.filter((item) => item.event === 'delta').length
  console.log(`${name}: ${terminal.event}, ${deltaCount} streamed delta event(s)`)
}

await runCase('zoning-definition', [{ role: 'user', content: 'What does the R1D-VL zoning mean?' }], [
  (result) => assert(/R1D|single-unit detached|very low-density/i.test(result.answer), 'zoning-definition: missing R1D/VL explanation'),
  (result) => assert(result.citations.some((citation) => citation.kind === 'official'), 'zoning-definition: missing official citation'),
])

await runCase('report-grounding', [{ role: 'user', content: 'Why is this parcel rated this way?' }], [
  (result) => assert(/UNRATED|evidence|parcel/i.test(result.answer), 'report-grounding: answer does not use report facts'),
  (result) => assert(!result.answer.includes('Web-sourced'), 'report-grounding: unexpected web claim'),
])

await runCase('follow-up-context', [
  { role: 'user', content: 'What does the R1D-VL zoning mean?' },
  { role: 'assistant', content: 'R1D is a single-unit detached residential designation and VL indicates very low density.' },
  { role: 'user', content: 'How should I use that when screening this parcel?' },
], [
  (result) => assert(/parcel|housing|district|screen/i.test(result.answer), 'follow-up-context: answer did not address the parcel follow-up'),
])

console.log(`Parcel chat evaluation passed against ${endpoint}`)
