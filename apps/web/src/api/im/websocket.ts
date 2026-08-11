/**
 * IM · WebSocket 实时连接管理
 *
 * 后端: IM 服务 WebSocket 端点
 * 路径格式: /ws/{module}/{feature} (遵循项目统一规范)
 * 路由:
 *   WS   /ws/im/connect
 *   POST /ws/im/authenticate
 *   GET  /ws/im/status
 *   POST /ws/im/disconnect
 *   WS   /ws/im/heartbeat
 *   POST /ws/im/subscribe
 *   POST /ws/im/unsubscribe
 *   GET  /ws/im/subscriptions
 *   POST /ws/im/send
 *   POST /ws/im/broadcast
 *   GET  /ws/im/buffered-messages
 *   POST /ws/im/ack
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type ConnectionStatus =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closing' | 'error';

export type MessageType =
  | 'chat_message'
  | 'notification'
  | 'typing'
  | 'read_receipt'
  | 'call_signal'
  | 'presence'
  | 'system';

export type AckStatus = 'pending' | 'acknowledged' | 'failed' | 'expired';

export interface WebSocketConfig {
  base_url: string;
  path: string;
  token?: string;
  reconnect_enabled: boolean;
  reconnect_interval_ms: number;
  max_reconnect_attempts: number;
  heartbeat_interval_ms: number;
  heartbeat_timeout_ms: number;
  message_queue_size: number;
  ack_timeout_ms: number;
  auto_reconnect_on_back_online: boolean;
}

export interface ConnectionState {
  status: ConnectionStatus;
  connected_at?: string;
  last_ping_at?: string;
  last_pong_at?: string;
  reconnect_attempts: number;
  next_reconnect_at?: string;
  latency_ms?: number;
  message_queue_length: number;
  pending_acks: number;
  active_subscriptions: number;
}

export interface SubscribeRequest {
  channel_id: string;
  channel_type: 'chat' | 'call' | 'presence' | 'notification' | 'system';
  filter?: Record<string, unknown>;
  receive_history?: boolean;
}

export interface UnsubscribeRequest {
  channel_id: string;
  reason?: string;
}

export interface Subscription {
  id: string;
  channel_id: string;
  channel_type: SubscribeRequest['channel_type'];
  subscribed_at: string;
  filter?: Record<string, unknown>;
  is_active: boolean;
  unread_count: number;
  last_message_at?: string;
}

export interface WsMessage {
  id: string;
  type: MessageType;
  channel_id?: string;
  sender_id?: string;
  content: Record<string, unknown>;
  timestamp: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requires_ack?: boolean;
}

export interface BufferedMessage {
  id: string;
  message: WsMessage;
  queued_at: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
}

export interface AckRecord {
  message_id: string;
  status: AckStatus;
  ack_at?: string;
  timeout_at?: string;
  retry_count: number;
}

export interface HeartbeatResult {
  success: boolean;
  latency_ms: number;
  server_time: string;
  round_trip_ms: number;
}

export const imWebSocketApi = {
  // ==================== 连接管理 ====================

  getConnectionConfig: async (): Promise<ApiResponse<WebSocketConfig>> => {
    return apiClient.im.get('/ws/im/config');
  },

  updateConnectionConfig: async (
    data: Partial<WebSocketConfig>
  ): Promise<ApiResponse<WebSocketConfig>> => {
    return apiClient.im.put('/ws/im/config', data);
  },

  getConnectionState: async (): Promise<ApiResponse<ConnectionState>> => {
    return apiClient.im.get('/ws/im/status');
  },

  connect: async (data: {
    token?: string;
    device_id?: string;
  }): Promise<ApiResponse<ConnectionState>> => {
    return apiClient.im.post('/ws/im/connect', data);
  },

  disconnect: async (data?: {
    reason?: string;
    close_code?: number;
  }): Promise<ApiResponse<{ disconnected: boolean; session_id: string }>> => {
    return apiClient.im.post('/ws/im/disconnect', data || {});
  },

  reconnect: async (): Promise<ApiResponse<ConnectionState>> => {
    return apiClient.im.post('/ws/im/reconnect');
  },

  // ==================== 心跳机制 ====================

  sendHeartbeat: async (): Promise<ApiResponse<HeartbeatResult>> => {
    return apiClient.im.post('/ws/im/heartbeat');
  },

  startHeartbeat: async (data: {
    interval_ms?: number;
    timeout_ms?: number;
  }): Promise<ApiResponse<{ started: boolean }>> => {
    return apiClient.im.post('/ws/im/heartbeat/start', data);
  },

  stopHeartbeat: async (): Promise<ApiResponse<{ stopped: boolean }>> => {
    return apiClient.im.post('/ws/im/heartbeat/stop');
  },

  getHeartbeatStatus: async (): Promise<
    ApiResponse<{
      is_active: boolean;
      interval_ms: number;
      last_heartbeat_at?: string;
      avg_latency_ms: number;
    }>
  > => {
    return apiClient.im.get('/ws/im/heartbeat/status');
  },

  // ==================== 订阅管理 ====================

  subscribe: async (data: SubscribeRequest): Promise<ApiResponse<Subscription>> => {
    return apiClient.im.post('/ws/im/subscribe', data);
  },

  unsubscribe: async (
    data: UnsubscribeRequest
  ): Promise<ApiResponse<{ unsubscribed: boolean }>> => {
    return apiClient.im.post('/ws/im/unsubscribe', data);
  },

  listSubscriptions: async (params?: {
    channel_type?: Subscription['channel_type'];
    is_active?: boolean;
  }): Promise<ApiResponse<Subscription[]>> => {
    return apiClient.im.get('/ws/im/subscriptions', { params });
  },

  getSubscription: async (channelId: string): Promise<ApiResponse<Subscription>> => {
    return apiClient.im.get(`/ws/im/subscriptions/${channelId}`);
  },

  updateSubscriptionFilter: async (
    channelId: string,
    filter: Record<string, unknown>
  ): Promise<ApiResponse<Subscription>> => {
    return apiClient.im.put(`/ws/im/subscriptions/${channelId}/filter`, { filter });
  },

  // ==================== 消息发送 ====================

  sendMessage: async (data: {
    channel_id: string;
    message_type: MessageType;
    content: Record<string, unknown>;
    priority?: WsMessage['priority'];
    requires_ack?: boolean;
  }): Promise<ApiResponse<WsMessage>> => {
    return apiClient.im.post('/ws/im/send', data);
  },

  broadcastMessage: async (data: {
    channel_type: SubscribeRequest['channel_type'];
    content: Record<string, unknown>;
    exclude_channels?: string[];
    priority?: WsMessage['priority'];
  }): Promise<ApiResponse<{ sent: number; message_ids: string[] }>> => {
    return apiClient.im.post('/ws/im/broadcast', data);
  },

  sendBufferedMessage: async (data: {
    message_id: string;
  }): Promise<ApiResponse<BufferedMessage>> => {
    return apiClient.im.post('/ws/im/buffered/send', data);
  },

  flushMessageQueue: async (): Promise<ApiResponse<{ flushed: number }>> => {
    return apiClient.im.post('/ws/im/queue/flush');
  },

  // ==================== 消息队列 ====================

  getBufferedMessages: async (params?: {
    status?: BufferedMessage['status'];
    channel_id?: string;
  }): Promise<ApiResponse<BufferedMessage[]>> => {
    return apiClient.im.get('/ws/im/buffered-messages', { params });
  },

  clearMessageQueue: async (data?: {
    status?: BufferedMessage['status'];
  }): Promise<ApiResponse<{ cleared: number }>> => {
    return apiClient.im.post('/ws/im/queue/clear', data || {});
  },

  // ==================== 消息确认 (ACK) ====================

  acknowledgeMessage: async (data: {
    message_ids: string[];
  }): Promise<ApiResponse<AckRecord[]>> => {
    return apiClient.im.post('/ws/im/ack', data);
  },

  getAckStatus: async (messageId: string): Promise<ApiResponse<AckRecord>> => {
    return apiClient.im.get(`/ws/im/ack/${messageId}`);
  },

  getPendingAcks: async (): Promise<ApiResponse<AckRecord[]>> => {
    return apiClient.im.get('/ws/im/ack/pending');
  },

  retryFailedAcks: async (): Promise<ApiResponse<{ retried: number }>> => {
    return apiClient.im.post('/ws/im/ack/retry');
  },

  // ==================== 连接诊断 ====================

  runDiagnostics: async (): Promise<
    ApiResponse<{
      connection_ok: boolean;
      latency_ms: number;
      packet_loss_rate: number;
      jitter_ms: number;
      server_time: string;
      client_time: string;
      time_delta_ms: number;
    }>
  > => {
    return apiClient.im.post('/ws/im/diagnostics');
  },

  getConnectionHistory: async (params?: {
    limit?: number;
  }): Promise<
    ApiResponse<
      Array<{
        connected_at: string;
        disconnected_at?: string;
        duration_ms?: number;
        disconnect_reason?: string;
        reconnect_attempts: number;
      }>
    >
  > => {
    return apiClient.im.get('/ws/im/history', { params });
  },
};

export default imWebSocketApi;
