import { useState, useRef } from 'react'

export default function UploadModal({ apiUrl, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [paperName, setPaperName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.endsWith('.pdf')) {
      setError('Only PDF files are supported.')
      return
    }
    setFile(f)
    setError('')
    if (!paperName) {
      setPaperName(f.name.replace('.pdf', '').replace(/[-_]/g, ' '))
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    if (paperName.trim()) form.append('paper_name', paperName.trim())

    try {
      const res = await fetch(`${apiUrl}/documents/upload`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed')
      onUploaded()
    } catch (e) {
      setError(e.message)
      setUploading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Upload Research Paper</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="file-selected">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M14 2v6h6M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
              <button className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); setPaperName('') }}>
                Remove
              </button>
            </div>
          ) : (
            <div className="drop-prompt">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" opacity="0.4">
                <path d="M12 5v14M5 12l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>Drop PDF here or <span>browse</span></p>
              <small>PDF files only</small>
            </div>
          )}
        </div>

        <div className="modal-field">
          <label>Paper Name <span>(optional)</span></label>
          <input
            type="text"
            placeholder="e.g. Attention Is All You Need"
            value={paperName}
            onChange={(e) => setPaperName(e.target.value)}
          />
          <small>Used as the citation label in answers</small>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="modal-submit" onClick={handleSubmit} disabled={!file || uploading}>
            {uploading ? (
              <><div className="spinner-small white" /> Indexing…</>
            ) : 'Upload & Index'}
          </button>
        </div>
      </div>
    </div>
  )
}
