import { useEffect, useState } from 'react'
import {
  PlusCircle,
  ChevronRight,
  History,
  Laptop,
  Wrench,
  RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAssets,
  getAsset,
  getAssetDocuments,
  deleteAssetDocument,
  createAsset,
  assignAsset,
  replaceAsset,
  getEmployees,
  getAssetHistory,
  transitionAssetStatus,
} from '../services/api'
import AssetIntakeChecklist from '../components/checklist/AssetIntakeChecklist'
import DocumentPanel from '../components/documents/DocumentPanel'
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions'

const STATUS_META = {
  pending: { badge: 'badge-gray', label: 'pending intake' },
  available: { badge: 'badge-green', label: 'available' },
  assigned: { badge: 'badge-blue', label: 'assigned' },
  in_repair: { badge: 'badge-amber', label: 'in repair' },
  retired: { badge: 'badge-gray', label: 'retired' },
}

const ASSET_TYPES = ['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Monitor', 'Mouse', 'Keyboard', 'Headset', 'Data Card', 'Other']
const CONDITION_OPTIONS = ['new', 'good', 'fair', 'poor']

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending
  return <span className={`badge ${meta.badge}`}>{meta.label}</span>
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '-'
}

function formatMoney(value) {
  return value ? `Rs ${value}` : '-'
}

function SummaryCard({ icon: Icon, label, value, tone = 'var(--accent)' }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 42,
        height: 42,
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        background: `${tone}18`,
        color: tone,
        flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  )
}

function AddAssetModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    asset_tag: '',
    asset_type: 'Laptop',
    brand: '',
    model: '',
    serial_number: '',
    purchase_date: '',
    warranty_expiry: '',
    purchase_cost: '',
    vendor_name: '',
    vendor_invoice_no: '',
    location: '',
    condition: 'new',
    mac_address: '',
    processor: '',
    ram_gb: '',
    storage_gb: '',
    os_installed: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...form,
        purchase_date: form.purchase_date ? new Date(form.purchase_date).toISOString() : null,
        warranty_expiry: form.warranty_expiry ? new Date(form.warranty_expiry).toISOString() : null,
        purchase_cost: form.purchase_cost || null,
        vendor_name: form.vendor_name || null,
        vendor_invoice_no: form.vendor_invoice_no || null,
        location: form.location || null,
        condition: form.condition || null,
        mac_address: form.mac_address || null,
        processor: form.processor || null,
        ram_gb: form.ram_gb ? parseInt(form.ram_gb, 10) : null,
        storage_gb: form.storage_gb ? parseInt(form.storage_gb, 10) : null,
        os_installed: form.os_installed || null,
        notes: form.notes || null,
      }

      const res = await createAsset(payload)
      toast.success('Asset created. It starts in pending intake.')
      onCreated(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add asset')
    } finally {
      setLoading(false)
    }
  }

  const showHardwareFields = ['Laptop', 'Desktop'].includes(form.asset_type)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-title">Add New Asset</div>
        <form onSubmit={handleSubmit}>
          <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Asset basics
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Asset Tag *</label>
              <input name="asset_tag" value={form.asset_tag} onChange={handleChange} placeholder="LAP-2024-0001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Asset Type *</label>
              <select name="asset_type" value={form.asset_type} onChange={handleChange} required>
                {ASSET_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} placeholder="Dell, HP, Lenovo..." />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input name="model" value={form.model} onChange={handleChange} placeholder="Latitude 5540" />
            </div>
            <div className="form-group">
              <label className="form-label">Serial Number</label>
              <input name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="SN123456789" />
            </div>
            <div className="form-group">
              <label className="form-label">Condition</label>
              <select name="condition" value={form.condition} onChange={handleChange}>
                {CONDITION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input type="date" name="purchase_date" value={form.purchase_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Warranty Expiry</label>
              <input type="date" name="warranty_expiry" value={form.warranty_expiry} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Purchase Cost</label>
              <input name="purchase_cost" value={form.purchase_cost} onChange={handleChange} placeholder="85000" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input name="location" value={form.location} onChange={handleChange} placeholder="HQ - Floor 2" />
            </div>
            <div className="form-group">
              <label className="form-label">Vendor Name</label>
              <input name="vendor_name" value={form.vendor_name} onChange={handleChange} placeholder="Vendor Pvt Ltd" />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice Number</label>
              <input name="vendor_invoice_no" value={form.vendor_invoice_no} onChange={handleChange} placeholder="INV-2024-001" />
            </div>
          </div>

          {showHardwareFields && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 0 10px' }}>
                Hardware details
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">MAC Address</label>
                  <input name="mac_address" value={form.mac_address} onChange={handleChange} placeholder="00:1B:44:11:3A:B7" />
                </div>
                <div className="form-group">
                  <label className="form-label">Processor</label>
                  <input name="processor" value={form.processor} onChange={handleChange} placeholder="Intel i5 12th Gen" />
                </div>
                <div className="form-group">
                  <label className="form-label">RAM (GB)</label>
                  <input type="number" name="ram_gb" value={form.ram_gb} onChange={handleChange} placeholder="16" />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage (GB)</label>
                  <input type="number" name="storage_gb" value={form.storage_gb} onChange={handleChange} placeholder="512" />
                </div>
                <div className="form-group">
                  <label className="form-label">OS Installed</label>
                  <input name="os_installed" value={form.os_installed} onChange={handleChange} placeholder="Windows 11 Pro" />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Any additional info..." />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignModal({ asset, onClose, onDone }) {
  const [employees, setEmployees] = useState([])
  const [empId, setEmpId] = useState('')
  const [performer, setPerformer] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getEmployees('active').then((r) => setEmployees(r.data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await assignAsset(asset.id, { employee_id: parseInt(empId, 10), performed_by: performer })
      toast.success('Asset assigned')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to assign asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 430 }}>
        <div className="modal-title">Assign Asset</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
          Assign <strong className="mono">{asset.asset_tag}</strong> ({asset.brand || '-'} {asset.model || ''}) to an employee.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Employee *</label>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} required>
              <option value="">- Select employee -</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.employee_id})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned By *</label>
            <input value={performer} onChange={(e) => setPerformer(e.target.value)} placeholder="Your name" required />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReplaceModal({ employeeId, onClose, onDone }) {
  const [replacementAssets, setReplacementAssets] = useState([])
  const [newAssetId, setNewAssetId] = useState('')
  const [reason, setReason] = useState('')
  const [performer, setPerformer] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAssets().then((r) => {
      setReplacementAssets(r.data.filter((asset) => ['available', 'pending'].includes(asset.status)))
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await replaceAsset({
        new_asset_id: parseInt(newAssetId, 10),
        employee_id: employeeId,
        reason,
        performed_by: performer,
      })
      toast.success('Asset replacement completed')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to replace asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 430 }}>
        <div className="modal-title">Replace Asset</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Replacement Asset *</label>
            <select value={newAssetId} onChange={(e) => setNewAssetId(e.target.value)} required>
              <option value="">- Select asset -</option>
              {replacementAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.asset_tag} - {asset.brand || '-'} {asset.model || ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Replacement Reason *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Hardware failure, upgrade..." required />
          </div>
          <div className="form-group">
            <label className="form-label">Performed By *</label>
            <input value={performer} onChange={(e) => setPerformer(e.target.value)} placeholder="Your name" required />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Replace Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssetHistory({ assetId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAssetHistory(assetId).then((r) => setHistory(r.data)).finally(() => setLoading(false))
  }, [assetId])

  const actionColor = {
    assigned: 'var(--green)',
    returned: 'var(--amber)',
    replaced: 'var(--accent)',
    repair_out: 'var(--red)',
    repair_in: 'var(--green)',
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 30 }}><span className="loading-spinner" /></div>
  }

  if (history.length === 0) {
    return <div className="empty-state"><p>No history found</p></div>
  }

  return history.map((item) => (
    <div key={item.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: actionColor[item.action] || 'var(--text3)',
          marginTop: 5,
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 13, textTransform: 'capitalize' }}>
          <strong>{item.action.replace('_', ' ')}</strong> - Employee #{item.employee_id}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          By {item.performed_by || 'System'} | {new Date(item.action_date).toLocaleString()}
        </div>
        {item.reason && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{item.reason}</div>}
      </div>
    </div>
  ))
}

