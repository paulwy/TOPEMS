// V79-3 verified: 内部全部使用 camelCase，snake_case 仅用于 export 兼容
/**
 * @env-entry @done V79 migrate-to-config-env-singleton 完成
 *
 * 本文件已迁移为 useWebSocket（hooks/useWebSocket.ts）的薄封装：
 * - 基础连接管理（重连/超时/鉴权握手/心跳/签名）全部委托给 ./useWebSocket 的
 *   useWebSocket + webSocketService，不再保留重复的 WebSocketService 类与 useWebSocketBase。
 * - 仅保留 useUnifiedWebSocket 特有的通知中心 / Snackbar 扩展业务逻辑。
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/utils/logger';
import { useNotificationStore } from '@/store/notificationStore';
import {
  useWebSocket as useWebSocketBase,
  webSocketService,
  useWebSocketSubscription,
  useWebSocketConnection,
  type WebSocketMessage,
  type WsConnectionStatus,
  type UseWebSocketOptions,
} from './useWebSocket';
import i18n from '@/i18n';

// 统一从 ./useWebSocket 再导出类型与服务，保持原有 import 路径向后兼容
export type {
  WebSocketMessage,
  WsMessage,
  WsConnectionStatus,
  UseWebSocketOptions,
  SubscriptionConfig,
} from './useWebSocket';
export { webSocketService, useWebSocketSubscription, useWebSocketConnection };

export interface WsNotificationConfig {
  channel?: string;
  messageType?: string;
  enabled?: boolean;
  getTitle?: (message: WebSocketMessage) => string | undefined;
  getMessage?: (message: WebSocketMessage) => string;
  getType?: (message: WebSocketMessage) => 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

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
  onNotification?: (notification: NotificationWsPayload) => void;
  onUnreadCountChange?: (count: number) => void;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

export interface UseUnifiedWebSocketOptions extends UseWebSocketOptions {
  /**
   * 启用通知模式：
   * - 'snackbar': WebSocket消息自动转Snackbar通知（对应 useWebSocketNotifications）
   * - 'center': 启用通知中心管理模式（对应 useNotificationWebSocket）
   * - true: 同时启用两种模式
   */
  notifications?: boolean | 'snackbar' | 'center';
  /** notifications='center' 时的配置 */
  notificationOptions?: Omit<UseNotificationWebSocketOptions, 'maxReconnectAttempts'>;
  /** notifications='snackbar' 时的配置 */
  snackbarOptions?: WsNotificationConfig;
}

