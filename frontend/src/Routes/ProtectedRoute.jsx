import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/auth.Store'

export default function ProtectedRoute() {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'admin') return <Navigate to="/admin/login" replace />
  return <Outlet />
}
