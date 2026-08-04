import { useCallback, useEffect, useRef, useState } from 'react';
import { webSocketService, type WebSocketMessage } from './useWebSocket';

export interface NotificationWsPayload {
  id: string;
  title?: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface UnreadCountPayload {
  count: number;
}

export interface NotificationWsState {
  isConnected: boolean;
  notifications: NotificationWsPayload[];
  unreadCount: number;
  error: Error | null;
}

export interface UseNotificationWebSocketOptions {
  userId: string;
  onNotification?: (notification: any) => void;
  onUnreadCountChange?: (count: number) => void;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

export function useNotificationWebSocket(
  userIdOrOptions: string | UseNotificationWebSocketOptions,
  enabledOrLegacy = true
): NotificationWsState & {
  markAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
  reconnect: () => void;
} {
  const options: UseNotificationWebSocketOptions =
    typeof userIdOrOptions === 'string' ? { userId: userIdOrOptions } : userIdOrOptions;

  const { userId, onNotification, onUnreadCountChange } = options;
  const enabled =
    typeof userIdOrOptions === 'string' ? enabledOrLegacy : (options.autoConnect ?? true);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWsPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!enabled || !userId) return;

    let unsubscribe: (() => void) | null = null;

    const connectAndSubscribe = async () => {
      try {
        await webSocketService.connect();
        setIsConnected(true);
        setError(null);

        // Subscribe to notification channel
        unsubscribe = webSocketService.subscribe('notification', (message: WebSocketMessage) => {
          handleNotificationMessage(message);
        });

        // Subscribe to unread count updates
        webSocketService.subscribe('unread_count', (message: WebSocketMessage) => {
          handleUnreadCountMessage(message);
        });

        // Send initial subscription with user_id
        webSocketService.send({
          type: 'subscribe',
          payload: { channel: 'notifications', user_id: userId },
        });
      } catch (err) {
        setIsConnected(false);
        setError(err instanceof Error ? err : new Error('WebSocket connection failed'));
      }
    };

    const handleNotificationMessage = (message: WebSocketMessage) => {
      if (message.type === 'notification' && message.payload) {
        const payload = message.payload as unknown as NotificationWsPayload;
        setNotifications((prev) => [payload, ...prev]);
        setUnreadCount((prev) => prev + 1);
        onNotification?.(payload);
      }
    };

    const handleUnreadCountMessage = (message: WebSocketMessage) => {
      if (message.type === 'unread_count' && message.payload) {
        const payload = message.payload as unknown as UnreadCountPayload;
        setUnreadCount(payload.count);
        onUnreadCountChange?.(payload.count);
      }
    };

    connectAndSubscribe();

    return () => {
      unsubscribe?.();
    };
  }, [userId, enabled]);

  const markAsRead = useCallback((notificationId: string) => {
    webSocketService.send({
      type: 'mark_as_read',
      payload: { notification_id: notificationId },
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, type: 'info' as const } : n))
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const reconnect = useCallback(() => {
    setError(null);
    webSocketService.connect();
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount,
    error,
    markAsRead,
    clearNotifications,
    reconnect,
  };
}
