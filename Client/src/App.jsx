import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import ChatPanel from './components/ChatPanel'
import UploadModal from './components/UploadModal'
import './App.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [docsLoading, setDocsLoading] = useState(true)

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API}/documents`)
      const data = await res.json()
      setDocuments(data.documents || [])
    } catch (e) {
      console.error('Failed to fetch documents', e)
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  const sendMessage = async (question) => {
    const userMsg = { role: 'user', content: question, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, top_k: 8 }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Server error')
      }
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        id: Date.now() + 1,
      }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'error',
        content: e.message,
        id: Date.now() + 1,
      }])
    } finally {
      setLoading(false)
    }
  }

  const deleteDocument = async (name) => {
    try {
      await fetch(`${API}/documents/${encodeURIComponent(name)}`, { method: 'DELETE' })
      fetchDocs()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        documents={documents}
        docsLoading={docsLoading}
        onUploadClick={() => setUploadOpen(true)}
        onDeleteDocument={deleteDocument}
        onClearChat={() => setMessages([])}
      />
      <ChatPanel
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        hasDocuments={documents.length > 0}
      />
      {uploadOpen && (
        <UploadModal
          apiUrl={API}
          onClose={() => setUploadOpen(false)}
          onUploaded={() => { fetchDocs(); setUploadOpen(false) }}
        />
      )}
    </div>
  )
}