// Mock auth service — swap these functions for real Axios calls when the backend is ready.
// Response shapes intentionally match the API contracts in api_contracts.md.

const MOCK_DB_KEY = 'xchange_mock_users'

const db = {
  getUsers: () => JSON.parse(localStorage.getItem(MOCK_DB_KEY) || '[]'),
  saveUsers: (users) => localStorage.setItem(MOCK_DB_KEY, JSON.stringify(users)),
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

export const mockRegister = async ({ name, email, password, role = 'buyer' }) => {
  await delay(600)

  const users = db.getUsers()
  if (users.find((u) => u.email === email)) {
    throw new Error('An account with this email already exists')
  }

  const user = {
    _id: `user_${Date.now()}`,
    name,
    email,
    role,
    profileImage: null,
    trustScore: 0,
    responseRate: 0,
    createdAt: new Date().toISOString(),
  }

  db.saveUsers([...users, { ...user, _password: password }])

  // Matches POST /api/auth/register response shape
  return { message: 'Registration successful', user }
}

export const mockLogin = async ({ email, password }) => {
  await delay(600)

  const users = db.getUsers()
  const found = users.find(
    (u) => u.email === email && u._password === password
  )

  if (!found) {
    throw new Error('Invalid email or password')
  }

  const { _password, ...user } = found
  const token = `mock-token-${user._id}-${Date.now()}`

  // Matches POST /api/auth/login response shape
  return { token, user }
}
