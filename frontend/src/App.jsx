// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// import { Toaster } from 'react-hot-toast'
// import { AuthProvider, useAuth } from './hooks/useAuth'
// import Layout from './components/Layout'
// import Login from './pages/Login'
// import Dashboard from './pages/Dashboard'
// import Employees from './pages/Employees'
// import Assets from './pages/Assets'
// import AskAnything from './pages/AskAnything'

// function PrivateRoute({ children }) {
//   const { user, loading } = useAuth()
//   if (loading) return (
//     <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
//       <span className="loading-spinner" style={{ width: 28, height: 28 }}></span>
//     </div>
//   )
//   if (!user) return <Navigate to="/login" replace />
//   return <Layout>{children}</Layout>
// }

// export default function App() {
//   return (
//     <AuthProvider>
//       <BrowserRouter>
//         <Toaster
//           position="top-right"
//           toastOptions={{
//             style: { background: '#1e2229', color: '#e8eaf0', border: '1px solid #2a2d35', fontSize: 13 },
//             success: { iconTheme: { primary: '#34d399', secondary: '#0a0c10' } },
//             error: { iconTheme: { primary: '#f87171', secondary: '#0a0c10' } },
//           }}
//         />
//         <Routes>
//           <Route path="/login" element={<Login />} />
//           <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
//           <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
//           <Route path="/assets" element={<PrivateRoute><Assets /></PrivateRoute>} />
//           <Route path="/ask" element={<PrivateRoute><AskAnything /></PrivateRoute>} />
//           <Route path="*" element={<Navigate to="/dashboard" replace />} />
//         </Routes>
//       </BrowserRouter>
//     </AuthProvider>
//   )
// }


import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import Assets from './pages/Assets'
import AskAnything from './pages/AskAnything'
import KnowledgeBase from './pages/knowledgeBase'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <span className="loading-spinner" style={{ width: 28, height: 28 }}></span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1e2229', color: '#e8eaf0', border: '1px solid #2a2d35', fontSize: 13 },
            success: { iconTheme: { primary: '#34d399', secondary: '#0a0c10' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0a0c10' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute><Employees /></PrivateRoute>} />
          <Route path="/assets" element={<PrivateRoute><Assets /></PrivateRoute>} />
          <Route path="/ask" element={<PrivateRoute><AskAnything /></PrivateRoute>} />
          <Route path="/knowledge" element={<PrivateRoute adminOnly><KnowledgeBase /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
