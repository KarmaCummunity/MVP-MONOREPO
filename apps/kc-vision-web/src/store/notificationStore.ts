import { create } from 'zustand'
import {
  VISION_NOTIFICATIONS,
  type VisionNotification,
} from '../fixtures/notifications.fixtures'

interface NotificationState {
  items: VisionNotification[]
  markRead: (id: string) => void
  markAllReadForUser: (userId: string) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [...VISION_NOTIFICATIONS],
  markRead: (id) =>
    set({
      items: get().items.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }),
  markAllReadForUser: (userId) =>
    set({
      items: get().items.map((n) =>
        n.user_id === userId ? { ...n, read: true } : n,
      ),
    }),
}))
