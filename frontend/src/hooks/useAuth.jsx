import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe().then(r => {
        setUser(r.data)
        localStorage.setItem('user', JSON.stringify(r.data))
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const signin = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const signout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signin, signout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
