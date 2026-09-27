import { useEffect, useRef, useState } from 'react'
import type { ParcelReport } from '../lib/reportView'
import { buildParcelChatRequest, citationLabel, deterministicChatFallback, mergeChatProjectBrief, streamParcelChat, type ChatMessage, type ParcelChatResponse } from '../lib/parcelChat'
import { shouldFollowLatest } from '../lib/chatScroll'
import { emptyProjectBrief, type ProjectBrief, type ProjectHousingType } from '../lib/screening/chatContext'

type Props = { report: ParcelReport }
type DisplayTurn = { message: ChatMessage; response?: ParcelChatResponse }

const suggestedQuestions = ['Why is this parcel rated this way?', 'Which residential paths are listed?', 'What should I verify first?']

function answerMessage(response: ParcelChatResponse): ChatMessage {
  return { role: 'assistant', content: response.answer }
}

export function ParcelChat({ report }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [turns, setTurns] = useState<DisplayTurn[]>([])
  const [question, setQuestion] = useState('')
  const [projectBrief, setProjectBrief] = useState<ProjectBrief>(emptyProjectBrief())
  const [allowWebSearch, setAllowWebSearch] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [showContext, setShowContext] = useState(true)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const userScrolledRef = useRef(false)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    const node = messagesRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    if (shouldFollowLatest({ distanceFromBottom, userScrolled: userScrolledRef.current })) {
      node.scrollTo({ top: node.scrollHeight, behavior: 'auto' })
    }
  }, [turns.length, busy, streamingAnswer])

  function updateBrief(patch: Partial<ProjectBrief>) {
    setProjectBrief((current) => mergeChatProjectBrief(current, patch))
  }

  function ask(value = question, options: { retry?: boolean } = {}) {
    const content = value.trim()
    if (!content || busy) return
    const lastUserIndex = options.retry ? [...messages].map((message, index) => message.role === 'user' ? index : -1).filter((index) => index >= 0).pop() : undefined
    const baseMessages = lastUserIndex === undefined ? messages : messages.slice(0, lastUserIndex)
    const lastUserTurnIndex = options.retry ? [...turns].map((turn, index) => turn.message.role === 'user' ? index : -1).filter((index) => index >= 0).pop() : undefined
    const baseTurns = lastUserTurnIndex === undefined ? turns : turns.slice(0, lastUserTurnIndex)
    const nextMessages = [...baseMessages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setTurns([...baseTurns, { message: { role: 'user', content } }])
    setShowContext(false)
    setComposerExpanded(false)
    setStreamingAnswer('')
    userScrolledRef.current = false
    setShowJumpToLatest(false)
    setQuestion('')
    setBusy(true)
    setNotice(null)
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    const request = buildParcelChatRequest(report, projectBrief, nextMessages, allowWebSearch)
    void streamParcelChat(request, {
      onDelta: (delta) => setStreamingAnswer((current) => current + delta),
    }, controller.signal).then((response) => {
      if (controller.signal.aborted) return
      if (response.projectBriefPatch) setProjectBrief((current) => mergeChatProjectBrief(current, response.projectBriefPatch))
      setMessages((current) => [...current, answerMessage(response)])
      setTurns((current) => [...current, { message: answerMessage(response), response }])
      setStreamingAnswer('')
      if (response.webSearch?.used) setNotice('This answer includes web-retrieved content. Sentences marked “Web-sourced” come from external webpages.')
      else if (response.fallback) setNotice('Showing a fallback answer based on the report source facts.')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      const fallback = deterministicChatFallback(report, content, projectBrief)
      setMessages((current) => [...current, answerMessage(fallback)])
      setTurns((current) => [...current, { message: answerMessage(fallback), response: fallback }])
      setStreamingAnswer('')
      setNotice(error instanceof Error ? `${error.message} Switched to a report-facts fallback.` : 'The assistant is temporarily unavailable; switched to a report-facts fallback.')
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false)
    })
  }

  function stopGenerating() {
    abortRef.current?.abort()
    abortRef.current = null
    setBusy(false)
    setStreamingAnswer('')
    setNotice('Generation stopped. Your previous answers are still available.')
  }

  function retryLastAnswer() {
    const lastUser = [...turns].reverse().find((turn) => turn.message.role === 'user')
    if (lastUser) ask(lastUser.message.content, { retry: true })
  }

  function clearConversation() {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setTurns([])
    setQuestion('')
    setProjectBrief(emptyProjectBrief())
    setAllowWebSearch(false)
    setNotice(null)
    setStreamingAnswer('')
    setShowContext(true)
    setComposerExpanded(false)
    userScrolledRef.current = false
    setShowJumpToLatest(false)
    setBusy(false)
  }

  function handleMessagesScroll() {
    const node = messagesRef.current
    if (!node) return
    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
    userScrolledRef.current = distanceFromBottom > 48
    setShowJumpToLatest(userScrolledRef.current)
  }

  function jumpToLatest() {
    const node = messagesRef.current
    if (!node) return
    userScrolledRef.current = false
    setShowJumpToLatest(false)
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
  }

  return <>
    <section className="parcel-chat-card" aria-label="Ask about this parcel">
      <div><p className="eyebrow">Parcel assistant</p><h2>Ask about this parcel</h2><p>Ask questions using verified report facts, or add a housing type, project size, and land-control assumption.</p></div>
      <button type="button" className="primary-button parcel-chat-open" onClick={() => setOpen(true)}>Open assistant</button>
    </section>
    {open && <div className="parcel-chat-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className={`parcel-chat-drawer${messages.length > 0 ? ' has-conversation' : ''}`} role="dialog" aria-modal="true" aria-labelledby="parcel-chat-title">
        <header className="parcel-chat-header"><div><p className="eyebrow">Parcel assistant</p><h2 id="parcel-chat-title">Ask about {report.address}</h2></div><div className="parcel-chat-header-actions">{messages.length > 0 && <button type="button" className="parcel-chat-clear" onClick={clearConversation}>Clear</button>}<button type="button" className="parcel-chat-close" onClick={() => setOpen(false)} aria-label="Close assistant">×</button></div></header>
        {showContext ? <div className="parcel-chat-context">
          <div className="parcel-chat-scope">Scope: the current Parcel Report, connected official sources, and project assumptions you provide. When web research is enabled, external content is marked <b>Web-sourced</b>.</div>
          <details className="parcel-chat-assumptions"><summary>Project assumptions (optional)</summary><div className="parcel-chat-fields">
            <label>Housing type<select value={projectBrief.housingType} onChange={(event) => updateBrief({ housingType: event.target.value as ProjectHousingType })}><option value="unknown">Choose later</option><option value="single_detached">Single detached</option><option value="single_attached">Single attached</option><option value="two_unit">Two-unit</option><option value="three_unit">Three-unit</option><option value="multi_unit">Multi-unit</option></select></label>
            <label>Units<input type="number" min="1" max="10000" value={projectBrief.unitCount ?? ''} onChange={(event) => updateBrief({ unitCount: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Stories<input type="number" min="1" max="200" value={projectBrief.stories ?? ''} onChange={(event) => updateBrief({ stories: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Footprint sq ft<input type="number" min="1" value={projectBrief.proposedFootprintSqft ?? ''} onChange={(event) => updateBrief({ proposedFootprintSqft: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Land control<select value={projectBrief.landControl} onChange={(event) => updateBrief({ landControl: event.target.value as ProjectBrief['landControl'] })}><option value="unknown">Unknown</option><option value="identified">Identified</option><option value="optioned">Optioned</option><option value="owned">Owned</option></select></label>
            <label className="parcel-chat-checkbox"><input type="checkbox" checked={projectBrief.costAssumptionsProvided} onChange={(event) => updateBrief({ costAssumptionsProvided: event.target.checked })} /> Cost assumptions provided</label>
          </div></details>
          <label className="parcel-chat-web-toggle"><input type="checkbox" checked={allowWebSearch} onChange={(event) => setAllowWebSearch(event.target.checked)} /> Allow web research when the report cannot answer</label>
          {messages.length > 0 && <button type="button" className="parcel-chat-context-hide" onClick={() => setShowContext(false)}>Hide context and settings</button>}
        </div> : <div className="parcel-chat-context-collapsed"><span>Report context and settings are hidden</span><button type="button" onClick={() => setShowContext(true)}>Show context and settings</button></div>}
        <div ref={messagesRef} className="parcel-chat-messages" aria-live="polite" onScroll={handleMessagesScroll}>
          {!messages.length && <div className="parcel-chat-welcome"><p><b>Try a question about this parcel.</b></p><div className="parcel-chat-suggestions">{suggestedQuestions.map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div></div>}
          {turns.map((turn, index) => <div className={`parcel-chat-message ${turn.message.role}`} key={`${turn.message.role}-${index}`}><span className="parcel-chat-role">{turn.message.role === 'user' ? 'You' : 'ParcelLens'}</span><p>{turn.message.content}</p>{turn.response && <div className="parcel-chat-citations">{turn.response.citations.map((citation) => citation.kind === 'web' && citation.url ? <a href={citation.url} target="_blank" rel="noreferrer" key={`${citation.sourceId}-${citation.url}`}><b>{citationLabel(citation)}</b>{citation.retrievedAt ? ` · retrieved ${citation.retrievedAt}` : ''} ↗</a> : <a href={`#${citation.reportSection}`} key={`${citation.sourceId}-${citation.reportSection}`} onClick={() => setOpen(false)}>{citationLabel(citation)}</a>)}</div>}</div>)}
          {busy && <div className="parcel-chat-message assistant parcel-chat-streaming"><span className="parcel-chat-role">ParcelLens</span><p role="status">{streamingAnswer || 'Generating…'}</p><span className="parcel-chat-streaming-label">Generating…</span></div>}
        </div>
        {showJumpToLatest && <button type="button" className="parcel-chat-jump" onClick={jumpToLatest}>Jump to latest</button>}
        {messages.length > 0 && <div className="parcel-chat-followups" aria-label="Suggested questions">{suggestedQuestions.map((item) => <button type="button" key={item} onClick={() => ask(item)} disabled={busy}>{item}</button>)}</div>}
        {notice && <p className="parcel-chat-notice" role="status">{notice}</p>}
        {(busy || messages.length > 0) && <div className="parcel-chat-actions">{busy ? <button type="button" onClick={stopGenerating}>Stop generating</button> : <button type="button" onClick={retryLastAnswer}>Retry last answer</button>}</div>}
        <form className={`parcel-chat-form${composerExpanded ? ' is-expanded' : ''}`} onSubmit={(event) => { event.preventDefault(); ask() }}><textarea value={question} onFocus={() => setComposerExpanded(true)} onBlur={() => { if (!question.trim()) setComposerExpanded(false) }} onChange={(event) => { setQuestion(event.target.value); setComposerExpanded(true) }} placeholder="Ask about the score, pathways, constraints, or your project concept…" maxLength={1800} rows={messages.length > 0 ? 2 : 3} aria-label="Ask about this parcel" /><button type="submit" className="primary-button" disabled={busy || !question.trim()}>{busy ? 'Checking…' : 'Ask'}</button></form>
        <p className="parcel-chat-footnote">Preliminary screen only; not a permit, cost, safety, or financial feasibility determination.</p>
      </section>
    </div>}
  </>
}
