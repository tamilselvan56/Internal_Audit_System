import { useEffect, useState } from 'react'
import { getAssets, createAsset, assignAsset, replaceAsset, getEmployees, getAssetHistory } from '../services/api'
import { PlusCircle, ChevronRight, History } from 'lucide-react'
import toast from 'react-hot-toast'

const statusBadge = (status) => {
  const map = { available: 'badge-green', assigned: 'badge-blue', in_repair: 'badge-amber', retired: 'badge-gray' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status.replace('_', ' ')}</span>
}

function AddAssetModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ asset_tag: '', asset_type: 'Laptop', brand: '', model: '', serial_number: '', purchase_date: '', warranty_expiry: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        purchase_date: form.purchase_date ? new Date(form.purchase_date).toISOString() : null,
        warranty_expiry: form.warranty_expiry ? new Date(form.warranty_expiry).toISOString() : null,
      }
      const res = await createAsset(payload)
      toast.success('Asset added successfully!')
      onCreated(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add asset')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add New Asset</div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Asset Tag *</label>
              <input name="asset_tag" value={form.asset_tag} onChange={handleChange} placeholder="LAP-2024-0001" required />
            </div>
            <div className="form-group">
              <label className="form-label">Asset Type *</label>
              <select name="asset_type" value={form.asset_type} onChange={handleChange} required>
                {['Laptop', 'Desktop', 'Mobile', 'Tablet', 'Mouse', 'Keyboard', 'Monitor', 'Headset', 'Other'].map(t => (
                  <option key={t}>{t}</option>
                ))}
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
              <label className="form-label">Purchase Date</label>
              <input type="date" name="purchase_date" value={form.purchase_date} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Warranty Expiry</label>
              <input type="date" name="warranty_expiry" value={form.warranty_expiry} onChange={handleChange} />
            </div>
          </div>
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
    getEmployees('active').then(r => setEmployees(r.data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await assignAsset(asset.id, { employee_id: parseInt(empId), performed_by: performer })
      toast.success('Asset assigned!')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-title">Assign Asset</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
          Assign <strong className="mono">{asset.asset_tag}</strong> ({asset.brand} {asset.model}) to an employee.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Employee *</label>
            <select value={empId} onChange={e => setEmpId(e.target.value)} required>
              <option value="">— Select employee —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned By *</label>
            <input value={performer} onChange={e => setPerformer(e.target.value)} placeholder="Your name" required />
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
  const [availableAssets, setAvailableAssets] = useState([])
  const [newAssetId, setNewAssetId] = useState('')
  const [reason, setReason] = useState('')
  const [performer, setPerformer] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getAssets({ status: 'available' }).then(r => setAvailableAssets(r.data))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await replaceAsset({ new_asset_id: parseInt(newAssetId), employee_id: employeeId, reason, performed_by: performer })
      toast.success('Laptop replacement completed!')
      onDone()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-title">Replace Asset</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select New Asset *</label>
            <select value={newAssetId} onChange={e => setNewAssetId(e.target.value)} required>
              <option value="">— Select available asset —</option>
              {availableAssets.map(a => (
                <option key={a.id} value={a.id}>{a.asset_tag} — {a.brand} {a.model}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Replacement Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="Hardware failure, upgrade..." required />
          </div>
          <div className="form-group">
            <label className="form-label">Performed By *</label>
            <input value={performer} onChange={e => setPerformer(e.target.value)} placeholder="Your name" required />
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

function HistoryModal({ asset, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAssetHistory(asset.id).then(r => setHistory(r.data)).finally(() => setLoading(false))
  }, [asset.id])

  const actionColor = { assigned: 'var(--green)', returned: 'var(--amber)', replaced: 'var(--accent)' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Asset History — {asset.asset_tag}</div>
        {loading ? <div style={{ textAlign: 'center', padding: 30 }}><span className="loading-spinner"></span></div> :
          history.length === 0 ? <div className="empty-state"><p>No history found</p></div> :
            history.map(h => (
              <div key={h.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: actionColor[h.action] || 'var(--text3)', marginTop: 5, flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontSize: 13, textTransform: 'capitalize' }}><strong>{h.action}</strong> — Employee #{h.employee_id}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>By {h.performed_by} · {new Date(h.action_date).toLocaleString()}</div>
                  {h.reason && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{h.reason}</div>}
                </div>
              </div>
            ))
        }
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Assets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [assignAssetItem, setAssignAssetItem] = useState(null)
  const [historyAsset, setHistoryAsset] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [replaceEmpId, setReplaceEmpId] = useState(null)

  const load = (status) => {
    setLoading(true)
    getAssets(status !== 'all' ? { status } : {}).then(r => setAssets(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load(filter) }, [filter])

  const filtered = assets.filter(a =>
    a.asset_tag.toLowerCase().includes(search.toLowerCase()) ||
    (a.brand || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.model || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.serial_number || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">IT Assets</div>
          <div className="page-sub">{assets.length} total assets registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <PlusCircle size={15} /> Add Asset
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tag, brand, model, serial..." style={{ maxWidth: 280 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'available', 'assigned', 'in_repair', 'retired'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="loading-spinner" style={{ width: 22, height: 22 }}></span></div>
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
                  <th>Serial No.</th>
                  <th>Status</th>
                  <th>Warranty</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => (
                  <tr key={asset.id}>
                    <td><span className="mono">{asset.asset_tag}</span></td>
                    <td>{asset.asset_type}</td>
                    <td>{asset.brand} {asset.model}</td>
                    <td><span className="mono" style={{ fontSize: 11 }}>{asset.serial_number || '—'}</span></td>
                    <td>{statusBadge(asset.status)}</td>
                    <td style={{ fontSize: 12 }}>
                      {asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {asset.status === 'available' && (
                          <button className="btn btn-success btn-sm" onClick={() => setAssignAssetItem(asset)}>Assign</button>
                        )}
                        {asset.status === 'assigned' && asset.current_assigned_to && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setReplaceEmpId(asset.current_assigned_to)}>Replace</button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => setHistoryAsset(asset)} style={{ padding: '6px 8px' }}>
                          <History size={13} />
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

      {showAdd && <AddAssetModal onClose={() => setShowAdd(false)} onCreated={a => { setAssets(p => [a, ...p]); setFilter('all') }} />}
      {assignAssetItem && <AssignModal asset={assignAssetItem} onClose={() => setAssignAssetItem(null)} onDone={() => load(filter)} />}
      {replaceEmpId && <ReplaceModal employeeId={replaceEmpId} onClose={() => setReplaceEmpId(null)} onDone={() => load(filter)} />}
      {historyAsset && <HistoryModal asset={historyAsset} onClose={() => setHistoryAsset(null)} />}
    </div>
  )
}
