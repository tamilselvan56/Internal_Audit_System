import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signin } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(email, password)
      signin(res.data.access_token, res.data.user)
      toast.success(`Welcome back, ${res.data.user.name}`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '20px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #1d3a6e, #4f8ef7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 22
          }}>🔍</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Audit System</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>Internal HR & IT Management</div>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Sign in</div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? <><span className="loading-spinner" style={{ width: 16, height: 16 }}></span> Signing in...</> : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text3)' }}>
          Default admin: admin@company.com / admin123
        </div>
      </div>
    </div>
  )
}
