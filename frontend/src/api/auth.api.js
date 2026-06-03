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

// GET /api/users/profile → { user, trustBreakdown }
export const getProfileAPI = async () => {
  const { data } = await api.get('/users/profile')
  return data
}

// PUT /api/users/profile → { user }
// updates must include { password } for server-side verification.
export const updateProfileAPI = async (updates) => {
  const { data } = await api.put('/users/profile', updates)
  return data
}
