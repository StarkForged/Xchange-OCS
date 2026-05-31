import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:             null,
      token:            null,
      isAuthenticated:  false,
      // Persisted array of listing ObjectId strings the user has saved.
      // Populated from the server on login and kept in sync on each toggle.
      savedListingIds:  [],

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      // Replace the entire saved-id list (called after fetching from server)
      setSavedListingIds: (ids) =>
        set({ savedListingIds: ids }),

      // Optimistic helpers — called before API round-trip completes
      addSavedId: (id) =>
        set((state) => ({
          savedListingIds: state.savedListingIds.includes(id)
            ? state.savedListingIds
            : [...state.savedListingIds, id],
        })),

      removeSavedId: (id) =>
        set((state) => ({
          savedListingIds: state.savedListingIds.filter((sid) => sid !== id),
        })),

      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false, savedListingIds: [] }),
    }),
    { name: 'xc-auth' }   // changed key so old persisted data doesn't conflict
  )
)

export default useAuthStore
