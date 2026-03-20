import { useEffect, useState } from 'react'
import { getDashboard } from '../services/api'
import { Users, Laptop, CheckCircle, AlertCircle, Package, UserX } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard().then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <span className="loading-spinner" style={{ width: 28, height: 28 }}></span>
    </div>
  )

  const cards = [
    { label: 'Total Employees', value: stats?.total_employees ?? 0, sub: `${stats?.active_employees ?? 0} active`, color: 'var(--accent)', icon: Users },
    { label: 'Relieved', value: stats?.relieved_employees ?? 0, sub: 'All time', color: 'var(--text3)', icon: UserX },
    { label: 'Total Assets', value: stats?.total_assets ?? 0, sub: `${stats?.available_assets ?? 0} available`, color: 'var(--purple)', icon: Laptop },
    { label: 'Assigned Assets', value: stats?.assigned_assets ?? 0, sub: 'Currently out', color: 'var(--teal)', icon: Package },
    { label: 'Pending Onboardings', value: stats?.pending_onboardings ?? 0, sub: 'Incomplete steps', color: 'var(--amber)', icon: AlertCircle },
    { label: 'Pending Relievings', value: stats?.pending_relievings ?? 0, sub: 'Incomplete steps', color: 'var(--red)', icon: CheckCircle },
  ]

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Overview of HR and IT operations</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/employees" className="btn btn-ghost btn-sm">View Employees</Link>
          <Link to="/assets" className="btn btn-primary btn-sm">Add Asset</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {cards.map(({ label, value, sub, color, icon: Icon }) => (
          <div className="stat-card" key={label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="stat-label">{label}</div>
              <Icon size={14} style={{ color }} />
            </div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Link to="/employees?action=new" className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', transition: 'border-color 0.2s', borderColor: 'var(--border)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>👤</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Onboard Employee</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Add a new employee and track all onboarding steps</div>
        </Link>

        <Link to="/assets?action=new" className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--purple)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>💻</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Add IT Asset</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Register a new laptop or device in the system</div>
        </Link>

        <Link to="/ask" className="card" style={{ textDecoration: 'none', display: 'block', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div style={{ fontSize: 24, marginBottom: 10 }}>🤖</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Ask the AI</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Get step-by-step answers on any process</div>
        </Link>
      </div>
    </div>
  )
}