function StatusActionButton({ label, onClick, tone = 'ghost', disabled = false }) {
  const className =
    tone === 'success' ? 'btn btn-success btn-sm'
      : tone === 'danger' ? 'btn btn-danger btn-sm'
        : tone === 'primary' ? 'btn btn-primary btn-sm'
          : 'btn btn-ghost btn-sm'

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

function AssetDetailModal({ assetId, onClose, onAssign, onReplace }) {
  const { can } = usePermissions()
  const [asset, setAsset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [documents, setDocuments] = useState([])
  const [statusSaving, setStatusSaving] = useState(false)
  const [deletingDocId, setDeletingDocId] = useState(null)

  const loadAsset = () => {
    setLoading(true)
    Promise.all([getAsset(assetId), getAssetDocuments(assetId)])
      .then(([assetRes, docsRes]) => {
        setAsset(assetRes.data)
        setDocuments(docsRes.data)
      })
      .catch(() => toast.error('Failed to load asset details'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadAsset()
  }, [assetId])

  const canMoveToRepair = can(PERMISSIONS.ASSET_MARK_REPAIR)
  const canRetire = can(PERMISSIONS.ASSET_RETIRE)
  const canEditAsset = can(PERMISSIONS.ASSET_EDIT)
  const canAssignAsset = can(PERMISSIONS.ASSET_ASSIGN)
  const canDeleteDocuments = can(PERMISSIONS.DOCUMENT_DELETE)

  const handleStatusChange = async (nextStatus) => {
    if (!asset) return
    if (nextStatus === 'retired') {
      const confirmed = window.confirm('Are you sure you want to retire this asset? This action changes its lifecycle state.')
      if (!confirmed) return
    }
    setStatusSaving(true)
    try {
      await transitionAssetStatus(asset.id, {
        status: nextStatus,
        notes: `Status changed from ${asset.status} to ${nextStatus}`,
      })
      toast.success(`Asset marked ${nextStatus.replace('_', ' ')}`)
      loadAsset()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update asset status')
    } finally {
      setStatusSaving(false)
    }
  }

  const handleDeleteDocument = async (documentId) => {
    if (!asset) return
    const confirmed = window.confirm('Are you sure you want to remove this document? This action cannot be undone.')
    if (!confirmed) return
    setDeletingDocId(documentId)
    try {
      await deleteAssetDocument(asset.id, documentId)
      toast.success('Document removed')
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove document')
    } finally {
      setDeletingDocId(null)
    }
  }

  const statusActions = asset ? [
    {
      key: 'available',
      label: 'Mark Available',
      show: asset.status === 'in_repair' && canEditAsset,
      tone: 'success',
    },
    {
      key: 'in_repair',
      label: 'Mark In Repair',
      show: ['available', 'assigned'].includes(asset.status) && canMoveToRepair,
      tone: 'primary',
    },
    {
      key: 'retired',
      label: 'Mark Retired',
      show: asset.status !== 'retired' && canRetire,
      tone: 'danger',
    },
  ].filter((item) => item.show) : []

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 780 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}><span className="loading-spinner" style={{ width: 24, height: 24 }} /></div>
        ) : !asset ? null : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
              <div>
                <div className="modal-title" style={{ marginBottom: 6 }}>{asset.asset_tag}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatusBadge status={asset.status} />
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{asset.asset_type}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {asset.status === 'available' && canAssignAsset && (
                  <button className="btn btn-success btn-sm" onClick={() => onAssign(asset)}>Assign</button>
                )}
                {asset.status === 'assigned' && asset.current_assigned_to && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onReplace(asset.current_assigned_to)}>Replace</button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
              </div>
            </div>

            {statusActions.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600 }}>Status Actions</div>
                  {statusSaving && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Updating...</div>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
                  Use these actions to move the asset between available, in repair, and retired states.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {statusActions.map((action) => (
                    <StatusActionButton
                      key={action.key}
                      label={action.label}
                      tone={action.tone}
                      disabled={statusSaving}
                      onClick={() => handleStatusChange(action.key)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {[
                  ['Brand', asset.brand || '-'],
                  ['Model', asset.model || '-'],
                  ['Serial Number', asset.serial_number || '-'],
                  ['Condition', asset.condition || '-'],
                  ['Location', asset.location || '-'],
                  ['Purchase Date', formatDate(asset.purchase_date)],
                  ['Warranty Expiry', formatDate(asset.warranty_expiry)],
                  ['Purchase Cost', formatMoney(asset.purchase_cost)],
                  ['Vendor', asset.vendor_name || '-'],
                  ['Invoice', asset.vendor_invoice_no || '-'],
                  ['Processor', asset.processor || '-'],
                  ['RAM', asset.ram_gb ? `${asset.ram_gb} GB` : '-'],
                  ['Storage', asset.storage_gb ? `${asset.storage_gb} GB` : '-'],
                  ['OS', asset.os_installed || '-'],
                  ['MAC', asset.mac_address || '-'],
                  ['Assigned To', asset.current_assigned_to ? `Employee #${asset.current_assigned_to}` : '-'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 13 }}>{value}</div>
                  </div>
                ))}
              </div>
              {asset.notes && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                    Notes
                  </div>
                  <div style={{ fontSize: 13 }}>{asset.notes}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {['details', 'intake', 'documents', 'history'].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`btn btn-sm ${tab === item ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {tab === 'details' && (
              <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Asset Summary</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                  Intake progress: {asset.intake_pct ?? 0}% | Documents: {documents.length} | Repairs: {asset.repair_tickets?.length || 0}
                </div>
              </div>
            )}

            {tab === 'intake' && (
              <div className="card">
                <AssetIntakeChecklist
                  asset={asset}
                  onIntakeComplete={() => {
                    loadAsset()
                  }}
                />
              </div>
            )}

            {tab === 'documents' && (
              <div className="card">
                <DocumentPanel mode="asset" entityId={String(asset.id)} title="Asset Documents" />
              </div>
            )}

            {tab === 'history' && (
              <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>Asset History</div>
                <AssetHistory assetId={asset.id} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Assets() {
  const { can } = usePermissions()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [assignAssetItem, setAssignAssetItem] = useState(null)
  const [selectedAssetId, setSelectedAssetId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [replaceEmpId, setReplaceEmpId] = useState(null)

  const load = (status) => {
    setLoading(true)
    getAssets(status !== 'all' ? { status } : {})
      .then((r) => setAssets(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(filter)
  }, [filter])

  const filtered = assets.filter((asset) =>
    asset.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
    (asset.brand || '').toLowerCase().includes(search.toLowerCase()) ||
    (asset.model || '').toLowerCase().includes(search.toLowerCase()) ||
    (asset.serial_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (asset.location || '').toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    total: assets.length,
    pending: assets.filter((asset) => asset.status === 'pending').length,
    assigned: assets.filter((asset) => asset.status === 'assigned').length,
    repair: assets.filter((asset) => asset.status === 'in_repair').length,
  }
  const canAssignAsset = can(PERMISSIONS.ASSET_ASSIGN)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">IT Assets</div>
          <div className="page-sub">{assets.length} total assets registered</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => load(filter)}>
            <RefreshCw size={15} /> Refresh
          </button>
          {can(PERMISSIONS.ASSET_CREATE) && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <PlusCircle size={15} /> Add Asset
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <SummaryCard icon={Laptop} label="Total Assets" value={counts.total} />
        <SummaryCard icon={ChevronRight} label="Pending Intake" value={counts.pending} tone="var(--amber)" />
        <SummaryCard icon={History} label="Assigned" value={counts.assigned} tone="var(--green)" />
        <SummaryCard icon={Wrench} label="In Repair" value={counts.repair} tone="var(--red)" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tag, brand, model, serial, location..."
          style={{ maxWidth: 320 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['all', 'pending', 'available', 'assigned', 'in_repair', 'retired'].map((status) => (
            <button
              key={status}
              className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(status)}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="loading-spinner" style={{ width: 22, height: 22 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No assets found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Type</th>
                  <th>Brand / Model</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Warranty</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedAssetId(asset.id)}
                        style={{ padding: 0, fontWeight: 600 }}
                      >
                        <span className="mono">{asset.asset_tag}</span>
                      </button>
                    </td>
                    <td>{asset.asset_type}</td>
                    <td>{asset.brand || '-'} {asset.model || ''}</td>
                    <td>{asset.location || '-'}</td>
                    <td><StatusBadge status={asset.status} /></td>
                    <td style={{ fontSize: 12 }}>{formatDate(asset.warranty_expiry)}</td>
                    <td style={{ fontSize: 12 }}>{asset.current_assigned_to ? `Employee #${asset.current_assigned_to}` : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {asset.status === 'available' && canAssignAsset && (
                          <button className="btn btn-success btn-sm" onClick={() => setAssignAssetItem(asset)}>Assign</button>
                        )}
                        {asset.status === 'assigned' && asset.current_assigned_to && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setReplaceEmpId(asset.current_assigned_to)}>Replace</button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedAssetId(asset.id)}>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && can(PERMISSIONS.ASSET_CREATE) && (
        <AddAssetModal
          onClose={() => setShowAdd(false)}
          onCreated={(asset) => {
            setAssets((prev) => [asset, ...prev])
            setFilter('all')
          }}
        />
      )}
      {assignAssetItem && (
        <AssignModal
          asset={assignAssetItem}
          onClose={() => setAssignAssetItem(null)}
          onDone={() => load(filter)}
        />
      )}
      {replaceEmpId && (
        <ReplaceModal
          employeeId={replaceEmpId}
          onClose={() => setReplaceEmpId(null)}
          onDone={() => load(filter)}
        />
      )}
      {selectedAssetId && (
        <AssetDetailModal
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onAssign={(asset) => {
            setSelectedAssetId(null)
            setAssignAssetItem(asset)
          }}
          onReplace={(employeeId) => {
            setSelectedAssetId(null)
            setReplaceEmpId(employeeId)
          }}
        />
      )}
    </div>
  )
}
