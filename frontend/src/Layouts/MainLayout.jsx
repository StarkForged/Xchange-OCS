import { Outlet } from 'react-router-dom'
import Navbar from '../Components/Navbar/Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
