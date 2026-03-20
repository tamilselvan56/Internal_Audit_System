import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  LayoutDashboard, Users, Laptop, MessageSquare,
  LogOut, ChevronRight, Database
} from 'lucide-react'

const roleColors = {
  admin: 'var(--accent)',
  hr: 'var(--green)',
  it: 'var(--purple)',
  auditor: 'var(--amber)'
}

export default function Layout({ children }) {
  const { user, signout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: null },
    { to: '/employees', icon: Users, label: 'Employees', roles: null },
    { to: '/assets', icon: Laptop, label: 'IT Assets', roles: null },
    { to: '/ask', icon: MessageSquare, label: 'Ask Anything', roles: null },
    { to: '/knowledge', icon: Database, label: 'Knowledge Base', roles: ['admin'], adminOnly: true },
  ]

  const visibleNav = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  )

  const handleSignout = () => {
    signout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{
        width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        height: '100vh', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #1d3a6e, #4f8ef7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
            }}>🔍</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>AuditPro</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Internal System</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '6px 8px', marginBottom: 4 }}>
            Navigation
          </div>
          {visibleNav.filter(n => !n.adminOnly).map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                  background: isActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  transition: 'all 0.15s', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                }}>
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <ChevronRight size={12} />}
                </div>
              )}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', padding: '6px 8px', marginTop: 12, marginBottom: 4 }}>
                Admin
              </div>
              {visibleNav.filter(n => n.adminOnly).map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
                  {({ isActive }) => (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                      background: isActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                      color: isActive ? 'var(--accent)' : 'var(--text2)',
                      transition: 'all 0.15s', cursor: 'pointer',
                      fontSize: 13, fontWeight: isActive ? 500 : 400,
                      border: isActive ? 'none' : '1px dashed var(--border)',
                    }}>
                      <Icon size={16} />
                      <span style={{ flex: 1 }}>{label}</span>
                      {isActive && <ChevronRight size={12} />}
                    </div>
                  )}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 8, background: 'var(--bg3)' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--bg4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600, flexShrink: 0,
              color: roleColors[user?.role] || 'var(--text)',
              border: `1px solid ${roleColors[user?.role] || 'var(--border)'}44`
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 10, color: roleColors[user?.role] || 'var(--text3)', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
            <button onClick={handleSignout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)', height: '100vh' }}>
        <div style={{ padding: '28px', maxWidth: 1100, margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}