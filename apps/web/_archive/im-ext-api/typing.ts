/**
 * IM · 输入状态增强 API 绑定
 *
 * 后端: IM 服务 /typing/*
 * 路由:
 *   POST   /typing/start
 *   POST   /typing/stop
 *   GET    /typing/channels/{channel_id}
 *   GET    /typing/channels/{channel_id}/users
 *   POST   /typing/read-receipt
 *   GET    /typing/read-receipt/{message_id}
 *   POST   /typing/batch-read
 *   POST   /typing/indicator
 *   GET    /typing/settings
 *   PUT    /typing/settings
 *   GET    /typing/active-sessions
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type TypingType = 'text' | 'attachment' | 'emoji' | 'voice' | 'image' | 'file';

export interface TypingEvent {
  user_id: string;
  user_name: string;
  channel_id: string;
  typing_type: TypingType;
  started_at: string;
  last_activity_at: string;
  content_preview?: string;
}

export interface ReadReceiptDetail {
  message_id: string;
  read_by: Array<{
    user_id: string;
    user_name: string;
    read_at: string;
  }>;
  read_count: number;
  total_recipients: number;
  unread_count: number;
  delivery_status: 'delivered' | 'read' | 'failed';
}

export interface TypingSettings {
  user_id: string;
  typing_indicator_enabled: boolean;
  show_typing_others: boolean;
  show_typing_self: boolean;
  typing_timeout_seconds: number;
  show_read_receipts: boolean;
  show_delivered_receipts: boolean;
  send_read_receipts: boolean;
  show_attachment_preview: boolean;
  group_typing_indicator: boolean;
  max_typing_users_display: number;
  read_receipt_throttle_ms: number;
  updated_at: string;
}

export interface ActiveTypingSession {
  channel_id: string;
  channel_name: string;
  active_users: Array<{
    user_id: string;
    user_name: string;
    typing_type: TypingType;
    started_at: string;
  }>;
  count: number;
}

export const imTypingApi = {
  // ==================== 输入指示 ====================

  startTyping: async (data: {
    channel_id: string;
    typing_type?: TypingType;
    content_preview?: string;
  }): Promise<ApiResponse<{ started: boolean }>> => {
    return apiClient.im.post('/typing/start', data);
  },

  stopTyping: async (data: { channel_id: string }): Promise<ApiResponse<{ stopped: boolean }>> => {
    return apiClient.im.post('/typing/stop', data);
  },

  getTypingUsers: async (channelId: string): Promise<ApiResponse<TypingEvent[]>> => {
    return apiClient.im.get(`/typing/channels/${channelId}`);
  },

  getTypingUsersDetailed: async (channelId: string): Promise<ApiResponse<ActiveTypingSession>> => {
    return apiClient.im.get(`/typing/channels/${channelId}/users`);
  },

  sendTypingIndicator: async (data: {
    channel_id: string;
    typing_type?: TypingType;
    is_typing: boolean;
  }): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.im.post('/typing/indicator', data);
  },

  // ==================== 已读回执 ====================

  sendReadReceipt: async (data: {
    message_id: string;
    channel_id?: string;
  }): Promise<ApiResponse<ReadReceiptDetail>> => {
    return apiClient.im.post('/typing/read-receipt', data);
  },

  getReadReceipt: async (messageId: string): Promise<ApiResponse<ReadReceiptDetail>> => {
    return apiClient.im.get(`/typing/read-receipt/${messageId}`);
  },

  batchMarkAsRead: async (data: {
    channel_ids?: string[];
    message_ids?: string[];
    before_time?: string;
  }): Promise<ApiResponse<{ marked: number }>> => {
    return apiClient.im.post('/typing/batch-read', data);
  },

  // ==================== 设置 ====================

  getTypingSettings: async (): Promise<ApiResponse<TypingSettings>> => {
    return apiClient.im.get('/typing/settings');
  },

  updateTypingSettings: async (
    data: Partial<TypingSettings>
  ): Promise<ApiResponse<TypingSettings>> => {
    return apiClient.im.put('/typing/settings', data);
  },

  // ==================== 活跃会话 ====================

  getActiveTypingSessions: async (): Promise<ApiResponse<ActiveTypingSession[]>> => {
    return apiClient.im.get('/typing/active-sessions');
  },
};

export default imTypingApi;
