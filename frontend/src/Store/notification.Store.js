import { create } from 'zustand'
import { getNotificationsAPI, markReadAPI, markAllReadAPI } from '../api/notification.api'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  loading:       false,

  // Fetch latest notifications + unread count from server
  fetchNotifications: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      const { notifications, unreadCount } = await getNotificationsAPI()
      set({ notifications, unreadCount })
    } catch {
      // silent — do not break UI if notifications fail
    } finally {
      set({ loading: false })
    }
  },

  // Mark single notification read (optimistic)
  markRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
    try { await markReadAPI(id) } catch { /* silent */ }
  },

  // Mark all read (optimistic)
  markAllRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount:   0,
    }))
    try { await markAllReadAPI() } catch { /* silent */ }
  },

  // Increment unread count when a notification arrives via socket (future use)
  addUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
}))

export default useNotificationStore
