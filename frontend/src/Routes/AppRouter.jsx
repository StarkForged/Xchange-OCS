import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute      from './ProtectedRoute'
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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>

          {/* Main marketplace layout (Navbar + full-page content) */}
          <Route element={<MainLayout />}>
            <Route path="/"                  element={<HomePage />} />
            <Route path="/listings"          element={<ListingsPage />} />
            <Route path="/listings/:id"      element={<ListingDetailPage />} />
            <Route path="/create-listing"    element={<CreateListingPage />} />
            <Route path="/chat"              element={<ChatDashboard />} />
            <Route path="/chat/:listingId"   element={<ChatPage />} />
          </Route>

          {/* Dashboard layout (sidebar + nested pages) */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard"           element={<DashboardOverview />} />
            <Route path="/dashboard/listings"  element={<MyListingsPage />} />
            <Route path="/dashboard/messages"  element={<MessagesDashboard />} />
            <Route path="/dashboard/saved"     element={<SavedListingsPage />} />
            <Route path="/dashboard/profile"   element={<ProfilePage />} />
            <Route path="/dashboard/settings"  element={<SettingsPage />} />
          </Route>

        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
