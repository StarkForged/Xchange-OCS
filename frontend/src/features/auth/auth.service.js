import { loginAPI } from '../../api/auth.api'

// Business logic layer — sits between the page and the API.
// Returns { token, user } on success; throws on failure.
export const loginUser = async (data) => {
  const response = await loginAPI(data)
  return response
}
// REGISTER  
export const registerUser = async (data) => {
  const response = await registerAPI(data)
  return response
}