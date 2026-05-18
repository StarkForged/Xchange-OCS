const MOCK_DB_KEY = 'xchange_mock_users'

const storage = {
  get: (key) => JSON.parse(localStorage.getItem(key) || 'null'),
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
}

const db = {
  getUsers: () => storage.get(MOCK_DB_KEY) || [],
  saveUsers: (users) => storage.set(MOCK_DB_KEY, users),
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

const generateToken = (user) => {
  return btoa(JSON.stringify({
    id: user._id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60
  }))
}

// LOGIN
export const loginAPI = async ({ email, password }) => {
  await delay(600)

  if (!email || !password) {
    throw { message: 'Email and password are required', status: 400 }
  }

  const users = db.getUsers()
  const found = users.find((u) => u.email === email && u._password === password)

  if (!found) {
    throw { message: 'Invalid email or password', status: 401 }
  }

  const { _password, ...user } = found
  const token = generateToken(user)

  return { token, user }
}

// REGISTER
export const registerAPI = async ({ name, email, password, role = 'buyer' }) => {
  await delay(600)

  if (!name || !email || !password) {
    throw { message: 'All fields are required', status: 400 }
  }

  const users = db.getUsers()

  if (users.find((u) => u.email === email)) {
    throw { message: 'Email already exists', status: 409 }
  }

  const user = {
    _id: `user_${Date.now()}`,
    name,
    email,
    role,
    profileImage: '/assets/images/default-avatar.png',
    trustScore: 0,
    responseRate: 0,
    createdAt: new Date().toISOString(),
  }

  db.saveUsers([...users, { ...user, _password: password }])

  return { message: 'Registration successful', user }
}