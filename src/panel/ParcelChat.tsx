import { useEffect, useRef, useState } from 'react'
import type { ParcelReport } from '../lib/reportView'
import { buildParcelChatRequest, citationLabel, deterministicChatFallback, mergeChatProjectBrief, sendParcelChat, type ChatMessage, type ParcelChatResponse } from '../lib/parcelChat'
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
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  function updateBrief(patch: Partial<ProjectBrief>) {
    setProjectBrief((current) => mergeChatProjectBrief(current, patch))
  }

  function ask(value = question) {
    const content = value.trim()
    if (!content || busy) return
    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setTurns((current) => [...current, { message: { role: 'user', content } }])
    setQuestion('')
    setBusy(true)
    setNotice(null)
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    const request = buildParcelChatRequest(report, projectBrief, nextMessages, allowWebSearch)
    void sendParcelChat(request, controller.signal).then((response) => {
      if (controller.signal.aborted) return
      if (response.projectBriefPatch) setProjectBrief((current) => mergeChatProjectBrief(current, response.projectBriefPatch))
      setMessages((current) => [...current, answerMessage(response)])
      setTurns((current) => [...current, { message: answerMessage(response), response }])
      if (response.webSearch?.used) setNotice('回答包含联网检索内容；带有 “Web-sourced” 标记的句子来自外部网页。')
      else if (response.fallback) setNotice('当前显示基于报告原始事实的兜底回答。')
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return
      const fallback = deterministicChatFallback(report, content, projectBrief)
      setMessages((current) => [...current, answerMessage(fallback)])
      setTurns((current) => [...current, { message: answerMessage(fallback), response: fallback }])
      setNotice(error instanceof Error ? `${error.message} 已切换到报告事实兜底。` : '助手暂时不可用，已切换到报告事实兜底。')
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false)
    })
  }

  return <>
    <section className="parcel-chat-card" aria-label="Ask about this parcel">
      <div><p className="eyebrow">Parcel assistant</p><h2>Ask about this parcel</h2><p>用报告中的已验证事实提问，也可以补充住宅类型、规模和土地控制假设。</p></div>
      <button type="button" className="primary-button parcel-chat-open" onClick={() => setOpen(true)}>Open assistant</button>
    </section>
    {open && <div className="parcel-chat-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="parcel-chat-drawer" role="dialog" aria-modal="true" aria-labelledby="parcel-chat-title">
        <header className="parcel-chat-header"><div><p className="eyebrow">Parcel assistant</p><h2 id="parcel-chat-title">Ask about {report.address}</h2></div><button type="button" className="parcel-chat-close" onClick={() => setOpen(false)} aria-label="Close assistant">×</button></header>
        <div className="parcel-chat-scope">回答范围：当前 Parcel Report、已接入官方来源、你提供的项目假设。允许联网时，外部内容会明确标记为 <b>Web-sourced</b>。</div>
        <details className="parcel-chat-assumptions"><summary>Project assumptions (optional)</summary><div className="parcel-chat-fields">
          <label>Housing type<select value={projectBrief.housingType} onChange={(event) => updateBrief({ housingType: event.target.value as ProjectHousingType })}><option value="unknown">Choose later</option><option value="single_detached">Single detached</option><option value="single_attached">Single attached</option><option value="two_unit">Two-unit</option><option value="three_unit">Three-unit</option><option value="multi_unit">Multi-unit</option></select></label>
          <label>Units<input type="number" min="1" max="10000" value={projectBrief.unitCount ?? ''} onChange={(event) => updateBrief({ unitCount: event.target.value ? Number(event.target.value) : null })} /></label>
          <label>Stories<input type="number" min="1" max="200" value={projectBrief.stories ?? ''} onChange={(event) => updateBrief({ stories: event.target.value ? Number(event.target.value) : null })} /></label>
          <label>Footprint sq ft<input type="number" min="1" value={projectBrief.proposedFootprintSqft ?? ''} onChange={(event) => updateBrief({ proposedFootprintSqft: event.target.value ? Number(event.target.value) : null })} /></label>
          <label>Land control<select value={projectBrief.landControl} onChange={(event) => updateBrief({ landControl: event.target.value as ProjectBrief['landControl'] })}><option value="unknown">Unknown</option><option value="identified">Identified</option><option value="optioned">Optioned</option><option value="owned">Owned</option></select></label>
          <label className="parcel-chat-checkbox"><input type="checkbox" checked={projectBrief.costAssumptionsProvided} onChange={(event) => updateBrief({ costAssumptionsProvided: event.target.checked })} /> Cost assumptions provided</label>
        </div></details>
        <label className="parcel-chat-web-toggle"><input type="checkbox" checked={allowWebSearch} onChange={(event) => setAllowWebSearch(event.target.checked)} /> Allow web research when the report cannot answer</label>
        <div className="parcel-chat-messages" aria-live="polite">
          {!messages.length && <div className="parcel-chat-welcome"><p><b>Try a question about this parcel.</b></p><div className="parcel-chat-suggestions">{suggestedQuestions.map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div></div>}
          {turns.map((turn, index) => <div className={`parcel-chat-message ${turn.message.role}`} key={`${turn.message.role}-${index}`}><span className="parcel-chat-role">{turn.message.role === 'user' ? 'You' : 'ParcelLens'}</span><p>{turn.message.content}</p>{turn.response && <div className="parcel-chat-citations">{turn.response.citations.map((citation) => citation.kind === 'web' && citation.url ? <a href={citation.url} target="_blank" rel="noreferrer" key={`${citation.sourceId}-${citation.url}`}><b>{citationLabel(citation)}</b>{citation.retrievedAt ? ` · retrieved ${citation.retrievedAt}` : ''} ↗</a> : <a href={`#${citation.reportSection}`} key={`${citation.sourceId}-${citation.reportSection}`} onClick={() => setOpen(false)}>{citationLabel(citation)}</a>)}</div>}</div>)}
          {busy && <div className="parcel-chat-message assistant"><span className="parcel-chat-role">ParcelLens</span><p role="status">Checking the report…</p></div>}
        </div>
        {messages.length > 0 && <div className="parcel-chat-followups">{suggestedQuestions.map((item) => <button type="button" key={item} onClick={() => ask(item)} disabled={busy}>{item}</button>)}</div>}
        {notice && <p className="parcel-chat-notice" role="status">{notice}</p>}
        <form className="parcel-chat-form" onSubmit={(event) => { event.preventDefault(); ask() }}><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the score, pathways, constraints, or your project concept…" maxLength={1800} rows={3} aria-label="Ask about this parcel" /><button type="submit" className="primary-button" disabled={busy || !question.trim()}>{busy ? 'Checking…' : 'Ask'}</button></form>
        <p className="parcel-chat-footnote">This is a preliminary screen. It does not determine permit approval, cost, safety, or financial feasibility.</p>
      </section>
    </div>}
  </>
}
