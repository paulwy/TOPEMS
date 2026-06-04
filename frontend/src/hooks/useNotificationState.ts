import { useState, useCallback, useEffect } from 'react';
import { Notification, getNotifications, getUnreadCount } from '../api/notification';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export const useNotificationState = () => {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  });

  const fetchNotifications = useCallback(async (page = 1, pageSize = 20) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await getNotifications(page, pageSize);
      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          notifications: response.data!.notifications,
          unreadCount: response.data!.unread_count,
          loading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch notifications',
      }));
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await getUnreadCount();
      if (response.success && response.data !== undefined) {
        setState((prev) => ({
          ...prev,
          unreadCount: response.data!,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  const addNotification = useCallback((notification: Notification) => {
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...prev.notifications],
      unreadCount: notification.is_read ? prev.unreadCount : prev.unreadCount + 1,
    }));
  }, []);

  const updateNotification = useCallback((notification: Notification) => {
    setState((prev) => {
      const oldNotification = prev.notifications.find((n) => n.id === notification.id);
      const wasUnread = oldNotification && !oldNotification.is_read;
      const isUnread = !notification.is_read;

      return {
        ...prev,
        notifications: prev.notifications.map((n) => (n.id === notification.id ? notification : n)),
        unreadCount: wasUnread && !isUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
      };
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setState((prev) => {
      const notification = prev.notifications.find((n) => n.id === id);
      return {
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.is_read ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
      };
    });
  }, []);

  // Don't auto-fetch notifications by default
  useEffect(() => {
    // fetchNotifications();
    // fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    ...state,
    fetchNotifications,
    fetchUnreadCount,
    addNotification,
    updateNotification,
    removeNotification,
  };
};
