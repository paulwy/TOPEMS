import { create } from 'zustand';
import type { Notification, NotificationSettings, NotificationListQuery } from '../api/notification';
import { notificationApi } from '../api/notification';

interface NotificationStore {
  unreadCount: number;
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  wsConnected: boolean;
  settings: NotificationSettings | null;
  selectedIds: string[];
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (params?: NotificationListQuery) => Promise<void>;
  addNotification: (notification: Notification) => void;
  updateNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  bulkMarkAsRead: (ids: string[]) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  setWsConnected: (connected: boolean) => void;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  toggleSelected: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelected: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  wsConnected: false,
  settings: null,
  selectedIds: [],

  fetchUnreadCount: async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  fetchNotifications: async (params) => {
    set({ loading: true });
    try {
      const response = await notificationApi.listNotifications(params);
      set({
        notifications: response.items,
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      set({ loading: false });
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      total: state.total + 1,
    }));
  },

  updateNotification: (notification) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notification.id ? notification : n
      ),
    }));
  },

  removeNotification: (id) => {
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read
          ? state.unreadCount - 1
          : state.unreadCount,
        total: state.total - 1,
      };
    });
  },

  markAsRead: async (id) => {
    try {
      const updated = await notificationApi.markAsRead(id);
      get().updateNotification(updated);
      set((state) => ({
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  bulkMarkAsRead: async (ids) => {
    try {
      await notificationApi.bulkMarkAsRead(ids);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          ids.includes(n.id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount -
            state.notifications.filter((n) => ids.includes(n.id) && !n.read).length
        ),
        selectedIds: [],
      }));
    } catch (error) {
      console.error('Failed to bulk mark as read:', error);
    }
  },

  bulkDelete: async (ids) => {
    try {
      await notificationApi.bulkDelete(ids);
      set((state) => {
        const deletedUnread = state.notifications.filter(
          (n) => ids.includes(n.id) && !n.read
        ).length;
        return {
          notifications: state.notifications.filter((n) => !ids.includes(n.id)),
          unreadCount: Math.max(0, state.unreadCount - deletedUnread),
          total: state.total - ids.length,
          selectedIds: [],
        };
      });
    } catch (error) {
      console.error('Failed to bulk delete:', error);
    }
  },

  setWsConnected: (connected) => {
    set({ wsConnected: connected });
  },

  fetchSettings: async () => {
    try {
      const settings = await notificationApi.getSettings();
      set({ settings });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  },

  updateSettings: async (settings) => {
    try {
      const updated = await notificationApi.updateSettings(settings);
      set({ settings: updated });
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },

  toggleSelected: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id],
    }));
  },

  selectAll: (ids) => {
    set({ selectedIds: ids });
  },

  clearSelected: () => {
    set({ selectedIds: [] });
  },
}));
