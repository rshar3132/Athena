import { useState } from 'react'

function formatAnswer(text) {
  // Bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
  // Line breaks
  text = text.split('\n').map(line => `<p>${line}</p>`).join('')
  return text
}

export default function MessageBubble({ message }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const isUser = message.role === 'user'
  const isError = message.role === 'error'

  if (isUser) {
    return (
      <div className="message-row user">
        <div className="bubble user-bubble">
          {message.content}
        </div>
        <div className="avatar user-avatar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="message-row assistant">
        <div className="avatar assistant-avatar error-avatar">!</div>
        <div className="bubble error-bubble">{message.content}</div>
      </div>
    )
  }

  return (
    <div className="message-row assistant">
      <div className="avatar assistant-avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="assistant-content">
        <div
          className="bubble assistant-bubble"
          dangerouslySetInnerHTML={{ __html: formatAnswer(message.content) }}
        />
        {message.sources && message.sources.length > 0 && (
          <div className="sources-section">
            <button
              className="sources-toggle"
              onClick={() => setSourcesOpen(!sourcesOpen)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
              <svg
                width="10" height="10" viewBox="0 0 24 24" fill="none"
                style={{ transform: sourcesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {sourcesOpen && (
              <div className="sources-list">
                {message.sources.map((src, i) => (
                  <div key={i} className="source-card">
                    <div className="source-header">
                      <span className="source-index">{i + 1}</span>
                      <div className="source-meta">
                        <span className="source-paper">{src.paper_name}</span>
                        <span className="source-heading">{src.heading}</span>
                      </div>
                      <span className="source-score">{(src.score * 100).toFixed(0)}%</span>
                    </div>
                    <p className="source-text">"{src.text}{src.text.length >= 200 ? '…' : ''}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
