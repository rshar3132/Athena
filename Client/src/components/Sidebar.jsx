import { useState } from 'react'

export default function Sidebar({ documents, docsLoading, onUploadClick, onDeleteDocument, onClearChat }) {
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = (name) => {
    if (confirmDelete === name) {
      onDeleteDocument(name)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(name)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-mark">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h1 className="sidebar-title">Scholar<span>AI</span></h1>
          <p className="sidebar-subtitle">Research Assistant</p>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-label">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Documents
          {documents.length > 0 && <span className="doc-count">{documents.length}</span>}
        </div>

        <button className="upload-btn" onClick={onUploadClick}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upload PDF
        </button>

        <div className="doc-list">
          {docsLoading ? (
            <div className="doc-empty">
              <div className="spinner-small"/>
              Loading…
            </div>
          ) : documents.length === 0 ? (
            <div className="doc-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" opacity="0.3">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <span>No documents yet</span>
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.name} className="doc-item">
                <div className="doc-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="doc-info">
                  <span className="doc-name">{doc.name}</span>
                  <span className="doc-meta">{doc.page_count}p · {doc.chunk_count} chunks</span>
                </div>
                <button
                  className={`doc-delete ${confirmDelete === doc.name ? 'confirm' : ''}`}
                  onClick={() => handleDelete(doc.name)}
                  title={confirmDelete === doc.name ? 'Click again to confirm' : 'Remove document'}
                >
                  {confirmDelete === doc.name ? '!' : '×'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="clear-btn" onClick={onClearChat}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Clear chat
        </button>
        <div className="rag-badge">
          <span className="badge-dot"/>
          BM25 + FAISS Hybrid RAG
        </div>
      </div>
    </aside>
  )
}