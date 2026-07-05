import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute      from './ProtectedRoute'
import AdminRoute          from './AdminRoute'
import MainLayout          from '../layouts/MainLayout'
import DashboardLayout     from '../layouts/DashboardLayout'

import LoginPage           from '../pages/auth/LoginPage'
import RegisterPage        from '../pages/auth/RegisterPage'
import HomePage            from '../pages/home/HomePage'
import ListingsPage        from '../pages/listings/ListingsPage'
import CreateListingPage   from '../pages/listings/CreateListingPage'
import ListingDetailPage   from '../pages/listings/ListingDetailPage'
import ChatPage            from '../pages/chat/ChatPage'
import ChatDashboard       from '../pages/chat/ChatDashboard'

import DashboardOverview   from '../pages/dashboard/DashboardOverview'
import MyListingsPage      from '../pages/dashboard/MyListingsPage'
import MessagesDashboard   from '../pages/dashboard/MessagesDashboard'
import SavedListingsPage   from '../pages/dashboard/SavedListingsPage'
import ProfilePage         from '../pages/dashboard/ProfilePage'
import SettingsPage        from '../pages/dashboard/SettingsPage'
import ReviewsPage         from '../pages/dashboard/ReviewsPage'
import PublicProfilePage   from '../pages/users/PublicProfilePage'

import AdminLoginPage      from '../pages/admin/AdminLoginPage'
import AdminLayout         from '../pages/admin/AdminLayout'
import AdminDashboard      from '../pages/admin/dashboard/AdminDashboard'
import UsersPage           from '../pages/admin/users/UsersPage'
import AdminListingsPage       from '../pages/admin/listings/ListingsPage'
import AdminListingDetailPage  from '../pages/admin/listings/ListingDetailPage'
import AdminComingSoon     from '../pages/admin/AdminComingSoon'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/register"    element={<RegisterPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route element={<ProtectedRoute />}>

          {/* Main marketplace layout (Navbar + full-page content) */}
          <Route element={<MainLayout />}>
            <Route path="/"                  element={<HomePage />} />
            <Route path="/listings"          element={<ListingsPage />} />
            <Route path="/listings/:id"      element={<ListingDetailPage />} />
            <Route path="/create-listing"    element={<CreateListingPage />} />
            <Route path="/chat"              element={<ChatDashboard />} />
            <Route path="/chat/:listingId"   element={<ChatPage />} />
            <Route path="/users/:userId"     element={<PublicProfilePage />} />
          </Route>

          {/* Dashboard layout (sidebar + nested pages) */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"           element={<DashboardOverview />} />
            <Route path="/dashboard/listings"  element={<MyListingsPage />} />
            <Route path="/dashboard/messages"  element={<MessagesDashboard />} />
            <Route path="/dashboard/saved"     element={<SavedListingsPage />} />
            <Route path="/dashboard/profile"   element={<ProfilePage />} />
            <Route path="/dashboard/settings"  element={<SettingsPage />} />
            <Route path="/dashboard/reviews"   element={<ReviewsPage />} />
          </Route>

        </Route>

        {/* Admin — separate auth guard, no interference with buyer/seller session */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard"   element={<AdminDashboard />} />
            <Route path="/admin/users"       element={<UsersPage />} />
            <Route path="/admin/listings"    element={<AdminListingsPage />} />
            <Route path="/admin/listings/:id" element={<AdminListingDetailPage />} />
            <Route path="/admin/reviews"     element={<AdminComingSoon />} />
            <Route path="/admin/reports"     element={<AdminComingSoon />} />
            <Route path="/admin/categories"  element={<AdminComingSoon />} />
            <Route path="/admin/settings"    element={<AdminComingSoon />} />
            <Route path="/admin"             element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
