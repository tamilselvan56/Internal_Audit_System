import { useState, useRef, useEffect } from 'react'
import { queryKnowledge } from '../services/api'
import { Send, Bot, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  'What is the complete onboarding process for a new employee?',
  'How do I add a new laptop entry in the system?',
  'What are the steps for employee relieving process?',
  'How to do a laptop replacement for an employee?',
  'What documents are needed for onboarding?',
  'What happens to system access when an employee is relieved?',
]

export default function AskAnything() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hello! I'm your internal audit assistant. Ask me anything about HR processes (onboarding, relieving) or IT processes (laptop entry, replacement). I'll give you step-by-step answers based on your organization's documentation."
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (question) => {
    const q = question || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await queryKnowledge(q)
      setMessages(prev => [...prev, {
        role: 'ai',
        text: res.data.answer,
        sources: res.data.sources,
        chunks: res.data.chunks_used
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Failed to get a response. Please check that the backend is running and the LLM API key is configured.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="page-title">Ask Anything</div>
          <div className="page-sub">AI-powered answers from your process documentation</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
          <Sparkles size={12} />
          RAG-powered
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
        {/* Suggestions (shown when only greeting) */}
        {messages.length === 1 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Try asking</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)} className="btn btn-ghost btn-sm" style={{ fontSize: 12, textAlign: 'left', whiteSpace: 'normal', height: 'auto', padding: '7px 12px' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chat-wrap">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-msg ${msg.role}`}>
              <div className={`chat-avatar ${msg.role}`}>
                {msg.role === 'ai' ? <Bot size={14} /> : '👤'}
              </div>
              <div>
                <div className={`chat-bubble ${msg.role}`}>
                  {msg.text}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>Sources:</span>
                    {msg.sources.map(s => (
                      <span key={s} className="badge badge-blue" style={{ fontSize: 10, padding: '2px 8px' }}>
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{msg.chunks} chunks</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg ai">
              <div className="chat-avatar ai"><Bot size={14} /></div>
              <div className="chat-bubble ai" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="loading-spinner" style={{ width: 14, height: 14 }}></span>
                Searching knowledge base...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about any process — onboarding, relieving, laptop entry, laptop replacement..."
          rows={2}
          style={{ flex: 1, resize: 'none', borderRadius: 'var(--radius-lg)' }}
          disabled={loading}
        />
        <button className="btn btn-primary" onClick={() => sendMessage()} disabled={loading || !input.trim()}
          style={{ padding: '12px 16px', flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Press Enter to send · Shift+Enter for new line</div>
    </div>
  )
}
