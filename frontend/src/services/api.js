import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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

// IT Assets
export const getAssets = (params) => api.get('/it/assets', { params })
export const getAsset = (id) => api.get(`/it/assets/${id}`)
export const createAsset = (data) => api.post('/it/assets', data)
export const assignAsset = (assetId, data) => api.post(`/it/assets/${assetId}/assign`, data)
export const replaceAsset = (data) => api.post('/it/assets/replace', data)
export const getAssetHistory = (id) => api.get(`/it/assets/${id}/history`)

// RAG Query
export const queryKnowledge = (question) => api.post('/query', { question })

export default api
