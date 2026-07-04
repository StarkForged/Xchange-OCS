import { Navigate, Outlet } from 'react-router-dom'
import useAdminStore from '../store/adminAuth.Store'

export default function AdminRoute() {
  const { isAuthenticated } = useAdminStore()
  return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace />
}
