import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import MainLayout from '../Layouts/MainLayout'
import LoginPage from '../Pages/Auth/LoginPage'
import RegisterPage from '../Pages/Auth/RegisterPage'
import HomePage from '../Pages/Home/HomePage'
import ListingsPage from '../Pages/Listings/ListingsPage'
import CreateListingPage from '../Pages/listings/CreateListingPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/listings" element={<ListingsPage />} />
            <Route path="/create-listing" element={<CreateListingPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
