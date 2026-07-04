import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAdminStore = create(
  persist(
    (set) => ({
      admin:           null,
      token:           null,
      isAuthenticated: false,

      setAuth: (admin, token) =>
        set({ admin, token, isAuthenticated: true }),

      clearAuth: () =>
        set({ admin: null, token: null, isAuthenticated: false }),
    }),
    { name: 'xc-admin' }
  )
)

export default useAdminStore
