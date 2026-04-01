import { useEffect, useState } from 'react'
import {
  getEmployees, getEmployee, createEmployee,
  updateOnboardingStep, updateRelievingStep, relieveEmployee,
  deleteEmployeeDocument, getEmployeeDocuments, uploadEmployeeDocument, downloadEmployeePdf
} from '../services/api'
import { UserPlus, Check, ChevronRight, ClipboardList, Shield, FileText, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions'

// section
const statusBadge = (status) => {
  const map = { active: 'badge-green', relieved: 'badge-red', on_leave: 'badge-amber' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

/** Group an array of steps by their step_category */
const groupByCategory = (steps) =>
  steps.reduce((acc, s) => {
    const cat = s.step_category || 'Other'
    acc[cat] = acc[cat] ? [...acc[cat], s] : [s]
    return acc
  }, {})

// section
const DEPT_ACCENT = {
  HR:      { color: 'var(--accent)',  bg: '#0d1f3a' },
  Finance: { color: 'var(--amber)',   bg: 'var(--amber-bg)' },
  Admin:   { color: 'var(--purple)',  bg: 'var(--purple-bg)' },
  IT:      { color: 'var(--teal)',    bg: '#0d2a2a' },
}

// section
function SRAView({ emp }) {
  const onboarding = emp.onboarding_steps || []
  const depts = ['HR', 'Finance', 'Admin', 'IT']

  const pct = (cat) => {
    const steps = onboarding.filter(s => s.step_category === cat)
    if (!steps.length) return null
    const done = steps.filter(s => s.is_completed).length
    return { done, total: steps.length, pct: Math.round((done / steps.length) * 100) }
  }

  const overall = onboarding.length
    ? Math.round((onboarding.filter(s => s.is_completed).length / onboarding.length) * 100)
    : 0

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
        Final SRA - Onboarding Summary
      </div>

      {/* overall bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>
          <span>Overall Completion</span>
          <span style={{ fontWeight: 600, color: overall === 100 ? 'var(--green)' : 'var(--text)' }}>{overall}%</span>
        </div>
        <div className="progress-bar" style={{ height: 8 }}>
          <div className="progress-fill" style={{ width: `${overall}%`, background: overall === 100 ? 'var(--green)' : 'var(--accent)' }} />
        </div>
      </div>

      {/* dept grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {depts.map(dept => {
          const info = pct(dept)
          const accent = DEPT_ACCENT[dept]
          if (!info) return null
          return (
            <div key={dept} style={{
              background: accent.bg, border: `1px solid ${accent.color}22`,
              borderRadius: 10, padding: '14px 16px'
            }}>
              <div style={{ fontSize: 11, color: accent.color, fontWeight: 600, letterSpacing: '0.5px', marginBottom: 8 }}>
                {dept.toUpperCase()}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: accent.color, lineHeight: 1 }}>
                {info.pct}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                {info.done} / {info.total} steps
              </div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${info.pct}%`, background: accent.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* table view */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>EMP ID</th>
              <th>Name</th>
              <th>DOJ</th>
              <th>Group Company</th>
              <th>Designation</th>
              <th>Location</th>
              <th>HR</th>
              <th>Finance</th>
              <th>IT</th>
              <th>Admin</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td className="mono">{emp.employee_id}</td>
              <td style={{ fontWeight: 500 }}>{emp.full_name}</td>
              <td style={{ fontSize: 12 }}>{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '-'}</td>
              <td>{emp.group_company || '-'}</td>
              <td>{emp.designation}</td>
              <td>{emp.location || '-'}</td>
              {depts.map(dept => {
                const info = pct(dept)
                return (
                  <td key={dept}>
                    {info ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: info.pct === 100 ? 'var(--green)' : 'var(--amber)' }}>
                        {info.pct === 100 ? 'Done' : `${info.pct}%`}
                      </span>
                    ) : '-'}
                  </td>
                )
              })}
              <td style={{ fontSize: 12, color: 'var(--text3)' }}>{emp.comments || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// section
function DeptChecklist({ dept, steps, onToggle, canEdit = false }) {
  const accent = DEPT_ACCENT[dept] || { color: 'var(--text2)', bg: 'var(--bg3)' }
  const done = steps.filter(s => s.is_completed).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: accent.bg, color: accent.color, letterSpacing: '0.4px'
          }}>
            {dept}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{dept} Checklist</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{done}/{steps.length}</span>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: pct === 100 ? 'var(--green)' : accent.color
          }}>{pct}%</span>
        </div>
      </div>

      <div className="progress-bar" style={{ marginBottom: 16 }}>
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: pct === 100 ? 'var(--green)' : accent.color
        }} />
      </div>

      {!canEdit && (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 16 }}>
          Read-only: only the {dept} owner role can update these checklist steps.
        </div>
      )}

      <div>
        {steps.map((step, idx) => (
          <div key={step.id} className="step-item">
            <div style={{ width: 22, fontSize: 11, color: 'var(--text3)', flexShrink: 0, paddingTop: 2 }}>
              {idx + 1}
            </div>
            <div
              className={`step-check ${step.is_completed ? 'done' : ''}`}
              style={{ borderColor: step.is_completed ? accent.color : undefined,
                       background: step.is_completed ? accent.color : undefined,
                       cursor: canEdit ? 'pointer' : 'not-allowed',
                       opacity: canEdit ? 1 : 0.55 }}
              onClick={() => canEdit && onToggle(step)}
              title={canEdit ? `Update ${dept} checklist` : `${dept} checklist is read-only for your role`}
            >
              {step.is_completed && <Check size={10} color="#0a0c10" strokeWidth={3} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className={`step-name ${step.is_completed ? 'done' : ''}`}>{step.step_name}</div>
              {step.completed_by && (
                <div className="step-by" style={{ color: accent.color }}>
                  Done by {step.completed_by} - {new Date(step.completed_at).toLocaleDateString()}
                </div>
              )}
              {step.notes && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{step.notes}</div>
              )}
            </div>          </div>
        ))}
      </div>
    </div>
  )
}

