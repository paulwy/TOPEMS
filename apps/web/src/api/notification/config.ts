/**
 * Notification · 归档配置 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/notifications/archive/config
 *   PUT    /notification/notifications/archive/config
 *   POST   /notification/notifications/archive/run
 *   GET    /notification/notifications/archived
 *   POST   /notification/notifications/{id}/archive
 *   POST   /notification/notifications/{id}/unarchive
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface ArchiveConfig {
  enabled: boolean;
  retention_days: number;
  auto_archive_enabled: boolean;
  auto_archive_interval_days: number;
  auto_archive_days: number;
}

export interface ArchivedNotification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  content: string;
  is_read: boolean;
  priority: number;
  created_at: string;
  archived_at: string;
}

interface AutoArchiveResponse {
  archived_count: number;
}

interface ArchivedListResponse {
  notifications: ArchivedNotification[];
  total: number;
  page: number;
  page_size: number;
}

export const configApi = {
  getArchiveConfig: async (): Promise<ApiResponse<ArchiveConfig>> => {
    return apiClient.notification.get('/notifications/archive/config');
  },

  updateArchiveConfig: async (data: ArchiveConfig): Promise<ApiResponse<ArchiveConfig>> => {
    return apiClient.notification.put('/notifications/archive/config', data);
  },

  runAutoArchive: async (): Promise<ApiResponse<AutoArchiveResponse>> => {
    return apiClient.notification.post('/notifications/archive/run');
  },

  listArchived: async (page = 1, pageSize = 20): Promise<ApiResponse<ArchivedListResponse>> => {
    return apiClient.notification.get('/notifications/archived', {
      params: { page, page_size: pageSize },
    });
  },

  archiveNotification: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.post(`/notifications/${id}/archive`);
  },

  unarchiveNotification: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.post(`/notifications/${id}/unarchive`);
  },
};

export default configApi;
