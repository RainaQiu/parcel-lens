import type { ParcelReport } from './reportView'
import { buildParcelChatContext, checkProjectConcept, emptyProjectBrief, mergeProjectBrief, type ParcelChatContext, type ProjectBrief } from './screening/chatContext'
import { lookupClientZoningReference } from './screening/zoningReference'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatCitation = {
  sourceId: string
  reportSection: string
  kind: 'report' | 'official' | 'web'
  url?: string
  title?: string
  retrievedAt?: string
  provider?: string
}

export type ParcelChatResponse = {
  mode: 'fact' | 'scenario' | 'insufficient_data' | 'out_of_scope'
  answer: string
  projectCheck: 'MATCH_FOUND' | 'REVIEW_PATH' | 'NO_LISTED_PATH' | 'INSUFFICIENT_DATA' | 'OUT_OF_SCOPE' | null
  citations: ChatCitation[]
  missingInputs: string[]
  suggestedQuestions: string[]
  projectBriefPatch?: Partial<ProjectBrief>
  fallback?: boolean
  fallbackReason?: string
  webSearch?: { attempted: boolean; used: boolean; provider?: string; unavailableReason?: string }
}

export type ParcelChatRequest = {
  pin: string
  reportFacts: ParcelChatContext
  projectBrief: ProjectBrief
  messages: ChatMessage[]
  allowWebSearch: boolean
}

let memorySessionId: string | null = null

function chatSessionId(): string {
  if (typeof window === 'undefined') return 'test-session'
  try {
    const key = 'parcel-lens-chat-session'
    const existing = window.sessionStorage.getItem(key)
    if (existing) return existing
    const created = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    window.sessionStorage.setItem(key, created)
    return created
  } catch {
    memorySessionId ??= `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return memorySessionId
  }
}

export function buildParcelChatRequest(report: ParcelReport, projectBrief: ProjectBrief, messages: ChatMessage[], allowWebSearch = false): ParcelChatRequest {
  const context = buildParcelChatContext(report, projectBrief)
  return { pin: report.pin, reportFacts: context, projectBrief: context.projectBrief, messages, allowWebSearch }
}

export function mergeChatProjectBrief(current: ProjectBrief, patch?: Partial<ProjectBrief>): ProjectBrief {
  return patch ? mergeProjectBrief(current, patch) : mergeProjectBrief(current, emptyProjectBrief())
}

function questionAnswer(report: ParcelReport, question: string, projectBrief: ProjectBrief): ParcelChatResponse {
  const context = buildParcelChatContext(report, projectBrief)
  const check = checkProjectConcept(report.scorecard, context.projectBrief)
  const lower = question.toLowerCase()
  const zoningReference = lookupClientZoningReference(question)
  if (zoningReference) return { mode: 'fact', answer: zoningReference.answer, projectCheck: null, citations: zoningReference.citations, missingInputs: [], suggestedQuestions: ['How does this district affect the housing pathways on this parcel?', 'What should I verify next?'] }
  if (/\b(school|hospital|commercial|retail|office|warehouse)\b/.test(lower) || check.status === 'OUT_OF_SCOPE') {
    return { mode: 'out_of_scope', answer: 'This question asks about a non-residential use that the current ParcelLens rule table does not verify. The report can show the parcel zoning and site evidence, but it cannot determine suitability without a use-specific rule table.', projectCheck: 'OUT_OF_SCOPE', citations: [], missingInputs: ['use-specific zoning rules'], suggestedQuestions: ['Which supported residential form should be checked?'] }
  }
  if (/\b(build|construct|project|apartment|housing|unit|home|residential)\b/.test(lower) && context.projectBrief.housingType !== 'unknown') {
    return { mode: check.status === 'INSUFFICIENT_DATA' ? 'insufficient_data' : 'scenario', answer: check.explanation, projectCheck: check.status, citations: [], missingInputs: check.missingInputs, suggestedQuestions: check.missingInputs.length ? ['What housing form and proposed footprint should be checked?'] : ['Which dimensional, parking, access, and engineering rules should be verified next?'] }
  }
  if (/\b(why|score|amber|green|red|unrated|grade|result)\b/.test(lower)) {
    const task = context.reviewTasks.find((item) => item.scoreEffect === 'triggered')
    const answer = `The parcel is ${context.screeningRag}: ${report.fallbackSummary} Project feasibility remains unassessed.`
    return { mode: 'fact', answer, projectCheck: null, citations: task ? task.sourceRefs.map((sourceId) => ({ sourceId, reportSection: 'drivers', kind: 'report' as const })) : [], missingInputs: context.evidenceGaps.map((gap) => gap.reason).slice(0, 5), suggestedQuestions: ['Which housing pathway should I inspect?', 'What should I verify first?'] }
  }
  if (/\b(path|housing|residential|allowed|permit|use|unit)\b/.test(lower)) {
    const rows = context.housingPathways.slice(0, 8).map((row) => `${row.useLabel || row.useType}: ${row.pathway}`).join('; ')
    return { mode: 'fact', answer: `The checked residential pathways are: ${rows || 'not available'}. These are base-district listings only; dimensions, parking, access, overlays, and project feasibility remain unassessed.`, projectCheck: null, citations: context.housingPathways[0] ? [{ sourceId: context.housingPathways[0].ruleVersion, reportSection: 'pathways', kind: 'report' }] : [], missingInputs: [], suggestedQuestions: ['What should I verify for my proposed footprint?'] }
  }
  return { mode: 'insufficient_data', answer: 'I can answer questions about this parcel report, verified housing pathways, mapped constraints, evidence gaps, and project inputs. This report does not assess permit approval, development cost, or financial feasibility.', projectCheck: null, citations: [], missingInputs: context.unassessed.slice(0, 5), suggestedQuestions: ['Why is this parcel rated this way?', 'What should I verify first?'] }
}

export function deterministicChatFallback(report: ParcelReport, question: string, projectBrief = emptyProjectBrief()): ParcelChatResponse {
  return { ...questionAnswer(report, question, projectBrief), fallback: true, fallbackReason: 'The assistant is using the report facts without an LLM response.' }
}

export function citationLabel(citation: ChatCitation): string {
  if (citation.kind === 'web') return `Web-sourced${citation.provider ? ` · ${citation.provider}` : ''}${citation.title ? ` · ${citation.title}` : ''}`
  if (citation.kind === 'official') return `Official source${citation.provider ? ` · ${citation.provider}` : ''}${citation.title ? ` · ${citation.title}` : ''}`
  const labels: Record<string, string> = { overview: 'Overview', drivers: 'Review tasks', pathways: 'Housing pathways', unknowns: 'Unknowns', evidence: 'Evidence' }
  return `Report · ${labels[citation.reportSection] ?? citation.reportSection}`
}

export async function sendParcelChat(request: ParcelChatRequest, signal?: AbortSignal): Promise<ParcelChatResponse> {
  const response = await fetch('/api/parcel-chat', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-parcel-chat-session': chatSessionId() }, body: JSON.stringify(request), signal })
  let value: unknown
  try { value = await response.json() } catch { throw new Error('The parcel assistant returned an unreadable response.') }
  if (!response.ok) throw new Error(typeof value === 'object' && value !== null && 'error' in value ? String(value.error) : 'The parcel assistant is unavailable.')
  if (!value || typeof value !== 'object' || typeof (value as { answer?: unknown }).answer !== 'string') throw new Error('The parcel assistant returned an invalid response.')
  return value as ParcelChatResponse
}
