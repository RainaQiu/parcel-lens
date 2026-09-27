import { describe, expect, it, vi } from 'vitest'
import type { ParcelReport } from './reportView'
import { buildParcelChatRequest, citationLabel, deterministicChatFallback, mergeChatProjectBrief, sendParcelChat, streamParcelChat } from './parcelChat'
import type { HousingPathwayRow } from './types'
import type { ProjectBrief } from './screening/chatContext'
import type { ScreeningScorecard } from './screening/types'

const brief = (overrides: Partial<ProjectBrief> = {}): ProjectBrief => ({
  housingType: 'unknown', unitCount: null, stories: null, proposedFootprintSqft: null,
  landControl: 'unknown', costAssumptionsProvided: false, ...overrides,
})

function report(): ParcelReport {
  const pathway: HousingPathwayRow = { useType: 'multi_unit', useLabel: 'Multi-unit residential', rawDistrict: 'RM-H', districtKey: 'RM-H', pathway: 'P', rag: 'GREEN', standards: [], sourceUrl: 'https://example.test/code', ruleVersion: 'use-table-v1', codeAsOf: null, verifiedAt: '2026-09-27', reviewStatus: 'verified', notes: '' }
  const scorecard: ScreeningScorecard = { parcelId: '0052P00130000000', scoreVersion: 'LDES-v3-screening-scorecard', screeningRag: 'AMBER', projectFeasibility: 'NOT_ASSESSED', pathwaySummary: 'BY_RIGHT_PATH_IDENTIFIED', housingPathways: [pathway], mappedConstraints: [], reviewTasks: [], evidenceGaps: [], unassessed: ['Financial feasibility'], requiredSourceCoverage: { slope: true }, ruleVersions: ['use-table-v1'] }
  return { pin: '0052P00130000000', address: '5000 FORBES AVE', scorecard, fallbackSummary: 'Amber summary', selected: { feature: { type: 'Feature', properties: { PIN: '0052P00130000000' }, geometry: { type: 'Polygon', coordinates: [] } }, assessment: { PARID: '0052P00130000000', LOTAREA: 10000 }, zoning: { code: 'RM-H', description: 'Residential', definitionUrl: 'https://example.test/zoning', updatedAt: null }, ldes: { districts: ['RM-H'], retrievedAt: '2026-09-27T12:00:00Z' } } }
}

describe('parcel chat client', () => {
  it('maps report facts, project assumptions, and chat turns into the route request', () => {
    const request = buildParcelChatRequest(report(), brief({ housingType: 'multi_unit', unitCount: 12 }), [{ role: 'user', content: 'Can I build apartments?' }], true)
    expect(request).toMatchObject({ pin: '0052P00130000000', allowWebSearch: true, projectBrief: { unitCount: 12 } })
    expect(request.reportFacts.assessor).toMatchObject({ lotArea: 10000 })
    expect(request.messages[0].content).toContain('apartments')
  })

  it('returns a deterministic out-of-scope answer for a school question', () => {
    const answer = deterministicChatFallback(report(), 'Could I build a school here?', brief())
    expect(answer.mode).toBe('out_of_scope')
    expect(answer.answer).toContain('non-residential')
  })

  it('labels report and web citations distinctly', () => {
    expect(citationLabel({ sourceId: 'use-table-v1', reportSection: 'pathways', kind: 'report' })).toBe('Report · Housing pathways')
    expect(citationLabel({ sourceId: 'web-1', reportSection: 'research', kind: 'web', title: 'City code', url: 'https://example.test', provider: 'tavily', retrievedAt: '2026-09-27T12:00:00Z' })).toContain('Web-sourced')
    expect(citationLabel({ sourceId: 'pittsburgh-chapter-902', reportSection: 'official zoning reference', kind: 'official', title: 'Chapter 902', url: 'https://example.test', provider: 'Pittsburgh Code', retrievedAt: '2026-09-27' })).toContain('Official source')
  })

  it('uses the official zoning reference for a general code question in fallback mode', () => {
    const answer = deterministicChatFallback(report(), 'What does RM-H zoning mean?', brief())
    expect(answer.answer).toContain('Multi-Unit Residential')
    expect(answer.citations.some((citation) => citation.kind === 'official')).toBe(true)
  })

  it('merges a server project brief patch safely', () => {
    expect(mergeChatProjectBrief(brief(), { housingType: 'two_unit', stories: 2 })).toEqual(brief({ housingType: 'two_unit', stories: 2 }))
  })

  it('posts a request and returns the structured response', async () => {
    const response = { mode: 'fact', answer: 'The parcel is AMBER.', projectCheck: null, citations: [], missingInputs: [], suggestedQuestions: [], fallback: true }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(sendParcelChat(buildParcelChatRequest(report(), brief(), [{ role: 'user', content: 'Why?' }]))).resolves.toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith('/api/parcel-chat', expect.objectContaining({ method: 'POST' }))
  })

  it('decodes streamed deltas and resolves on a complete event', async () => {
    const response = { mode: 'fact', answer: 'The parcel is AMBER.', projectCheck: null, citations: [], missingInputs: [], suggestedQuestions: [], fallback: false }
    const encoder = new TextEncoder()
    const chunks = [
      'event: start\ndata: {"requestId":"r1"}\n\n',
      'event: delta\ndata: {"text":"The parcel is "}\n\n',
      'event: delta\ndata: {"text":"AMBER."}\n\n',
      `event: complete\ndata: ${JSON.stringify(response)}\n\n`,
    ]
    const stream = new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(encoder.encode(chunk)); controller.close() } })
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }))
    vi.stubGlobal('fetch', fetchMock)
    const deltas: string[] = []
    await expect(streamParcelChat(buildParcelChatRequest(report(), brief(), [{ role: 'user', content: 'Why?' }]), { onDelta: (text) => deltas.push(text) })).resolves.toEqual(response)
    expect(deltas).toEqual(['The parcel is ', 'AMBER.'])
    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe('text/event-stream')
  })

  it('resolves with a fallback event and reports stream errors', async () => {
    const response = { mode: 'insufficient_data', answer: 'The report facts are incomplete.', projectCheck: null, citations: [], missingInputs: ['zoning'], suggestedQuestions: [], fallback: true }
    const body = `event: fallback\ndata: ${JSON.stringify(response)}\n\n`
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }))
    vi.stubGlobal('fetch', fetchMock)
    const fallback = vi.fn()
    await expect(streamParcelChat(buildParcelChatRequest(report(), brief(), [{ role: 'user', content: 'Why?' }]), { onFallback: fallback })).resolves.toEqual(response)
    expect(fallback).toHaveBeenCalledWith(response)
  })

  it('rejects a stream that ends without a terminal event', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('event: delta\ndata: {"text":"partial"}\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(streamParcelChat(buildParcelChatRequest(report(), brief(), [{ role: 'user', content: 'Why?' }]))).rejects.toThrow(/terminal/i)
  })
})