export interface UnifiedNotificationExtensions {
  subscribeNotifications: (handler: (notification: NotificationWsPayload) => void) => () => void;
  markAsRead: (notificationId: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  notifications: NotificationWsPayload[];
  unreadCount: number;
  error: Error | null;
}

export type UseUnifiedWebSocketResult = ReturnType<typeof useWebSocketBase> & {
  notification?: UnifiedNotificationExtensions;
};

/**
 * @deprecated 已直接并入 hooks/useWebSocket.ts 的默认导出。
 * 新项目/新代码直接 import useWebSocket，不要走 useUnifiedWebSocket 别名。
 *
 * 内部实现已改为薄封装：基础连接管理（重连/超时/鉴权/心跳）委托给
 * ./useWebSocket 的 useWebSocket，仅保留通知中心 / Snackbar 扩展等
 * useUnifiedWebSocket 特有的业务逻辑。
 */
export function useUnifiedWebSocket(
  options: UseUnifiedWebSocketOptions = {}
): UseUnifiedWebSocketResult {
  const { notifications, notificationOptions, snackbarOptions, ...baseOptions } = options;
  const baseResult = useWebSocketBase(baseOptions);

  const addSnackbarNotification = useNotificationStore((state) => state.addNotification);
  const addSnackbarRef = useRef(addSnackbarNotification);

  useEffect(() => {
    addSnackbarRef.current = addSnackbarNotification;
  }, [addSnackbarNotification]);

  const [notificationState, setNotificationState] = useState<{
    notifications: NotificationWsPayload[];
    unreadCount: number;
    error: Error | null;
  }>({
    notifications: [],
    unreadCount: 0,
    error: null,
  });
  const notificationsRef = useRef<NotificationWsPayload[]>([]);
  const notificationHandlersRef = useRef<Set<(n: NotificationWsPayload) => void>>(new Set());

  useEffect(() => {
    notificationsRef.current = notificationState.notifications;
  }, [notificationState.notifications]);

  const enableSnackbar = notifications === true || notifications === 'snackbar';
  const enableCenter = notifications === true || notifications === 'center';

  useEffect(() => {
    if (!enableSnackbar) return;

    const channel = snackbarOptions?.channel || 'notifications';
    const messageType = snackbarOptions?.messageType;
    const enabled = snackbarOptions?.enabled !== false;

    if (!enabled) return;

    const unsubscribe = webSocketService.subscribe(channel, (message: WebSocketMessage) => {
      if (messageType && message.type !== messageType) return;

      const getTitle =
        snackbarOptions?.getTitle || ((msg) => msg.payload?.title as string | undefined);
      const getMessage =
        snackbarOptions?.getMessage ||
        ((msg) => (msg.payload?.message as string) || i18n.t('shared.use_unified_web_socket.k0'));
      const getType =
        snackbarOptions?.getType ||
        ((msg) => {
          const payloadType = msg.payload?.type as string | undefined;
          if (payloadType === 'success' || payloadType === 'error' || payloadType === 'warning') {
            return payloadType;
          }
          return 'info';
        });
      const duration = snackbarOptions?.duration || 6000;

      const title = getTitle(message);
      const msg = getMessage(message);
      const type = getType(message);

      addSnackbarRef.current({
        title,
        message: msg,
        type,
        duration,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [
    enableSnackbar,
    snackbarOptions?.channel,
    snackbarOptions?.messageType,
    snackbarOptions?.enabled,
    snackbarOptions?.getTitle,
    snackbarOptions?.getMessage,
    snackbarOptions?.getType,
    snackbarOptions?.duration,
  ]);

  const userId = notificationOptions?.userId;
  const onNotification = notificationOptions?.onNotification;
  const onUnreadCountChange = notificationOptions?.onUnreadCountChange;
  const enabledCenter = enableCenter && (notificationOptions?.autoConnect ?? true);

  useEffect(() => {
    if (!enabledCenter || !userId) return;

    let unsubscribeNotification: (() => void) | null = null;
    let unsubscribeUnread: (() => void) | null = null;

    const connectAndSubscribe = async () => {
      try {
        await webSocketService.connect();
        setNotificationState((prev) => ({ ...prev, error: null }));

        unsubscribeNotification = webSocketService.subscribe(
          'notification',
          (message: WebSocketMessage) => {
            if (message.type === 'notification' && message.payload) {
              const payload = message.payload as unknown as NotificationWsPayload;
              setNotificationState((prev) => ({
                ...prev,
                notifications: [payload, ...prev.notifications],
                unreadCount: prev.unreadCount + 1,
              }));
              notificationHandlersRef.current.forEach((handler) => {
                try {
                  handler(payload);
                } catch (err) {
                  logger.error('[UnifiedWS] Notification handler error:', err);
                }
              });
              onNotification?.(payload);
            }
          }
        );

        unsubscribeUnread = webSocketService.subscribe(
          'unread_count',
          (message: WebSocketMessage) => {
            if (message.type === 'unread_count' && message.payload) {
              const payload = message.payload as unknown as UnreadCountPayload;
              setNotificationState((prev) => ({ ...prev, unreadCount: payload.count }));
              onUnreadCountChange?.(payload.count);
            }
          }
        );

        webSocketService.send({
          type: 'subscribe',
          payload: { channel: 'notifications', user_id: userId },
        });
      } catch (err) {
        setNotificationState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error('WebSocket connection failed'),
        }));
      }
    };

    connectAndSubscribe();

    return () => {
      unsubscribeNotification?.();
      unsubscribeUnread?.();
    };
  }, [enabledCenter, userId, onNotification, onUnreadCountChange]);

  const markAsRead = useCallback((notificationId: string) => {
    webSocketService.send({
      type: 'mark_as_read',
      payload: { notification_id: notificationId },
    });
    setNotificationState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, type: 'info' as const } : n
      ),
      unreadCount: Math.max(0, prev.unreadCount - 1),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    webSocketService.send({
      type: 'mark_all_read',
      payload: {},
    });
    setNotificationState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, type: 'info' as const })),
      unreadCount: 0,
    }));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotificationState({
      notifications: [],
      unreadCount: 0,
      error: null,
    });
  }, []);

  const subscribeNotifications = useCallback(
    (handler: (notification: NotificationWsPayload) => void) => {
      notificationHandlersRef.current.add(handler);
      return () => {
        notificationHandlersRef.current.delete(handler);
      };
    },
    []
  );

  const notificationExtensions: UnifiedNotificationExtensions | undefined = enableCenter
    ? {
        subscribeNotifications,
        markAsRead,
        markAllRead,
        clearNotifications,
        notifications: notificationState.notifications,
        unreadCount: notificationState.unreadCount,
        error: notificationState.error || null,
      }
    : undefined;

  return {
    ...baseResult,
    ...(notificationExtensions ? { notification: notificationExtensions } : {}),
  } as UseUnifiedWebSocketResult;
}

