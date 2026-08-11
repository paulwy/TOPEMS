/**
 * Notification · 摘要与定时通知 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/digests
 *   POST   /notification/digests
 *   GET    /notification/digests/{id}
 *   PUT    /notification/digests/{id}
 *   DELETE /notification/digests/{id}
 *   POST   /notification/digests/{id}/send
 *   GET    /notification/digests/{id}/history
 *   GET    /notification/scheduled
 *   POST   /notification/scheduled
 *   PUT    /notification/scheduled/{id}
 *   DELETE /notification/scheduled/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type DigestFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type DigestStatus = 'active' | 'paused' | 'draft';
export type ScheduleStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface NotificationDigest {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  frequency: DigestFrequency;
  scheduled_at: string;
  channels: string[];
  event_types: string[];
  group_ids?: string[];
  include_read: boolean;
  max_items: number;
  status: DigestStatus;
  last_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledNotification {
  id: string;
  tenant_id: string;
  title: string;
  content: string;
  notification_type: string;
  scheduled_at: string;
  recipients: string[];
  channels: string[];
  status: ScheduleStatus;
  sent_at?: string;
  error_message?: string;
  created_at: string;
}

export interface DigestHistory {
  id: string;
  digest_id: string;
  sent_at: string;
  item_count: number;
  recipient_count: number;
  status: 'sent' | 'failed';
}

export interface CreateDigestRequest {
  name: string;
  description?: string;
  frequency: DigestFrequency;
  scheduled_at: string;
  channels: string[];
  event_types: string[];
  group_ids?: string[];
  include_read?: boolean;
  max_items?: number;
}

export interface CreateScheduledRequest {
  title: string;
  content: string;
  notification_type?: string;
  scheduled_at: string;
  recipients: string[];
  channels: string[];
}

export const digestApi = {
  // ==================== 摘要管理 ====================

  listDigests: async (params?: {
    status?: DigestStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<NotificationDigest>>> => {
    return apiClient.notification.get('/notification/digests', { params });
  },

  getDigest: async (id: string): Promise<ApiResponse<NotificationDigest>> => {
    return apiClient.notification.get(`/notification/digests/${id}`);
  },

  createDigest: async (data: CreateDigestRequest): Promise<ApiResponse<NotificationDigest>> => {
    return apiClient.notification.post('/notification/digests', data);
  },

  updateDigest: async (
    id: string,
    data: Partial<CreateDigestRequest>
  ): Promise<ApiResponse<NotificationDigest>> => {
    return apiClient.notification.put(`/notification/digests/${id}`, data);
  },

  deleteDigest: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/digests/${id}`);
  },

  sendDigest: async (
    id: string
  ): Promise<ApiResponse<{ sent_count: number; item_count: number }>> => {
    return apiClient.notification.post(`/notification/digests/${id}/send`);
  },

  getDigestHistory: async (
    id: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<DigestHistory>>> => {
    return apiClient.notification.get(`/notification/digests/${id}/history`, { params });
  },

  pauseDigest: async (id: string): Promise<ApiResponse<NotificationDigest>> => {
    return apiClient.notification.put(`/notification/digests/${id}`, { status: 'paused' });
  },

  resumeDigest: async (id: string): Promise<ApiResponse<NotificationDigest>> => {
    return apiClient.notification.put(`/notification/digests/${id}`, { status: 'active' });
  },

  // ==================== 定时通知 ====================

  listScheduled: async (params?: {
    status?: ScheduleStatus;
    from?: string;
    to?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<ScheduledNotification>>> => {
    return apiClient.notification.get('/notification/scheduled', { params });
  },

  getScheduled: async (id: string): Promise<ApiResponse<ScheduledNotification>> => {
    return apiClient.notification.get(`/notification/scheduled/${id}`);
  },

  createScheduled: async (
    data: CreateScheduledRequest
  ): Promise<ApiResponse<ScheduledNotification>> => {
    return apiClient.notification.post('/notification/scheduled', data);
  },

  updateScheduled: async (
    id: string,
    data: Partial<CreateScheduledRequest>
  ): Promise<ApiResponse<ScheduledNotification>> => {
    return apiClient.notification.put(`/notification/scheduled/${id}`, data);
  },

  deleteScheduled: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/scheduled/${id}`);
  },

  sendScheduledNow: async (id: string): Promise<ApiResponse<ScheduledNotification>> => {
    return apiClient.notification.post(`/notification/scheduled/${id}/send`);
  },

  cancelScheduled: async (id: string): Promise<ApiResponse<ScheduledNotification>> => {
    return apiClient.notification.post(`/notification/scheduled/${id}/cancel`);
  },

  getMyScheduled: async (): Promise<ApiResponse<ScheduledNotification[]>> => {
    return apiClient.notification.get('/notification/my-scheduled');
  },

  // ==================== 摘要统计 ====================

  getDigestSummary: async (params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<
    ApiResponse<{
      total_sent: number;
      total_digests: number;
      by_frequency: Record<DigestFrequency, number>;
    }>
  > => {
    return apiClient.notification.get('/notification/digests/summary', { params });
  },
};

export default digestApi;
