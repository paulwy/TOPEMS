/**
 * IM · 应用内通知 API 绑定
 *
 * 后端: IM 服务 /notifications/*
 * 路由:
 *   GET    /notifications
 *   GET    /notifications/{id}
 *   POST   /notifications
 *   PUT    /notifications/{id}/mark-read
 *   POST   /notifications/mark-all-read
 *   DELETE /notifications/{id}
 *   DELETE /notifications/bulk-delete
 *   GET    /notifications/unread-count
 *   GET    /notifications/preferences
 *   PUT    /notifications/preferences
 *   POST   /notifications/broadcast
 *   GET    /notifications/stats
 *   GET    /notifications/settings
 *   PUT    /notifications/settings
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type NotificationType =
  'message' | 'mention' | 'reaction' | 'call' | 'channel' | 'bot' | 'system' | 'friend' | 'invite';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'archived' | 'deleted';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  sender_id?: string;
  sender_name?: string;
  sender_avatar?: string;
  chat_id?: string;
  channel_id?: string;
  message_id?: string;
  action_url?: string;
  action_type?: 'open_chat' | 'open_channel' | 'open_profile' | 'open_call' | 'open_link';
  metadata?: Record<string, unknown>;
  created_at: string;
  read_at?: string;
  expires_at?: string;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  content: string;
  priority?: NotificationPriority;
  receiver_ids: string[];
  chat_id?: string;
  channel_id?: string;
  message_id?: string;
  action_url?: string;
  metadata?: Record<string, unknown>;
  expires_at?: string;
}

export interface NotificationPreferences {
  user_id: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  preview_enabled: boolean;
  show_sender: boolean;
  show_content: boolean;
  group_summarize: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  categories: Record<NotificationType, boolean>;
  priority_threshold: NotificationPriority;
  updated_at: string;
}

export interface NotificationSettings {
  push_enabled: boolean;
  in_app_enabled: boolean;
  badge_enabled: boolean;
  banner_enabled: boolean;
  sound_enabled: boolean;
  sound_file?: string;
  led_enabled: boolean;
  vibration_enabled: boolean;
  notification_sound_url?: string;
  dnd_enabled: boolean;
  dnd_start?: string;
  dnd_end?: string;
  screen_lock_visibility: 'show' | 'hide' | 'content-only';
  high_priority_enabled: boolean;
  floating_notifications_enabled: boolean;
  floating_duration_ms: number;
  group_by_conversation: boolean;
  compact_mode: boolean;
  max_notifications_per_conversation: number;
}

export interface NotificationStats {
  total_received_7d: number;
  total_opened_7d: number;
  total_dismissed_7d: number;
  avg_response_time_ms: number;
  by_type: Array<{ type: NotificationType; count: number; opened: number }>;
  by_priority: Array<{ priority: NotificationPriority; count: number }>;
  hourly_distribution: Array<{ hour: number; count: number }>;
  top_senders: Array<{ user_id: string; name: string; count: number }>;
}

export const imNotificationApi = {
  // ==================== 通知 CRUD ====================

  listNotifications: async (params?: {
    type?: NotificationType;
    status?: NotificationStatus;
    priority?: NotificationPriority;
    is_read?: boolean;
    from_time?: string;
    to_time?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<InAppNotification>>> => {
    return apiClient.im.get('/notifications', { params });
  },

  getNotification: async (id: string): Promise<ApiResponse<InAppNotification>> => {
    return apiClient.im.get(`/notifications/${id}`);
  },

  createNotification: async (
    data: CreateNotificationRequest
  ): Promise<ApiResponse<InAppNotification>> => {
    return apiClient.im.post('/notifications', data);
  },

  deleteNotification: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/notifications/${id}`);
  },

  // ==================== 通知状态 ====================

  markNotificationRead: async (id: string): Promise<ApiResponse<InAppNotification>> => {
    return apiClient.im.put(`/notifications/${id}/mark-read`);
  },

  markAllRead: async (data?: {
    type?: NotificationType;
    chat_id?: string;
  }): Promise<ApiResponse<{ marked: number }>> => {
    return apiClient.im.post('/notifications/mark-all-read', data || {});
  },

  bulkMarkRead: async (ids: string[]): Promise<ApiResponse<{ marked: number }>> => {
    return apiClient.im.post('/notifications/bulk-read', { ids });
  },

  bulkDelete: async (ids: string[]): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.im.post('/notifications/bulk-delete', { ids });
  },

  getUnreadCount: async (params?: {
    type?: NotificationType;
    chat_id?: string;
  }): Promise<
    ApiResponse<{ total: number; by_type: Record<string, number>; by_chat: Record<string, number> }>
  > => {
    return apiClient.im.get('/notifications/unread-count', { params });
  },

  // ==================== 通知偏好 ====================

  getNotificationPreferences: async (): Promise<ApiResponse<NotificationPreferences>> => {
    return apiClient.im.get('/notifications/preferences');
  },

  updateNotificationPreferences: async (
    data: Partial<NotificationPreferences>
  ): Promise<ApiResponse<NotificationPreferences>> => {
    return apiClient.im.put('/notifications/preferences', data);
  },

  // ==================== 通知设置 ====================

  getNotificationSettings: async (): Promise<ApiResponse<NotificationSettings>> => {
    return apiClient.im.get('/notifications/settings');
  },

  updateNotificationSettings: async (
    data: Partial<NotificationSettings>
  ): Promise<ApiResponse<NotificationSettings>> => {
    return apiClient.im.put('/notifications/settings', data);
  },

  // ==================== 广播 ====================

  broadcastNotification: async (data: {
    type: NotificationType;
    title: string;
    content: string;
    priority?: NotificationPriority;
    target_type: 'all' | 'channel' | 'group' | 'role';
    target_ids?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<{ sent: number; failed: number }>> => {
    return apiClient.im.post('/notifications/broadcast', data);
  },

  // ==================== 统计 ====================

  getNotificationStats: async (): Promise<ApiResponse<NotificationStats>> => {
    return apiClient.im.get('/notifications/stats');
  },
};

export default imNotificationApi;
