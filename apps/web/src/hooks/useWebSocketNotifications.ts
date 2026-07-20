import { useEffect, useRef } from 'react';
import { webSocketService, type WebSocketMessage } from './useWebSocket';
import { useNotificationStore } from '@/store/notificationStore';

export interface WsNotificationConfig {
  /** 订阅的频道 */
  channel: string;
  /** 消息类型过滤 */
  messageType?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 自定义标题提取 */
  getTitle?: (message: WebSocketMessage) => string | undefined;
  /** 自定义内容提取 */
  getMessage: (message: WebSocketMessage) => string;
  /** 通知类型映射 */
  getType?: (message: WebSocketMessage) => 'info' | 'success' | 'error' | 'warning';
  /** 显示时长(ms) */
  duration?: number;
}

/**
 * WebSocket 消息自动转通知 Hook
 *
 * 将 WebSocket 收到的消息自动显示为通知 Snackbar。
 *
 * @example
 * ```tsx
 * useWebSocketNotifications({
 *   channel: 'alerts',
 *   getMessage: (msg) => msg.payload?.message || '收到新消息',
 *   getType: (msg) => msg.payload?.severity || 'info',
 *   duration: 5000,
 * });
 * ```
 */
export function useWebSocketNotifications(config: WsNotificationConfig): void {
  const { channel, messageType, enabled = true, getTitle, getMessage, getType, duration } = config;
  const addNotification = useNotificationStore((state) => state.addNotification);
  const addRef = useRef(addNotification);

  useEffect(() => {
    addRef.current = addNotification;
  }, [addNotification]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = webSocketService.subscribe(channel, (message: WebSocketMessage) => {
      // 类型过滤
      if (messageType && message.type !== messageType) return;

      const title = getTitle?.(message);
      const msg = getMessage(message);
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

/**
 * 便捷 Hook: 监听 WebSocket 通知频道
 *
 * @example
 * ```tsx
 * useWebSocketNotificationChannel('notifications');
 * ```
 */
export function useWebSocketNotificationChannel(
  channel: string = 'notifications',
  enabled: boolean = true
): void {
  useWebSocketNotifications({
    channel,
    enabled,
    getTitle: (msg) => msg.payload?.title as string | undefined,
    getMessage: (msg) => (msg.payload?.message as string) || '收到新通知',
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

/**
 * 便捷 Hook: 监听 WebSocket 告警频道
 *
 * @example
 * ```tsx
 * useWebSocketAlertChannel();
 * ```
 */
export function useWebSocketAlertChannel(enabled: boolean = true): void {
  useWebSocketNotifications({
    channel: 'alerts',
    enabled,
    getTitle: (msg) => (msg.payload?.title as string) || '系统告警',
    getMessage: (msg) => (msg.payload?.message as string) || '收到新的系统告警',
    getType: (msg) => {
      const severity = msg.payload?.severity as string | undefined;
      if (severity === 'critical' || severity === 'high') return 'error';
      if (severity === 'medium') return 'warning';
      return 'info';
    },
    duration: 8000,
  });
}
