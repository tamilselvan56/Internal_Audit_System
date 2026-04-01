import axios from 'axios'

const api = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api` 
    : '/api' 
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (email, password) => {
  const form = new FormData()
  form.append('username', email)
  form.append('password', password)
  return api.post('/auth/login', form)
}
export const register = (data) => api.post('/auth/register', data)
export const createUser = (data) => api.post('/auth/register', data)
export const getUsers = () => api.get('/auth/users')
export const deleteUser = (userId) => api.delete(`/auth/users/${userId}`)
export const getMe = () => api.get('/auth/me')

// Dashboard
export const getDashboard = () => api.get('/dashboard')

// HR
export const getEmployees = (status) => api.get('/hr/employees', { params: status ? { status } : {} })
export const getEmployee = (id) => api.get(`/hr/employees/${id}`)
export const createEmployee = (data) => api.post('/hr/employees', data)
export const updateOnboardingStep = (stepId, data) => api.patch(`/hr/onboarding/${stepId}`, data)
export const updateRelievingStep = (stepId, data) => api.patch(`/hr/relieving/${stepId}`, data)
export const relieveEmployee = (id, data) => api.post(`/hr/employees/${id}/relieve`, data)
export const downloadEmployeePdf = (id) => api.get(`/hr/employees/${id}/export/pdf`, { responseType: 'blob' })
export const getEmployeeDocuments = (employeeId, category) =>
  api.get(`/documents/employees/${employeeId}`, { params: category ? { category } : {} })
export const uploadEmployeeDocument = (employeeId, formData) =>
  api.post(`/documents/employees/${employeeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const deleteEmployeeDocument = (docId) => api.delete(`/documents/employees/document/${docId}`)

// IT Assets
export const getAssets = (params) => api.get('/it/assets', { params })
export const getAsset = (id) => api.get(`/it/assets/${id}`)
export const createAsset = (data) => api.post('/it/assets', data)
export const updateAssetIntake = (assetId, data) => api.patch(`/it/assets/${assetId}/intake`, data)
export const assignAsset = (assetId, data) => api.post(`/it/assets/${assetId}/assign`, data)
export const replaceAsset = (data) => api.post('/it/assets/replace', data)
export const transitionAssetStatus = (assetId, data) => api.patch(`/it/assets/${assetId}/status`, data)
export const getAssetHistory = (id) => api.get(`/it/assets/${id}/history`)
export const getAssetDocuments = (assetId) => api.get(`/it/assets/${assetId}/documents`)
export const deleteAssetDocument = (assetId, documentId) => api.delete(`/it/assets/${assetId}/documents/${documentId}`)
export const uploadAssetDocument = (assetId, formData) => api.post(`/it/assets/${assetId}/documents`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const openRepairTicket = (assetId, data) => api.post(`/it/assets/${assetId}/repair/open`, data)
export const closeRepairTicket = (assetId, ticketNo, data) => api.patch(`/it/assets/${assetId}/repair/${ticketNo}/close`, data)

// RAG Query
export const queryKnowledge = (question) => api.post('/query', { question })

export default api
