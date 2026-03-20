import { useEffect, useState, useRef } from 'react'
import { Upload, FileText, Trash2, Plus, Database, AlertTriangle, CheckCircle, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../services/api'

// ---- API calls ----
const getDocuments = () => api.get('/knowledge/documents')
const getKBStats = () => api.get('/knowledge/stats')
const ingestText = (data) => api.post('/knowledge/ingest/text', data)
const deleteDocument = (doc_id) => api.delete(`/knowledge/documents/${doc_id}`)
const ingestFile = (formData) => api.post('/knowledge/ingest/file', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

const CATEGORIES = [
  'onboarding', 'relieving', 'laptop_new_entry', 'laptop_replacement',
  'hr_policy', 'it_policy', 'finance_policy', 'compliance', 'general'
]

const categoryColor = {
  onboarding: 'badge-green',
  relieving: 'badge-red',
  laptop_new_entry: 'badge-blue',
  laptop_replacement: 'badge-purple',
  hr_policy: 'badge-amber',
  it_policy: 'badge-blue',
  finance_policy: 'badge-amber',
  compliance: 'badge-purple',
  general: 'badge-gray'
}

// ---- Text Ingest Modal ----
function TextIngestModal({ onClose, onIngested }) {
  const [form, setForm] = useState({ title: '', content: '', category: 'general' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.content.trim().length < 50) {
      toast.error('Content must be at least 50 characters')
      return
    }
    setLoading(true)
    try {
      const res = await ingestText(form)
      toast.success(res.data.message)
      onIngested()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to ingest')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>Ingest Text / Document</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Leave Policy 2024" required />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Content * <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(paste your document text, policy, SOP, etc.)</span></label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={10}
              placeholder="Paste your company policy, process document, SOP, or any sensitive information here...

Example:
# Leave Policy
Employees are entitled to 18 days of paid leave per year...

This content will be embedded into the knowledge base and used to answer questions."
              required
              style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7 }}
            />
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
              {form.content.length} characters · ~{Math.ceil(form.content.length / 400)} chunks will be created
            </div>
          </div>
          <div style={{ background: 'var(--amber-bg)', border: '1px solid #3a2a0a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={14} style={{ color: 'var(--amber)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: 'var(--amber)' }}>
              This content will be searchable by all users via the AI chat. Only ingest non-confidential process documentation.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="loading-spinner" style={{ width: 14, height: 14 }}></span> Ingesting...</> : <><Plus size={14} /> Ingest Document</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- File Upload Modal ----
function FileUploadModal({ onClose, onIngested }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    const allowed = ['application/pdf', 'text/plain', 'text/markdown']
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt', 'md'].includes(ext)) {
      toast.error('Only PDF, TXT, and MD files are supported')
      return
    }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Please select a file'); return }
    if (!title.trim()) { toast.error('Title is required'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      fd.append('category', category)
      const res = await ingestFile(fd)
      toast.success(res.data.message)
      onIngested()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>Upload File</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--green)' : 'var(--border2)'}`,
              borderRadius: 10,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'rgba(79,142,247,0.05)' : file ? 'rgba(52,211,153,0.05)' : 'var(--bg3)',
              marginBottom: 16,
              transition: 'all 0.2s'
            }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt,.md" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            {file ? (
              <>
                <CheckCircle size={28} style={{ color: 'var(--green)', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 500, fontSize: 14 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB — click to change
                </div>
              </>
            ) : (
              <>
                <Upload size={28} style={{ color: 'var(--text3)', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 500 }}>Drop file here or click to browse</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>PDF, TXT, MD — max 10MB</div>
              </>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. IT Security Policy" required />
            </div>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file}>
              {loading ? <><span className="loading-spinner" style={{ width: 14, height: 14 }}></span> Uploading...</> : <><Upload size={14} /> Upload & Ingest</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---- Delete Confirm Modal ----
function DeleteModal({ doc, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteDocument(doc.doc_id)
      toast.success(`Deleted "${doc.title}"`)
      onDeleted()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={18} style={{ color: 'var(--red)' }} />
          </div>
          <div className="modal-title" style={{ margin: 0 }}>Delete Document</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
          Are you sure you want to delete <strong>"{doc.title}"</strong>?
        </p>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>
          This will remove all {doc.chunk_count} chunks from the knowledge base. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Main Page ----
export default function KnowledgeBase() {
  const [docs, setDocs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showText, setShowText] = useState(false)
  const [showFile, setShowFile] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [docsRes, statsRes] = await Promise.all([getDocuments(), getKBStats()])
      setDocs(docsRes.data)
      setStats(statsRes.data)
    } catch (err) {
      toast.error('Failed to load knowledge base')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase()) ||
    d.uploaded_by.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} style={{ color: 'var(--accent)' }} />
            Knowledge Base
          </div>
          <div className="page-sub">Admin only — Manage documents ingested into the AI knowledge base</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-ghost" onClick={() => setShowFile(true)}>
            <Upload size={15} /> Upload File
          </button>
          <button className="btn btn-primary" onClick={() => setShowText(true)}>
            <Plus size={15} /> Add Text
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Chunks</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.total_chunks}</div>
            <div className="stat-sub">Vectors in store</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Custom Documents</div>
            <div className="stat-value" style={{ color: 'var(--purple)' }}>{stats.custom_documents}</div>
            <div className="stat-sub">Admin ingested</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Default SOPs</div>
            <div className="stat-value" style={{ color: 'var(--teal)' }}>{stats.default_documents}</div>
            <div className="stat-sub">Built-in processes</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Categories</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.total_documents}</div>
            <div className="stat-sub">Total documents</div>
          </div>
        </div>
      )}

      {/* Default docs notice */}
      <div style={{
        background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-start', gap: 10
      }}>
        <FileText size={15} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text)' }}>4 built-in SOPs</strong> are always active — onboarding, relieving, laptop new entry, laptop replacement.
          They cannot be deleted. Add your own company documents below to extend the knowledge base.
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search documents by title, category, or uploader..." style={{ maxWidth: 400 }} />
      </div>

      {/* Custom docs table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>Custom Ingested Documents</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} documents</div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <span className="loading-spinner" style={{ width: 22, height: 22 }}></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 20px' }}>
            <Database size={36} style={{ color: 'var(--text3)', margin: '0 auto 14px' }} />
            <div style={{ fontWeight: 500, marginBottom: 6 }}>No custom documents yet</div>
            <p>Click "Add Text" or "Upload File" to ingest your company's sensitive documents, policies, and SOPs into the AI knowledge base.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowFile(true)}>Upload File</button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowText(true)}>Add Text</button>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Chunks</th>
                  <th>Uploaded By</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.doc_id}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        {doc.title}
                      </div>
                      <div className="mono" style={{ color: 'var(--text3)', fontSize: 10, marginTop: 2 }}>{doc.doc_id}</div>
                    </td>
                    <td>
                      <span className={`badge ${categoryColor[doc.category] || 'badge-gray'}`}>
                        {doc.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                        {doc.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--purple)' }}>{doc.chunk_count}</span>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{doc.uploaded_by}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {new Date(doc.uploaded_at).toLocaleDateString()}<br />
                      <span style={{ fontSize: 10 }}>{new Date(doc.uploaded_at).toLocaleTimeString()}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteDoc(doc)}
                        style={{ padding: '5px 10px' }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showText && <TextIngestModal onClose={() => setShowText(false)} onIngested={load} />}
      {showFile && <FileUploadModal onClose={() => setShowFile(false)} onIngested={load} />}
      {deleteDoc && <DeleteModal doc={deleteDoc} onClose={() => setDeleteDoc(null)} onDeleted={load} />}
    </div>
  )
}
