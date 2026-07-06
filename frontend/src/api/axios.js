import axios from 'axios'
import useAuthStore from '../store/auth.Store'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const message =
      err.response?.data?.message || err.message || 'Network error'

    if (status === 401) {
      useAuthStore.getState().clearAuth()
    }

    return Promise.reject({ message, status, data: err.response?.data })
  }
)

export default api
