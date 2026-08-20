import { create } from 'zustand';

export interface Notification {
  id: string;
  title?: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  addNotification: (notification) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id,
          ...notification,
          timestamp: Date.now(),
        },
      ],
    }));
    return id;
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));

const useNotifications = () => useNotificationStore((state) => state.notifications);
const useAddNotification = () => useNotificationStore((state) => state.addNotification);
const useRemoveNotification = () => useNotificationStore((state) => state.removeNotification);
const useClearNotifications = () => useNotificationStore((state) => state.clearNotifications);
