import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'

const SUGGESTIONS = [
  'Summarize the key contributions of the uploaded papers.',
  'Compare the methodologies used across the papers.',
  'What are the main limitations discussed in these papers?',
  'What future work do the authors suggest?',
]

export default function ChatPanel({ messages, loading, onSend, hasDocuments }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = () => {
    const q = input.trim()
    if (!q || loading) return
    onSend(q)
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
    }
  }

  return (
    <main className="chat-panel">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-graphic">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="1" opacity="0.15"/>
                <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="1" opacity="0.25"/>
                <path d="M20 32 C20 25.4 25.4 20 32 20 C38.6 20 44 25.4 44 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
                <circle cx="32" cy="32" r="3" fill="currentColor" opacity="0.6"/>
                <path d="M32 29v-9M32 44v-9" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                <path d="M23 35l-7.8 4.5M48.8 24.5L41 28" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
                <path d="M23 29l-7.8-4.5M48.8 39.5L41 36" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
              </svg>
            </div>
            <h2>Research Intelligence Ready</h2>
            <p>
              {hasDocuments
                ? 'Ask anything about your uploaded papers. I can compare, summarize, and cite sources precisely.'
                : 'Upload research papers from the sidebar to get started.'}
            </p>
            {hasDocuments && (
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion-chip" onClick={() => onSend(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {loading && (
              <div className="message-row assistant">
                <div className="avatar assistant-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="bubble assistant-bubble thinking">
                  <span/><span/><span/>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            placeholder={hasDocuments ? 'Ask about your research papers…' : 'Upload documents first…'}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            disabled={loading || !hasDocuments}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading || !hasDocuments}
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <p className="input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </main>
  )
}
