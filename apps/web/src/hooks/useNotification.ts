import { useCallback } from 'react';
import { useNotificationStore, type Notification } from '@/store';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationOptions {
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export interface UseNotificationResult {
  notifications: Notification[];
  success: (message: string, titleOrDuration?: string | number, duration?: number) => string;
  error: (message: string, titleOrDuration?: string | number, duration?: number) => string;
  info: (message: string, titleOrDuration?: string | number, duration?: number) => string;
  warning: (message: string, titleOrDuration?: string | number, duration?: number) => string;
  showNotification: (
    type: NotificationType,
    message: string,
    titleOrDuration?: string | number,
    duration?: number
  ) => string;
  hideNotification: (id: string) => void;
  addNotification: (options: NotificationOptions) => string;
  clearNotifications: () => void;
}

function parseArgs(
  _message: string,
  titleOrDuration?: string | number,
  duration?: number
): { title?: string; duration?: number } {
  if (typeof titleOrDuration === 'string') {
    return { title: titleOrDuration, duration };
  }
  if (typeof titleOrDuration === 'number') {
    return { duration: titleOrDuration };
  }
  return {};
}

export function useNotification(): UseNotificationResult {
  const notifications = useNotificationStore((state) => state.notifications);
  const addNotificationStore = useNotificationStore((state) => state.addNotification);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);

  const showNotification = useCallback(
    (
      type: NotificationType,
      message: string,
      titleOrDuration?: string | number,
      duration?: number
    ): string => {
      const { title, duration: dur } = parseArgs(message, titleOrDuration, duration);
      return addNotificationStore({
        title,
        message,
        type,
        duration: dur,
      });
    },
    [addNotificationStore]
  );

  const hideNotification = useCallback(
    (id: string) => {
      removeNotification(id);
    },
    [removeNotification]
  );

  const success = useCallback(
    (message: string, titleOrDuration?: string | number, duration?: number) => {
      return showNotification('success', message, titleOrDuration, duration);
    },
    [showNotification]
  );

  const error = useCallback(
    (message: string, titleOrDuration?: string | number, duration?: number) => {
      return showNotification('error', message, titleOrDuration, duration);
    },
    [showNotification]
  );

  const info = useCallback(
    (message: string, titleOrDuration?: string | number, duration?: number) => {
      return showNotification('info', message, titleOrDuration, duration);
    },
    [showNotification]
  );

  const warning = useCallback(
    (message: string, titleOrDuration?: string | number, duration?: number) => {
      return showNotification('warning', message, titleOrDuration, duration);
    },
    [showNotification]
  );

  const addNotificationWrapper = useCallback(
    (options: NotificationOptions) => {
      return addNotificationStore({
        title: options.title,
        message: options.message,
        type: options.type,
        duration: options.duration,
      });
    },
    [addNotificationStore]
  );

  return {
    notifications,
    showNotification,
    hideNotification,
    success,
    error,
    info,
    warning,
    addNotification: addNotificationWrapper,
    clearNotifications,
  };
}

export default useNotification;
