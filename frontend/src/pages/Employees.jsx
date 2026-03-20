import { useEffect, useState } from 'react'
import {
  getEmployees, getEmployee, createEmployee,
  updateOnboardingStep, updateRelievingStep, relieveEmployee
} from '../services/api'
import { UserPlus, Check, ChevronRight, ClipboardList, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

// ── helpers ──────────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const map = { active: 'badge-green', relieved: 'badge-red', on_leave: 'badge-amber' }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>
}

const slaBadge = (val) => {
  if (!val) return <span className="badge badge-gray">Pending</span>
  if (val === 'Yes') return <span className="badge badge-green">✓ SLA Met</span>
  return <span className="badge badge-red">✗ Not Met</span>
}

/** Group an array of steps by their step_category */
const groupByCategory = (steps) =>
  steps.reduce((acc, s) => {
    const cat = s.step_category || 'Other'
    acc[cat] = acc[cat] ? [...acc[cat], s] : [s]
    return acc
  }, {})

// ── dept colour accents ───────────────────────────────────────────────────────
const DEPT_ACCENT = {
  HR:      { color: 'var(--accent)',  bg: '#0d1f3a' },
  Finance: { color: 'var(--amber)',   bg: 'var(--amber-bg)' },
  Admin:   { color: 'var(--purple)',  bg: 'var(--purple-bg)' },
  IT:      { color: 'var(--teal)',    bg: '#0d2a2a' },
}

// ── SRA summary tab ───────────────────────────────────────────────────────────
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
        Final SRA — Onboarding Summary
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
              <th>SLA Met</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td className="mono">{emp.employee_id}</td>
              <td style={{ fontWeight: 500 }}>{emp.full_name}</td>
              <td style={{ fontSize: 12 }}>{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '—'}</td>
              <td>{emp.group_company || '—'}</td>
              <td>{emp.designation}</td>
              <td>{emp.location || '—'}</td>
              {depts.map(dept => {
                const info = pct(dept)
                return (
                  <td key={dept}>
                    {info ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: info.pct === 100 ? 'var(--green)' : 'var(--amber)' }}>
                        {info.pct === 100 ? '✓ Done' : `${info.pct}%`}
                      </span>
                    ) : '—'}
                  </td>
                )
              })}
              <td>{slaBadge(emp.sla_met)}</td>
              <td style={{ fontSize: 12, color: 'var(--text3)' }}>{emp.comments || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── checklist for a single dept ───────────────────────────────────────────────
function DeptChecklist({ dept, steps, onToggle }) {
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

      <div>
        {steps.map((step, idx) => (
          <div key={step.id} className="step-item">
            <div style={{ width: 22, fontSize: 11, color: 'var(--text3)', flexShrink: 0, paddingTop: 2 }}>
              {idx + 1}
            </div>
            <div
              className={`step-check ${step.is_completed ? 'done' : ''}`}
              style={{ borderColor: step.is_completed ? accent.color : undefined,
                       background: step.is_completed ? accent.color : undefined }}
              onClick={() => onToggle(step)}
            >
              {step.is_completed && <Check size={10} color="#0a0c10" strokeWidth={3} />}
            </div>
            <div style={{ flex: 1 }}>
              <div className={`step-name ${step.is_completed ? 'done' : ''}`}>{step.step_name}</div>
              {step.completed_by && (
                <div className="step-by" style={{ color: accent.color }}>
                  ✓ {step.completed_by} · {new Date(step.completed_at).toLocaleDateString()}
                </div>
              )}
              {step.notes && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{step.notes}</div>
              )}
            </div>
            <div>{slaBadge(step.sla_met)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── offboarding checklist ─────────────────────────────────────────────────────
function OffboardingChecklist({ steps, onToggle }) {
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
          />
        )
      })}
    </div>
  )
}

