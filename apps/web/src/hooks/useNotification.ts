import { useState, useCallback } from "react";

export type NotificationType = "success" | "error" | "info" | "warning";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

export interface NotificationOptions {
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback(
    (type: NotificationType, message: string, duration: number = 3000) => {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, duration);
      }

      return id;
    },
    [],
  );

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      return showNotification("success", message, duration);
    },
    [showNotification],
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      return showNotification("error", message, duration);
    },
    [showNotification],
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      return showNotification("info", message, duration);
    },
    [showNotification],
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      return showNotification("warning", message, duration);
    },
    [showNotification],
  );

  const addNotification = useCallback(
    (options: NotificationOptions) => {
      return showNotification(options.type, options.message, options.duration);
    },
    [showNotification],
  );

  const result = {
    notifications,
    showNotification,
    hideNotification,
    success,
    error,
    info,
    warning,
  };

  return Object.assign(addNotification, result);
}
