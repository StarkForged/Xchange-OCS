import api from './axios'

// POST /api/auth/login → { token, user }
export const loginAPI = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password })
  return { token: data.token, user: data.user }
}

// POST /api/auth/register → { token, user }
export const registerAPI = async ({ name, email, password, role = 'buyer' }) => {
  const { data } = await api.post('/auth/register', { name, email, password, role })
  return { token: data.token, user: data.user }
}
