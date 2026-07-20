/**
 * Features - WebSocket
 *
 * 通用 WebSocket、Dashboard WebSocket、IM WebSocket
 */

// 通用 WebSocket - WsConnectionStatus 的原始定义在此
export { useWebSocket } from '../../useWebSocket';
export type {
  WsMessage,
  WsConnectionStatus,
  UseWebSocketOptions,
} from '../../useWebSocket';

// Dashboard WebSocket - 注意不要重复导出 WsConnectionStatus
export { useDashboardWebSocket } from '../../useDashboardWebSocket';
export type {
  UseDashboardWebSocketOptions,
  DashboardMessage,
} from '../../useDashboardWebSocket';

// IM WebSocket
export { useImWebSocket } from '../../useImWebSocket';
export type {
  ImWsMessage,
  ImConnectionStatus,
  UseImWebSocketOptions,
} from '../../useImWebSocket';

// Notification WebSocket
export { useNotificationWebSocket } from '../../useNotificationWebSocket';
export type {
  NotificationWsPayload,
  UnreadCountPayload,
  NotificationWsState,
} from '../../useNotificationWebSocket';
