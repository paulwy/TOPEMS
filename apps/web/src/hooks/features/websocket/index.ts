/**
 * Features - WebSocket
 *
 * 通用 WebSocket、Dashboard WebSocket、IM WebSocket、通知/Snackbar WebSocket 频道
 */

// 通用 WebSocket - WsConnectionStatus 的原始定义在此
export {
  useWebSocket,
  webSocketService,
  useWebSocketSubscription,
  useWebSocketConnection,
} from '../../useWebSocket';
export type {
  WsMessage,
  WsConnectionStatus,
  UseWebSocketOptions,
  WebSocketMessage,
  SubscriptionConfig,
} from '../../useWebSocket';

// Dashboard WebSocket - 注意不要重复导出 WsConnectionStatus
export { useDashboardWebSocket } from '../../useDashboardWebSocket';

// IM WebSocket
export { useImWebSocket } from '../../useImWebSocket';
export type { ImWsMessage } from '../../useImWebSocket';

// Notification WebSocket
export { useNotificationWebSocket } from '../../useNotificationWebSocket';
export type {
  NotificationWsPayload,
  UnreadCountPayload,
  NotificationWsState,
} from '../../useNotificationWebSocket';

// WebSocket → Snackbar 通知频道（原 useUnifiedWebSocket 内的便捷 hooks）
export {
  useWebSocketNotifications,
  useWebSocketNotificationChannel,
  useWebSocketAlertChannel,
} from '../../useWebSocketNotifications';
export type { WsNotificationConfig } from '../../useWebSocketNotifications';
