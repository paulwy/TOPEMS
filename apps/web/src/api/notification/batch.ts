/**
 * Notification · 批量推送/广播 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   POST   /notify/send
 *   POST   /notify/broadcast
 *   POST   /notification/notifications
 *   POST   /notification/notifications/bulk-read
 *   DELETE /notification/notifications/bulk-delete
 *   POST   /notify/read-all
 *   POST   /notify/{id}/read
 *   POST   /notification/notifications/bulk-archive
 *   POST   /notification/notifications/bulk-unarchive
 *   POST   /notification/notifications/bulk-delete-all
 *   POST   /notification/notifications/bulk-unread
 *   POST   /notify/broadcast-with-template
 *   GET    /notification/notifications/bulk-progress/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type NotificationTypeEnum =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system'
  | 'workflow'
  | 'reminder'
  | 'alert'
  | 'message';

export interface SendNotificationRequest {
  user_id: string;
  title: string;
  content: string;
  notification_type?: NotificationTypeEnum;
  data?: Record<string, unknown>;
  priority?: number;
  send_email?: boolean;
}

export interface BroadcastNotificationRequest {
  title: string;
  content: string;
  notification_type?: NotificationTypeEnum;
  data?: Record<string, unknown>;
  priority?: number;
  target_roles?: string[];
  target_departments?: string[];
  target_user_ids?: string[];
  send_email?: boolean;
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  notification_type?: NotificationTypeEnum;
  data?: Record<string, unknown>;
  priority?: number;
  link_url?: string;
}

export interface SendResult {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  notification_type: string;
  is_read: boolean;
  priority: number;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface BatchResult {
  success_count: number;
  failed_count: number;
  failed_ids?: string[];
}

export interface BulkActionResponse {
  affected_count: number;
  failed_count?: number;
  failed_ids?: string[];
}

export interface BulkArchiveRequest {
  ids?: string[];
  older_than_days?: number;
  notification_types?: NotificationTypeEnum[];
}

export interface BulkUnarchiveRequest {
  ids: string[];
}

export interface BulkMarkReadRequest {
  ids?: string[];
  notification_types?: NotificationTypeEnum[];
  older_than_days?: number;
}

export interface BulkMarkUnreadRequest {
  ids: string[];
}

export interface BulkDeleteRequest {
  ids?: string[];
  older_than_days?: number;
  notification_types?: NotificationTypeEnum[];
  include_archived?: boolean;
}

export interface BroadcastWithTemplateRequest {
  template_id: string;
  template_data?: Record<string, unknown>;
  target_roles?: string[];
  target_departments?: string[];
  target_user_ids?: string[];
  priority?: number;
  send_email?: boolean;
}

export interface BulkProgress {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_count: number;
  processed_count: number;
  failed_count: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export const batchApi = {
  sendNotification: async (data: SendNotificationRequest): Promise<ApiResponse<SendResult>> => {
    return apiClient.notification.post('/notify/send', data);
  },

  broadcastNotification: async (
    data: BroadcastNotificationRequest
  ): Promise<ApiResponse<BatchResult>> => {
    return apiClient.notification.post('/notify/broadcast', data);
  },

  broadcastWithTemplate: async (
    data: BroadcastWithTemplateRequest
  ): Promise<ApiResponse<{ batch_id: string }>> => {
    return apiClient.notification.post('/notify/broadcast-with-template', data);
  },

  getBulkProgress: async (id: string): Promise<ApiResponse<BulkProgress>> => {
    return apiClient.notification.get(`/notifications/bulk-progress/${id}`);
  },

  createNotification: async (data: CreateNotificationRequest): Promise<ApiResponse<SendResult>> => {
    return apiClient.notification.post('/notifications', data);
  },

  bulkMarkAsRead: async (ids: string[]): Promise<ApiResponse<number>> => {
    return apiClient.notification.post('/notifications/bulk-read', { ids });
  },

  bulkMarkAsReadByCondition: async (
    data: BulkMarkReadRequest
  ): Promise<ApiResponse<BulkActionResponse>> => {
    return apiClient.notification.post('/notifications/bulk-read-by-condition', data);
  },

  bulkMarkAsUnread: async (ids: string[]): Promise<ApiResponse<BulkActionResponse>> => {
    return apiClient.notification.post('/notifications/bulk-unread', { ids });
  },

  bulkDeleteNotifications: async (ids: string[]): Promise<ApiResponse<number>> => {
    return apiClient.notification.delete('/notifications/bulk-delete', {
      data: { ids },
    });
  },

  bulkDeleteByCondition: async (
    data: BulkDeleteRequest
  ): Promise<ApiResponse<BulkActionResponse>> => {
    return apiClient.notification.post('/notifications/bulk-delete-by-condition', data);
  },

  bulkArchive: async (data: BulkArchiveRequest): Promise<ApiResponse<BulkActionResponse>> => {
    return apiClient.notification.post('/notifications/bulk-archive', data);
  },

  bulkUnarchive: async (data: BulkUnarchiveRequest): Promise<ApiResponse<BulkActionResponse>> => {
    return apiClient.notification.post('/notifications/bulk-unarchive', data);
  },

  bulkDeleteAll: async (): Promise<ApiResponse<BulkActionResponse>> => {
    return apiClient.notification.post('/notifications/bulk-delete-all');
  },

  markAllAsRead: async (): Promise<ApiResponse<number>> => {
    return apiClient.notification.post('/notify/read-all');
  },

  markAsRead: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.post(`/notify/${id}/read`);
  },
};

export default batchApi;
