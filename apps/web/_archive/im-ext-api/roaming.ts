/**
 * IM · 消息漫游与多端同步 API 绑定
 *
 * 后端: IM 服务 /messages/* /sync/* /roaming/*
 * 路由:
 *   GET    /messages/sync
 *   GET    /messages/sync/{device_id}
 *   POST   /messages/sync/ack
 *   GET    /messages/{id}/deliveries
 *   GET    /messages/history
 *   GET    /messages/search
 *   POST   /messages/{id}/forward
 *   POST   /messages/batch-forward
 *   GET    /conversations
 *   GET    /conversations/{id}
 *   PUT    /conversations/{id}
 *   DELETE /conversations/{id}
 *   GET    /conversations/{id}/unread-count
 *   POST   /conversations/{id}/mark-all-read
 *   GET    /devices
 *   POST   /devices/register
 *   DELETE /devices/{id}
 *   PUT    /devices/{id}/sync-settings
 *   GET    /devices/sync-status
 *   POST   /roaming/pull
 *   POST   /roaming/push
 *   GET    /roaming/changelog
 *   POST   /roaming/conflict-resolve
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type SyncDirection = 'pull' | 'push' | 'bidirectional';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'failed';

export type DeviceType = 'mobile' | 'desktop' | 'web' | 'tablet' | 'server';

export interface SyncDevice {
  id: string;
  user_id: string;
  device_type: DeviceType;
  device_name: string;
  device_id: string;
  push_token?: string;
  last_sync_at?: string;
  last_active_at?: string;
  is_online: boolean;
  app_version?: string;
  os_version?: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterDeviceRequest {
  device_type: DeviceType;
  device_name: string;
  device_id: string;
  push_token?: string;
  app_version?: string;
  os_version?: string;
  sync_settings?: {
    auto_sync: boolean;
    sync_on_wifi_only: boolean;
    sync_interval_minutes: number;
    media_sync: boolean;
  };
}

export interface SyncResult {
  direction: SyncDirection;
  synced_at: string;
  messages_added: number;
  messages_updated: number;
  messages_deleted: number;
  conversations_updated: number;
  conflicts: ConflictRecord[];
  last_message_id?: string;
  has_more: boolean;
  next_cursor?: string;
}

export interface ConflictRecord {
  id: string;
  entity_type: 'message' | 'conversation' | 'settings';
  entity_id: string;
  conflict_type: 'version_mismatch' | 'deleted_conflict' | 'edit_conflict';
  local_version: number;
  remote_version: number;
  local_data?: Record<string, unknown>;
  remote_data?: Record<string, unknown>;
  resolved?: boolean;
  resolution?: 'keep_local' | 'keep_remote' | 'merge' | 'manual';
}

export interface Conversation {
  id: string;
  last_message_id?: string;
  last_message_preview?: string;
  last_message_time?: string;
  unread_count: number;
  is_muted: boolean;
  is_pinned: boolean;
  is_archived: boolean;
  is_hidden: boolean;
  member_count: number;
  mentions_me: boolean;
  draft?: string;
  draft_updated_at?: string;
  marked_unread_at?: string;
  conversation_type: 'private' | 'group' | 'channel';
  conversation_name?: string;
  conversation_avatar?: string;
  conversation_info?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UpdateConversationRequest {
  is_muted?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  draft?: string;
}

export interface MessageSearchResult {
  total: number;
  items: Array<{
    id: string;
    chat_id: string;
    chat_name: string;
    sender_id: string;
    sender_name: string;
    content: string;
    highlighted_content?: string;
    message_type: string;
    created_at: string;
  }>;
  page: number;
  pagesize: number;
}

export interface ForwardMessageRequest {
  target_chat_id: string;
  message_ids: string[];
  comment?: string;
}

export const imRoamingApi = {
  // ==================== 会话管理 ====================

  listConversations: async (params?: {
    type?: Conversation['conversation_type'];
    include_archived?: boolean;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Conversation>>> => {
    return apiClient.im.get('/conversations', { params });
  },

  getConversation: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.im.get(`/conversations/${id}`);
  },

  updateConversation: async (
    id: string,
    data: UpdateConversationRequest
  ): Promise<ApiResponse<Conversation>> => {
    return apiClient.im.put(`/conversations/${id}`, data);
  },

  deleteConversation: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/conversations/${id}`);
  },

  getUnreadCount: async (
    id: string
  ): Promise<ApiResponse<{ unread: number; mentions: number }>> => {
    return apiClient.im.get(`/conversations/${id}/unread-count`);
  },

  markAllRead: async (id: string): Promise<ApiResponse<{ marked: number }>> => {
    return apiClient.im.post(`/conversations/${id}/mark-all-read`);
  },

  // ==================== 设备管理 ====================

  listDevices: async (): Promise<ApiResponse<SyncDevice[]>> => {
    return apiClient.im.get('/devices');
  },

  registerDevice: async (data: RegisterDeviceRequest): Promise<ApiResponse<SyncDevice>> => {
    return apiClient.im.post('/devices/register', data);
  },

  unregisterDevice: async (deviceId: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/devices/${deviceId}`);
  },

  updateDeviceSync: async (
    deviceId: string,
    data: Partial<RegisterDeviceRequest['sync_settings']>
  ): Promise<ApiResponse<SyncDevice>> => {
    return apiClient.im.put(`/devices/${deviceId}/sync-settings`, { sync_settings: data });
  },

  getSyncStatus: async (): Promise<
    ApiResponse<{
      last_sync_at?: string;
      pending_messages: number;
      pending_media: number;
      sync_status: SyncStatus;
    }>
  > => {
    return apiClient.im.get('/devices/sync-status');
  },

  // ==================== 消息同步 ====================

  pullMessages: async (params?: {
    since_id?: string;
    since_time?: string;
    device_id?: string;
    limit?: number;
  }): Promise<ApiResponse<SyncResult>> => {
    return apiClient.im.post('/roaming/pull', params || {});
  },

  pushMessages: async (data: {
    device_id?: string;
    messages: Array<Record<string, unknown>>;
  }): Promise<ApiResponse<SyncResult>> => {
    return apiClient.im.post('/roaming/push', data);
  },

  getSyncChangelog: async (params?: {
    device_id?: string;
    since_time?: string;
    limit?: number;
  }): Promise<
    ApiResponse<
      Array<{ id: string; type: string; entity_id: string; version: number; created_at: string }>
    >
  > => {
    return apiClient.im.get('/roaming/changelog', { params });
  },

  resolveConflict: async (data: {
    conflict_id: string;
    resolution: 'keep_local' | 'keep_remote' | 'merge';
    merged_data?: Record<string, unknown>;
  }): Promise<ApiResponse<ConflictRecord>> => {
    return apiClient.im.post('/roaming/conflict-resolve', data);
  },

  // ==================== 消息投递 ====================

  getMessageDeliveries: async (
    messageId: string
  ): Promise<
    ApiResponse<
      Array<{
        device_id: string;
        delivered_at?: string;
        read_at?: string;
        status: 'pending' | 'delivered' | 'read';
      }>
    >
  > => {
    return apiClient.im.get(`/messages/${messageId}/deliveries`);
  },

  // ==================== 消息搜索 ====================

  searchMessages: async (params: {
    q: string;
    chat_id?: string;
    from_user_id?: string;
    date_from?: string;
    date_to?: string;
    message_type?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<MessageSearchResult>> => {
    return apiClient.im.get('/messages/search', { params });
  },

  listMessageHistory: async (params?: {
    chat_id?: string;
    from_user_id?: string;
    start_time?: string;
    end_time?: string;
    message_type?: string;
    include_deleted?: boolean;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Record<string, unknown>>>> => {
    return apiClient.im.get('/messages/history', { params });
  },

  // ==================== 消息转发 ====================

  forwardMessage: async (
    data: ForwardMessageRequest
  ): Promise<ApiResponse<{ forwarded: number; message_ids: string[] }>> => {
    return apiClient.im.post(`/messages/${data.message_ids[0]}/forward`, data);
  },

  batchForward: async (data: {
    target_chat_id: string;
    message_ids: string[];
    comment?: string;
  }): Promise<ApiResponse<{ forwarded: number }>> => {
    return apiClient.im.post('/messages/batch-forward', data);
  },

  // ==================== 消息状态 ====================

  batchMarkRead: async (data: {
    chat_id: string;
    message_ids: string[];
  }): Promise<ApiResponse<{ marked: number }>> => {
    return apiClient.im.post('/messages/batch-read', data);
  },

  batchDelete: async (data: {
    chat_id: string;
    message_ids: string[];
    for_all?: boolean;
  }): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.im.post('/messages/batch-delete', data);
  },
};

export default imRoamingApi;