// ── Add Employee Modal ────────────────────────────────────────────────────────
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
      toast.success('Employee added — onboarding checklists created for HR, Finance, Admin & IT!')
      onCreated(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, name, type = 'text', placeholder, required, children }) => (
    <div className="form-group">
      <label className="form-label">{label}{required && ' *'}</label>
      {children || (
        <input name={name} type={type} value={form[name]} onChange={handleChange}
          placeholder={placeholder} required={required} />
      )}
    </div>
  )

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
            <Field label="Employee ID" name="employee_id" placeholder="EMP-001" required />
            <Field label="Full Name" name="full_name" placeholder="Raj Kumar" required />
            <Field label="Email" name="email" type="email" placeholder="raj@company.com" required />
            <Field label="Personal Email" name="personal_email" type="email" placeholder="raj@gmail.com" />
            <Field label="Department" name="department" required>
              <select name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select department</option>
                {['Engineering', 'HR', 'IT', 'Finance', 'Sales', 'Marketing', 'Operations', 'Legal', 'Admin'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Designation" name="designation" placeholder="Software Engineer" required />
          </div>

          {/* Company Info */}
          <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 10px' }}>
            Company Details
          </div>
          <div className="form-grid">
            <Field label="Group Company" name="group_company" placeholder="Gramener" />
            <Field label="Partner Company" name="partner_company" placeholder="Partner Org Name" />
            <Field label="Location" name="location" placeholder="Hyderabad" />
            <Field label="Reporting Manager" name="manager_name" placeholder="Priya Sharma" />
            <Field label="Join Date" name="join_date" type="date" />
          </div>

          {/* Personal Info */}
          <div style={{ fontSize: 11, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '16px 0 10px' }}>
            Personal Details (for HRMS)
          </div>
          <div className="form-grid">
            <Field label="Phone" name="phone" placeholder="+91 98765 43210" />
            <Field label="Emergency Contact" name="emergency_contact" placeholder="+91 99999 00000" />
            <Field label="Date of Birth" name="date_of_birth" type="date" />
            <Field label="Blood Group" name="blood_group" placeholder="B+" />
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

// ── Relieve Modal ─────────────────────────────────────────────────────────────
function RelieveModal({ employee, onClose, onRelieved }) {
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await relieveEmployee(employee.id, { relieve_date: new Date(date).toISOString() })
      toast.success('Offboarding process initiated — checklists created!')
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
          ⚠️ LWD must be confirmed within 2 weeks of resignation mail.
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

// ── Employee Detail ───────────────────────────────────────────────────────────
function EmployeeDetail({ employeeId, onBack }) {
  const [emp, setEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('HR')
  const [showRelieve, setShowRelieve] = useState(false)

  const load = () => {
    setLoading(true)
    getEmployee(employeeId).then(r => setEmp(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [employeeId])

  const toggleOnboarding = async (step) => {
    try {
      await updateOnboardingStep(step.id, { is_completed: !step.is_completed })
      load()
    } catch { toast.error('Failed to update step') }
  }

  const toggleRelieving = async (step) => {
    try {
      await updateRelievingStep(step.id, { is_completed: !step.is_completed })
      load()
    } catch { toast.error('Failed to update step') }
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

  // Department tabs for onboarding
  const onboardingDepts = ['HR', 'Finance', 'Admin', 'IT']
  const stepsByDept = groupByCategory(onboarding)

  // All tabs
  const tabs = [
    ...onboardingDepts.map(d => ({ key: d, label: d, type: 'onboarding' })),
    { key: 'SRA', label: '📊 SRA Summary', type: 'sra' },
    ...(isRelieving ? [{ key: 'offboarding', label: '⚠️ Offboarding', type: 'offboarding' }] : []),
  ]

  return (
    <div className="fade-in">
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{emp.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            {emp.employee_id} · {emp.designation} · {emp.department}
            {emp.location && ` · ${emp.location}`}
            {emp.group_company && ` · ${emp.group_company}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {statusBadge(emp.status)}
          {emp.status === 'active' && (
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
            ['Personal Email', emp.personal_email || '—'],
            ['Phone', emp.phone || '—'],
            ['Emergency Contact', emp.emergency_contact || '—'],
            ['Manager', emp.manager_name || '—'],
            ['Group Company', emp.group_company || '—'],
            ['Partner Company', emp.partner_company || '—'],
            ['Location', emp.location || '—'],
            ['Blood Group', emp.blood_group || '—'],
            ['Join Date', emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '—'],
            ['LWD', emp.relieve_date ? new Date(emp.relieve_date).toLocaleDateString() : '—'],
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
                  {pct === 100 ? '✓' : `${pct}%`}
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
        />
      )}

      {tab === 'SRA' && <SRAView emp={emp} />}

      {tab === 'offboarding' && (
        <OffboardingChecklist steps={relieving} onToggle={toggleRelieving} />
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

// ── Main Employees list ───────────────────────────────────────────────────────
export default function Employees() {
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
          <div className="page-sub">{employees.length} total employees · Onboarding tracked across HR, Finance, Admin & IT</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <UserPlus size={15} /> Add Employee
        </button>
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
                    <td style={{ fontSize: 12 }}>{emp.group_company || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td>{emp.designation}</td>
                    <td style={{ fontSize: 12 }}>{emp.location || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td>{statusBadge(emp.status)}</td>
                    <td style={{ fontSize: 12 }}>{emp.join_date ? new Date(emp.join_date).toLocaleDateString() : '—'}</td>
                    <td><ChevronRight size={14} style={{ color: 'var(--text3)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onCreated={(e) => setEmployees(prev => [e, ...prev])}
        />
      )}
    </div>
  )
}