// section
function OffboardingChecklist({ steps, onToggle, canEditCategory }) {
  const grouped = groupByCategory(steps)
  const deptOrder = ['HR', 'IT', 'Admin', 'Finance']

  return (
    <div>
      {/* offboarding notice */}
      <div style={{
        background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13
      }}>
        <Shield size={15} style={{ color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
        <div style={{ color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--red)' }}>Offboarding Policy: </strong>
          LWD must be confirmed within 2 weeks of resignation. Exit mail to support@company.com
          must be sent 1 week before LWD. Relieving &amp; Service letters issued by HR to personal email.
        </div>
      </div>

      {deptOrder.map(dept => {
        const deptSteps = grouped[dept] || []
        if (!deptSteps.length) return null
        return (
          <DeptChecklist
            key={dept}
            dept={dept}
            steps={deptSteps}
            onToggle={onToggle}
            canEdit={canEditCategory(dept)}
          />
        )
      })}
    </div>
  )
}

function EmployeeDocuments({ employeeId, canAdd }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('marksheet')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)

  const loadDocs = () => {
    setLoading(true)
    getEmployeeDocuments(employeeId)
      .then((response) => setDocs(response.data || []))
      .catch((err) => toast.error(err.response?.data?.detail || 'Failed to load employee documents'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadDocs() }, [employeeId])

  const handleUpload = async (event) => {
    event.preventDefault()
    if (!file || !title.trim()) {
      toast.error('Document title and file are required')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('category', category)
      formData.append('notes', notes.trim())
      await uploadEmployeeDocument(employeeId, formData)
      toast.success('Employee document uploaded')
      setTitle('')
      setCategory('marksheet')
      setNotes('')
      setFile(null)
      loadDocs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (docId) => {
    const confirmed = window.confirm('Are you sure you want to remove this document? This action cannot be undone.')
    if (!confirmed) return

    setDeletingId(docId)
    try {
      await deleteEmployeeDocument(docId)
      setDocs((prev) => prev.filter((doc) => doc.id !== docId))
      toast.success('Employee document removed')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove document')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <FileText size={16} style={{ color: 'var(--accent)' }} />
          Employee Documents
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>({docs.length})</span>
        </div>
      </div>

      {canAdd && (
        <form onSubmit={handleUpload} className="card" style={{ marginBottom: 14, background: 'var(--bg3)' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
            Upload collected documents such as marksheets, certificates, ID proofs, and offer paperwork.
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Document Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="10th Marksheet / Degree Certificate" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="marksheet">Marksheet</option>
                <option value="certificate">Certificate</option>
                <option value="id_proof">ID Proof</option>
                <option value="address_proof">Address Proof</option>
                <option value="experience">Experience</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context..." />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={uploading || !file || !title.trim()}>
              <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      )}

      {!canAdd && (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
          Only HR and Admin can add employee documents.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 18 }}>
          <span className="loading-spinner" style={{ width: 18, height: 18 }}></span>
        </div>
      ) : docs.length === 0 ? (
        <div className="empty-state" style={{ padding: 20 }}>
          <p>No documents uploaded for this employee yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map((doc) => (
            <div key={doc.id} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : ''}
                  </div>
                  {canAdd && (
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
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                {(doc.category || 'other').replace('_', ' ')} | {doc.file_name} | {doc.size_kb ?? 0} KB
              </div>
              {doc.notes && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>{doc.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddEmployeeField({ label, name, type = 'text', placeholder, required, value, onChange, children }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && ' *'}</label>
      {children || (
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  )
}

// section
function AddEmployeeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    employee_id: '', full_name: '', email: '', department: '',
    designation: '', manager_name: '', phone: '', join_date: '',
    group_company: '', partner_company: '', location: '',
    date_of_birth: '', blood_group: '', emergency_contact: '',
    personal_email: '', comments: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        join_date: form.join_date ? new Date(form.join_date).toISOString() : null,
        date_of_birth: form.date_of_birth ? new Date(form.date_of_birth).toISOString() : null,
      }
      const res = await createEmployee(payload)
      toast.success('Employee added - onboarding checklists created for HR, Finance, Admin & IT!')
      onCreated(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-title">Add New Employee</div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Basic Information
          </div>
          <div className="form-grid">
            <AddEmployeeField label="Employee ID" name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="EMP-001" required />
            <AddEmployeeField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Raj Kumar" required />
            <AddEmployeeField label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="raj@company.com" required />
            <AddEmployeeField label="Personal Email" name="personal_email" type="email" value={form.personal_email} onChange={handleChange} placeholder="raj@gmail.com" />
            <AddEmployeeField label="Department" name="department" required value={form.department} onChange={handleChange}>
              <select name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select department</option>
                {['Engineering', 'HR', 'IT', 'Finance', 'Sales', 'Marketing', 'Operations', 'Legal', 'Admin'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </AddEmployeeField>
            <AddEmployeeField label="Designation" name="designation" value={form.designation} onChange={handleChange} placeholder="Software Engineer" required />
          </div>

          {/* Company Info */}
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 10px' }}>
            Company Details
          </div>
          <div className="form-grid">
            <AddEmployeeField label="Group Company" name="group_company" value={form.group_company} onChange={handleChange} placeholder="Gramener" />
            <AddEmployeeField label="Partner Company" name="partner_company" value={form.partner_company} onChange={handleChange} placeholder="Partner Org Name" />
            <AddEmployeeField label="Location" name="location" value={form.location} onChange={handleChange} placeholder="Hyderabad" />
            <AddEmployeeField label="Reporting Manager" name="manager_name" value={form.manager_name} onChange={handleChange} placeholder="Priya Sharma" />
            <AddEmployeeField label="Join Date" name="join_date" type="date" value={form.join_date} onChange={handleChange} />
          </div>

          {/* Personal Info */}
          <div style={{ fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 10px' }}>
            Personal Details (for HRMS)
          </div>
          <div className="form-grid">
            <AddEmployeeField label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
            <AddEmployeeField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} placeholder="+91 99999 00000" />
            <AddEmployeeField label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
            <AddEmployeeField label="Blood Group" name="blood_group" value={form.blood_group} onChange={handleChange} placeholder="B+" />
          </div>

          <div className="form-group">
            <label className="form-label">Comments</label>
            <textarea name="comments" value={form.comments} onChange={handleChange} rows={2} placeholder="Any additional notes..." />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// section
function RelieveModal({ employee, onClose, onRelieved }) {
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await relieveEmployee(employee.id, { relieve_date: new Date(date).toISOString() })
      toast.success('Offboarding process initiated - checklists created!')
      onRelieved(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-title">Initiate Offboarding</div>
        <div style={{
          background: 'var(--amber-bg)', border: '1px solid #3a2a0a',
          borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: 'var(--amber)'
        }}>
          LWD must be confirmed within 2 weeks of resignation mail.
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 18 }}>
          This will start the offboarding process for <strong>{employee.full_name}</strong> and create
          the HR, IT, Admin &amp; Finance offboarding checklists.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Last Working Day (LWD) *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Offboarding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// section
function EmployeeDetail({ employeeId, onBack }) {
  const { can, canUpdateStepCategory } = usePermissions()
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [tab, setTab] = useState('HR')
  const [showRelieve, setShowRelieve] = useState(false)

  const load = () => {
    setLoading(true)
    getEmployee(employeeId).then(r => setEmp(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [employeeId])

  const toggleOnboarding = async (step) => {
    if (!canUpdateStepCategory(step.step_category)) {
      toast.error(`Only the ${step.step_category} owner role can update this checklist`)
      return
    }
    try {
      await updateOnboardingStep(step.id, { is_completed: !step.is_completed })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update step') }
  }

  const toggleRelieving = async (step) => {
    if (!canUpdateStepCategory(step.step_category)) {
      toast.error(`Only the ${step.step_category} owner role can update this checklist`)
      return
    }
    try {
      await updateRelievingStep(step.id, { is_completed: !step.is_completed })
      load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update step') }
  }

  const handleDownloadPdf = async () => {
    if (!emp) return
    setDownloading(true)
    try {
      const response = await downloadEmployeePdf(emp.id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const safeName = (emp.full_name || 'employee').replace(/[^\w.-]+/g, '_')
      link.href = url
      link.download = `${safeName}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to download employee PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <span className="loading-spinner" style={{ width: 24, height: 24 }}></span>
    </div>
  )
  if (!emp) return null

  const onboarding = emp.onboarding_steps || []
  const relieving = emp.relieving_steps || []
  const isRelieving = relieving.length > 0
  const canInitiateOffboarding = can(PERMISSIONS.EMPLOYEE_RELIEVE)
  const canAddEmployeeDocs = can(PERMISSIONS.EMPLOYEE_CREATE)

  // Department tabs for onboarding
  const onboardingDepts = ['HR', 'Finance', 'Admin', 'IT']
  const stepsByDept = groupByCategory(onboarding)

  // All tabs
  const tabs = [
    ...onboardingDepts.map(d => ({ key: d, label: d, type: 'onboarding' })),
    { key: 'documents', label: 'Documents', type: 'documents' },
    { key: 'SRA', label: 'SRA Summary', type: 'sra' },
    ...(isRelieving ? [{ key: 'offboarding', label: 'Offboarding', type: 'offboarding' }] : []),
  ]

  return (
    <div className="fade-in">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{emp.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {emp.employee_id}  -  {emp.designation}  -  {emp.department}
            {emp.location && `  -  ${emp.location}`}
            {emp.group_company && `  -  ${emp.group_company}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {statusBadge(emp.status)}
          <button className="btn btn-ghost btn-sm" onClick={handleDownloadPdf} disabled={downloading}>
            <Download size={14} /> {downloading ? 'Downloading...' : 'Download PDF'}
          </button>
          {emp.status === 'active' && canInitiateOffboarding && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowRelieve(true)}>
              Initiate Offboarding
            </button>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {[
            ['Email', emp.email],
            ['Personal Email', emp.personal_email || '-'],
            ['Phone', emp.phone || '-'],
            ['Emergency Contact', emp.emergency_contact || '-'],
            ['Manager', emp.manager_name || '-'],
            ['Group Company', emp.group_company || '-'],
            ['Partner Company', emp.partner_company || '-'],
            ['Location', emp.location || '-'],
            ['Blood Group', emp.blood_group || '-'],
            ['Join Date', emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '-'],
            ['LWD', emp.relieve_date ? new Date(emp.relieve_date).toLocaleDateString() : '-'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dept tabs */}
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {tabs.map(({ key, label }) => {
          const accent = DEPT_ACCENT[key]
          const deptSteps = stepsByDept[key] || []
          const done = deptSteps.filter(s => s.is_completed).length
          const pct = deptSteps.length ? Math.round((done / deptSteps.length) * 100) : null
          return (
            <button
              key={key}
              className={`tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
              style={tab === key && accent ? { color: accent.color, borderBottomColor: accent.color } : {}}
            >
              {label}
              {pct !== null && (
                <span style={{
                  marginLeft: 6, fontSize: 10, fontWeight: 600,
                  color: pct === 100 ? 'var(--green)' : (accent?.color || 'var(--text3)')
                }}>
                  {pct === 100 ? 'Done' : `${pct}%`}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {onboardingDepts.includes(tab) && (
        <DeptChecklist
          dept={tab}
          steps={stepsByDept[tab] || []}
          onToggle={toggleOnboarding}
          canEdit={canUpdateStepCategory(tab)}
        />
      )}

      {tab === 'SRA' && <SRAView emp={emp} />}

      {tab === 'documents' && (
        <EmployeeDocuments employeeId={emp.id} canAdd={canAddEmployeeDocs} />
      )}

      {tab === 'offboarding' && (
        <OffboardingChecklist
          steps={relieving}
          onToggle={toggleRelieving}
          canEditCategory={canUpdateStepCategory}
        />
      )}

      {showRelieve && (
        <RelieveModal
          employee={emp}
          onClose={() => setShowRelieve(false)}
          onRelieved={(updated) => { setEmp(updated); setTab('offboarding') }}
        />
      )}
    </div>
  )
}

// section
export default function Employees() {
  const { can } = usePermissions()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const load = (status) => {
    setLoading(true)
    getEmployees(status === 'all' ? null : status)
      .then(r => setEmployees(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(filter) }, [filter])

  if (selectedId) {
    return <EmployeeDetail employeeId={selectedId} onBack={() => { setSelectedId(null); load(filter) }} />
  }

  const filtered = employees.filter(e =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    (e.location || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.group_company || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={20} style={{ color: 'var(--accent)' }} />
            Employees
          </div>
          <div className="page-sub">{employees.length} total employees  -  Onboarding tracked across HR, Finance, Admin & IT</div>
        </div>
        {can(PERMISSIONS.EMPLOYEE_CREATE) && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <UserPlus size={15} /> Add Employee
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, ID, department, location..."
          style={{ maxWidth: 300 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'active', 'relieved'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="loading-spinner" style={{ width: 22, height: 22 }}></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No employees found</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Employee</th>
                  <th>Group Company</th>
                  <th>Designation</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>DOJ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, idx) => (
                  <tr key={emp.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(emp.id)}>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text)' }}>{emp.full_name}</div>
                      <div className="mono" style={{ color: 'var(--text3)', marginTop: 2 }}>{emp.employee_id}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{emp.group_company || <span style={{ color: 'var(--text3)' }}>-</span>}</td>
                    <td>{emp.designation}</td>
                    <td style={{ fontSize: 12 }}>{emp.location || <span style={{ color: 'var(--text3)' }}>-</span>}</td>
                    <td>{statusBadge(emp.status)}</td>
                    <td style={{ fontSize: 12 }}>{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '-'}</td>
                    <td><ChevronRight size={14} style={{ color: 'var(--text3)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && can(PERMISSIONS.EMPLOYEE_CREATE) && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={(e) => setEmployees(prev => [e, ...prev])}
        />
      )}
    </div>
  )
}


