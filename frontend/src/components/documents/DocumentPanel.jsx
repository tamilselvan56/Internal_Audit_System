import { useEffect, useRef, useState } from 'react'
import { FilePlus, FileText, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { deleteAssetDocument, getAssetDocuments, uploadAssetDocument } from '../../services/api'
import { PERMISSIONS, usePermissions } from '../../hooks/usePermissions'

function FileBadge({ fileName }) {
  const ext = (fileName || '').split('.').pop()?.toUpperCase() || 'FILE'
  return (
    <span style={{
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: 10,
      fontWeight: 700,
      background: 'var(--bg4)',
      color: 'var(--text3)',
      fontFamily: 'monospace',
    }}>
      {ext}
    </span>
  )
}

function UploadModal({ entityId, onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('asset')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
    }
  }

  const handleSubmit = async () => {
    if (!file || !title.trim()) {
      toast.error('File and title are required')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('category', category)
      const response = await uploadAssetDocument(entityId, formData)
      onUploaded(response.data)
      toast.success('Document uploaded')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15 }}>
            <FilePlus size={16} style={{ color: 'var(--accent)' }} />
            Upload Asset Document
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
            <X size={16} />
          </button>
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? 'var(--green)' : 'var(--border2)'}`,
            borderRadius: 10,
            padding: '20px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--bg3)',
            marginBottom: 16,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {file ? (
            <>
              <FileText size={24} style={{ color: 'var(--green)', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 500, fontSize: 13 }}>{file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                {Math.round(file.size / 1024)} KB
              </div>
            </>
          ) : (
            <>
              <Upload size={24} style={{ color: 'var(--text3)', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 500 }}>Click to choose a file</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>PDF, DOC, DOCX, JPG, PNG</div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Title</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Document title" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="asset">Asset</option>
              <option value="invoice">Invoice</option>
              <option value="warranty">Warranty</option>
              <option value="allocation">Allocation</option>
              <option value="repair">Repair</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading || !file}>
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentPanel({ mode, entityId, title = 'Documents' }) {
  const { can } = usePermissions()
  const [showUpload, setShowUpload] = useState(false)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const canUpload = can(PERMISSIONS.DOCUMENT_UPLOAD)
  const canDelete = can(PERMISSIONS.DOCUMENT_DELETE)

  useEffect(() => {
    if (mode !== 'asset' || !entityId) return
    setLoading(true)
    getAssetDocuments(entityId)
      .then((response) => setDocs(response.data || []))
      .catch(() => toast.error('Failed to load asset documents'))
      .finally(() => setLoading(false))
  }, [entityId, mode])

  if (mode !== 'asset') {
    return (
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>
          This panel is currently wired for asset documents only.
        </div>
      </div>
    )
  }

  const handleDelete = async (documentId) => {
    const confirmed = window.confirm('Are you sure you want to remove this document? This action cannot be undone.')
    if (!confirmed) return

    setDeletingId(documentId)
    try {
      await deleteAssetDocument(entityId, documentId)
      setDocs((prev) => prev.filter((doc) => doc.id !== documentId))
      toast.success('Document removed')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove document')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
          <FileText size={15} style={{ color: 'var(--accent)' }} />
          {title}
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>({docs.length})</span>
        </div>
        {canUpload && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowUpload(true)}>
            <Upload size={12} /> Add Document
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text3)', fontSize: 13 }}>
          Loading documents...
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text3)', fontSize: 13 }}>
          <FileText size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <div>No asset documents loaded yet</div>
          <div style={{ marginTop: 6, fontSize: 11 }}>
            Upload a document to attach it to this asset.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map((doc, index) => (
            <div
              key={doc.file_path || `${doc.file_name}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
              }}
            >
              <FileText size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.title}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2, fontSize: 11, color: 'var(--text3)' }}>
                  <FileBadge fileName={doc.file_name} />
                  {doc.category && <span style={{ textTransform: 'capitalize' }}>{doc.category}</span>}
                  {doc.file_size_kb != null && <span>{doc.file_size_kb} KB</span>}
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          entityId={entityId}
          onClose={() => setShowUpload(false)}
          onUploaded={(doc) => setDocs((prev) => [doc, ...prev])}
        />
      )}
    </div>
  )
}
