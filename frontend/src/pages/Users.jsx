import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { createUser, deleteUser, getUsers } from '../services/api'

const ROLE_OPTIONS = [
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
  { value: 'finance', label: 'Finance' },
  { value: 'admin_dept', label: 'Admin Department' },
  { value: 'auditor', label: 'Auditor' },
]

export default function Users() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'hr',
  })
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState(null)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'hr',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error('Name, email, and password are required')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      toast.success('User created successfully')
      resetForm()
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const response = await getUsers()
      setUsers(response.data || [])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(`Delete user "${userName}"? This action cannot be undone.`)
    if (!confirmed) return

    setDeletingUserId(userId)
    try {
      await deleteUser(userId)
      toast.success('User removed successfully')
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove user')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-sub">Create login accounts for HR, IT, Finance and other teams</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 600 }}>
          <UserPlus size={16} style={{ color: 'var(--accent)' }} />
          Add New User
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Role *</label>
              <select name="role" value={form.role} onChange={handleChange} required>
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={resetForm} disabled={loading}>
              Clear
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 12 }}>Registered Users</div>
        {usersLoading ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>No users found</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{String(user.role || '').replace('_', ' ')}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={deletingUserId === user.id}
                      >
                        {deletingUserId === user.id ? 'Removing...' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
