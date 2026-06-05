import apiClient from './client';
import type { ApiResponse } from './client';

export type NotificationTypeEnum = 'system' | 'workflow' | 'reminder' | 'alert' | 'message';
export type TemplateStatusEnum = 'active' | 'inactive' | 'deprecated';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationTypeEnum;
  title: string;
  content: string;
  data?: any;
  is_read: boolean;
  priority: number;
  created_at: string;
  read_at?: string;
}

export interface NotificationListQuery {
  page?: number;
  page_size?: number;
  notification_type?: NotificationTypeEnum;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface CreateNotificationRequest {
  user_id: string;
  notification_type: NotificationTypeEnum;
  title: string;
  content: string;
  data?: any;
  priority?: number;
}

// ==================== 通知模板相关 ====================

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  notification_type: NotificationTypeEnum;
  title_template: string;
  content_template: string;
  data_schema?: any;
  default_priority: number;
  status: TemplateStatusEnum;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  notification_type: NotificationTypeEnum;
  title_template: string;
  content_template: string;
  data_schema?: any;
  default_priority?: number;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  title_template?: string;
  content_template?: string;
  data_schema?: any;
  default_priority?: number;
  status?: TemplateStatusEnum;
}

export interface RenderTemplateRequest {
  template_id: string;
  user_id: string;
  variables: any;
  priority?: number;
}

export interface TemplateListResponse {
  templates: NotificationTemplate[];
  total: number;
  page: number;
  page_size: number;
}

export const getTemplates = async (
  page = 1,
  pageSize = 20,
  status?: TemplateStatusEnum
): Promise<ApiResponse<TemplateListResponse>> => {
  const params: Record<string, any> = {
    page,
    page_size: pageSize,
  };

  if (status) {
    params.status = status;
  }

  return await apiClient.notification.get<TemplateListResponse>('/api/v1/templates', { params });
};

export const getTemplate = async (id: string): Promise<ApiResponse<NotificationTemplate>> => {
  return await apiClient.notification.get<NotificationTemplate>(`/api/v1/templates/${id}`);
};

export const createTemplate = async (
  template: CreateTemplateRequest
): Promise<ApiResponse<NotificationTemplate>> => {
  return await apiClient.notification.post<NotificationTemplate>('/api/v1/templates', template);
};

export const updateTemplate = async (
  id: string,
  template: UpdateTemplateRequest
): Promise<ApiResponse<NotificationTemplate>> => {
  return await apiClient.notification.put<NotificationTemplate>(`/api/v1/templates/${id}`, template);
};

export const deleteTemplate = async (id: string): Promise<ApiResponse<boolean>> => {
  return await apiClient.notification.delete<boolean>(`/api/v1/templates/${id}`);
};

export const renderTemplate = async (
  request: RenderTemplateRequest
): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.post<Notification>('/api/v1/templates/render', request);
};

// ==================== 归档相关 ====================

export interface ArchivedNotification {
  id: string;
  original_notification_id?: string;
  user_id: string;
  notification_type: NotificationTypeEnum;
  title: string;
  content: string;
  data?: any;
  priority: number;
  created_at: string;
  read_at?: string;
  archived_at: string;
}

export interface ArchiveConfig {
  auto_archive_days: number;
  retention_days: number;
  enabled: boolean;
}

export interface ArchivedNotificationListResponse {
  notifications: ArchivedNotification[];
  total: number;
  page: number;
  page_size: number;
}

export const getArchiveConfig = async (): Promise<ApiResponse<ArchiveConfig>> => {
  return await apiClient.notification.get<ArchiveConfig>('/api/v1/archive/config');
};

export const updateArchiveConfig = async (
  config: ArchiveConfig
): Promise<ApiResponse<ArchiveConfig>> => {
  return await apiClient.notification.put<ArchiveConfig>('/api/v1/archive/config', config);
};

export const archiveNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  return await apiClient.notification.post<boolean>(`/api/v1/notifications/${id}/archive`);
};

export const getArchivedNotifications = async (
  page = 1,
  pageSize = 20
): Promise<ApiResponse<ArchivedNotificationListResponse>> => {
  const params = { page, page_size: pageSize };
  return await apiClient.notification.get<ArchivedNotificationListResponse>('/api/v1/notifications/archived', { params });
};

export const runAutoArchive = async (): Promise<ApiResponse<any>> => {
  return await apiClient.notification.post<any>('/api/v1/archive/auto');
};

// ==================== 统计相关 ====================

export interface NotificationStats {
  total_notifications: number;
  unread_notifications: number;
  read_notifications: number;
  archived_notifications: number;
  notifications_by_type: any;
  notifications_by_day: any;
  generated_at: string;
}

export const getNotificationStats = async (): Promise<ApiResponse<NotificationStats>> => {
  return await apiClient.notification.get<NotificationStats>('/api/v1/stats');
};

export const getMyNotificationStats = async (): Promise<ApiResponse<NotificationStats>> => {
  return await apiClient.notification.get<NotificationStats>('/api/v1/stats/me');
};

// ==================== 基础通知功能 ====================

export const getNotifications = async (
  page = 1,
  pageSize = 20,
  notificationType?: NotificationTypeEnum
): Promise<ApiResponse<NotificationListResponse>> => {
  const params: Record<string, any> = {
    page,
    page_size: pageSize,
  };

  if (notificationType) {
    params.notification_type = notificationType;
  }

  const response = await apiClient.notification.get<NotificationListResponse>('/api/v1/notifications', { params });

  return response;
};

export const getUnreadNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  const response = await apiClient.notification.get<Notification[]>('/api/v1/notifications/unread');

  return response;
};

export const getUnreadCount = async (): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.get<number>('/api/v1/notifications/unread-count');

  return response;
};

export const markAsRead = async (id: string): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.put<Notification>(`/api/v1/notifications/${id}/read`);
};

export const markAllAsRead = async (): Promise<ApiResponse<number>> => {
  return await apiClient.notification.put<number>('/api/v1/notifications/read-all');
};

export const deleteNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  return await apiClient.notification.delete<boolean>(`/api/v1/notifications/${id}`);
};

export const createNotification = async (
  notification: CreateNotificationRequest
): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.post<Notification>('/api/v1/notifications', notification);
};

export const bulkMarkAsRead = async (ids: string[]): Promise<ApiResponse<number>> => {
  return await apiClient.notification.put<number>('/api/v1/notifications/bulk/read', { ids });
};

export const bulkDeleteNotifications = async (ids: string[]): Promise<ApiResponse<number>> => {
  return await apiClient.notification.post<number>('/api/v1/notifications/bulk/delete', { ids });
};