export function useWebSocketNotifications(config: WsNotificationConfig): void {
  const {
    channel = 'notifications',
    messageType,
    enabled = true,
    getTitle,
    getMessage,
    getType,
    duration,
  } = config;
  const addNotification = useNotificationStore((state) => state.addNotification);
  const addRef = useRef(addNotification);

  useEffect(() => {
    addRef.current = addNotification;
  }, [addNotification]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = webSocketService.subscribe(channel, (message: WebSocketMessage) => {
      if (messageType && message.type !== messageType) return;

      const title = getTitle?.(message);
      const msg = getMessage
        ? getMessage(message)
        : (message.payload?.message as string) || i18n.t('shared.use_unified_web_socket.k1');
      const type = getType?.(message) || 'info';

      addRef.current({
        title,
        message: msg,
        type,
        duration: duration || 5000,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [channel, messageType, enabled, getTitle, getMessage, getType, duration]);
}

export function useWebSocketNotificationChannel(
  channel: string = 'notifications',
  enabled: boolean = true
): void {
  useWebSocketNotifications({
    channel,
    enabled,
    getTitle: (msg) => msg.payload?.title as string | undefined,
    getMessage: (msg) =>
      (msg.payload?.message as string) || i18n.t('shared.use_unified_web_socket.k2'),
    getType: (msg) => {
      const payloadType = msg.payload?.type as string | undefined;
      if (payloadType === 'success' || payloadType === 'error' || payloadType === 'warning') {
        return payloadType;
      }
      return 'info';
    },
    duration: 6000,
  });
}

export function useWebSocketAlertChannel(enabled: boolean = true): void {
  useWebSocketNotifications({
    channel: 'alerts',
    enabled,
    getTitle: (msg) => (msg.payload?.title as string) || i18n.t('shared.use_unified_web_socket.k3'),
    getMessage: (msg) =>
      (msg.payload?.message as string) || i18n.t('shared.use_unified_web_socket.k4'),
    getType: (msg) => {
      const severity = msg.payload?.severity as string | undefined;
      if (severity === 'critical' || severity === 'high') return 'error';
      if (severity === 'medium') return 'warning';
      return 'info';
    },
    duration: 8000,
  });
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

  const result = useUnifiedWebSocket({
    notifications: 'center',
    notificationOptions: {
      userId,
      onNotification,
      onUnreadCountChange,
      autoConnect: enabled,
    },
    enabled,
  });

  const reconnect = useCallback(() => {
    webSocketService.connect();
  }, []);

  return {
    isConnected: result.isConnected,
    notifications: result.notification?.notifications || [],
    unreadCount: result.notification?.unreadCount || 0,
    error: result.notification?.error || null,
    markAsRead: result.notification?.markAsRead || (() => {}),
    clearNotifications: result.notification?.clearNotifications || (() => {}),
    reconnect,
  };
}

/** @canonical-ws-naming 主实现：统一为 camelCase 命名风格 */
export const useWebSocket = useUnifiedWebSocket;

/** @canonical-ws-naming 主实现 */
export const createConnection = webSocketService.connect.bind(webSocketService);
/** @canonical-ws-naming 主实现 */
export const closeConnection = webSocketService.disconnect.bind(webSocketService);
/** @canonical-ws-naming 主实现 */
export const sendMessage = webSocketService.send.bind(webSocketService);
/** @canonical-ws-naming 主实现 */
export const subscribeTopic = webSocketService.subscribe.bind(webSocketService);
/** @canonical-ws-naming 主实现 */
export const unsubscribeTopic = webSocketService.unsubscribe.bind(webSocketService);
/** @canonical-ws-naming 主实现 */
export const getConnectionStatus = (): WsConnectionStatus =>
  webSocketService.isConnected() ? 'connected' : 'disconnected';
/** @canonical-ws-naming 主实现 */
export const reconnectSocket = (): void => {
  webSocketService.disconnect();
  void webSocketService.connect();
};
/** @canonical-ws-naming 主实现 */
export const pingServer = (): Promise<void> => webSocketService.send({ type: 'ping', payload: {} });

/**
 * V78.0-V82 命名风格迁移历史记录：
 * 以下 snake_case 别名已在 V82 移除，请使用 camelCase 命名：
 * - createConnection（原 create_connection）
 * - closeConnection（原 close_connection）
 * - sendMessage（原 send_message）
 * - subscribeTopic（原 subscribe_topic）
 * - unsubscribeTopic（原 unsubscribe_topic）
 * - getConnectionStatus（原 get_connection_status）
 * - reconnectSocket（原 reconnect_socket）
 * - pingServer（原 ping_server）
 * - useUnifiedWebSocket（原 use_unified_web_socket）
 * - useWebSocketSubscription（原 use_web_socket_subscription）
 * - useWebSocketConnection（原 use_web_socket_connection）
 */
