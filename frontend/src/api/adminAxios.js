import axios from 'axios'
import useAdminStore from '../store/adminAuth.Store'

const adminApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  const token = useAdminStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status
    const message = err.response?.data?.message || err.message || 'Network error'

    // Only redirect on 401 for authenticated requests, not for the login call itself
    if (status === 401 && !err.config?.url?.endsWith('/admin/login')) {
      useAdminStore.getState().clearAuth()
      window.location.href = '/admin/login'
    }

    return Promise.reject({ message, status })
  }
)

export default adminApi
