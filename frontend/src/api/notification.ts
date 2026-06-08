import apiClient from './client';
import type { ApiResponse } from './client';

export type NotificationTypeEnum = 'info' | 'success' | 'warning' | 'error' | 'system' | 'workflow' | 'reminder' | 'alert' | 'message';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationTypeEnum;
  title: string;
  content: string;
  data?: any;
  is_read: boolean;
  priority: number;
  link_url?: string;
  created_at: string;
  read_at?: string;
}

export interface ArchivedNotification extends Notification {
  archived_at: string;
}

export interface ArchiveConfig {
  enabled: boolean;
  retention_days: number;
  auto_archive_enabled: boolean;
  auto_archive_interval_days: number;
  auto_archive_days: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<NotificationTypeEnum, number>;
  by_priority: Record<number, number>;
  total_notifications: number;
  notifications_by_type: Record<NotificationTypeEnum, number>;
  notifications_by_day: Record<string, number>;
  unread_notifications: number;
  read_notifications: number;
  archived_notifications: number;
  generated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  notification_type: NotificationTypeEnum;
  status: TemplateStatusEnum;
  variables?: string[];
  data_schema?: any;
  default_priority?: number;
  created_at: string;
  updated_at: string;
}

export type TemplateStatusEnum = 'active' | 'inactive' | 'draft' | 'deprecated';

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  title_template: string;
  content_template: string;
  notification_type: NotificationTypeEnum;
  status?: TemplateStatusEnum;
  variables?: string[];
  data_schema?: any;
  default_priority?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface NotificationListQuery {
  page?: number;
  page_size?: number;
  notification_type?: NotificationTypeEnum;
}

export interface NotificationListResponse<T = Notification> {
  notifications: T[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  notification_type?: NotificationTypeEnum;
  data?: any;
  priority?: number;
  link_url?: string;
}

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
  try {
    const response = await apiClient.notification.get<number>('/api/v1/notifications/unread-count');
    return response;
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED' || error.code === 'ECONNABORTED' || error.name === 'AbortError') {
      console.debug('Notification count request was canceled or aborted');
      return {
        code: 0,
        success: true,
        data: 0,
        message: 'Request canceled',
        timestamp: new Date().toISOString(),
      };
    }
    console.error('Failed to fetch unread count:', error);
    throw error;
  }
};

export const markAsRead = async (id: string): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.put<Notification>(`/api/v1/notifications/${id}`);
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

export const getArchivedNotifications = async (
  page = 1,
  pageSize = 20
): Promise<ApiResponse<NotificationListResponse<ArchivedNotification>>> => {
  const params = {
    page,
    page_size: pageSize,
  };
  const response = await apiClient.notification.get<NotificationListResponse<ArchivedNotification>>('/api/v1/notifications/archived', { params });
  return response;
};

export const getArchiveConfig = async (): Promise<ApiResponse<ArchiveConfig>> => {
  const response = await apiClient.notification.get<ArchiveConfig>('/api/v1/notifications/archive/config');
  return response;
};

export const updateArchiveConfig = async (config: ArchiveConfig): Promise<ApiResponse<ArchiveConfig>> => {
  const response = await apiClient.notification.put<ArchiveConfig>('/api/v1/notifications/archive/config', config);
  return response;
};

export interface AutoArchiveResponse {
  archived_count: number;
}

export const runAutoArchive = async (): Promise<ApiResponse<AutoArchiveResponse>> => {
  const response = await apiClient.notification.post<AutoArchiveResponse>('/api/v1/notifications/archive/run');
  return response;
};

export const getMyNotificationStats = async (): Promise<ApiResponse<NotificationStats>> => {
  const response = await apiClient.notification.get<NotificationStats>('/api/v1/notifications/stats');
  return response;
};

export interface NotificationTemplateListResponse {
  templates: NotificationTemplate[];
  total: number;
  page: number;
  page_size: number;
}

export const getTemplates = async (
  page = 1,
  pageSize = 20,
  status?: TemplateStatusEnum
): Promise<ApiResponse<NotificationTemplateListResponse>> => {
  const params: Record<string, any> = {
    page,
    page_size: pageSize,
  };
  if (status) {
    params.status = status;
  }
  const response = await apiClient.notification.get<NotificationTemplateListResponse>('/api/v1/notification-templates', { params });
  return response;
};

export const getTemplate = async (id: string): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.get<NotificationTemplate>(`/api/v1/notification-templates/${id}`);
  return response;
};

export const createTemplate = async (template: CreateTemplateRequest): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.post<NotificationTemplate>('/api/v1/notification-templates', template);
  return response;
};

export const updateTemplate = async (id: string, template: UpdateTemplateRequest): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.put<NotificationTemplate>(`/api/v1/notification-templates/${id}`, template);
  return response;
};

export const deleteTemplate = async (id: string): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.notification.delete<boolean>(`/api/v1/notification-templates/${id}`);
  return response;
};

export const renderTemplate = async (id: string, data: Record<string, any>): Promise<ApiResponse<{ title: string; content: string }>> => {
  const response = await apiClient.notification.post<{ title: string; content: string }>(`/api/v1/notification-templates/${id}/render`, data);
  return response;
};

export const bulkMarkAsRead = async (ids: string[]): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.put<number>('/api/v1/notifications/bulk-read', { ids });
  return response;
};

export const bulkDeleteNotifications = async (ids: string[]): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.delete<number>('/api/v1/notifications/bulk', { data: { ids } });
  return response;
};

export interface HealthResponse {
  status: string;
  uptime: string;
  dependencies: {
    database: string;
    redis: string;
  };
}

export const notificationServiceApi = {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  health: async (): Promise<ApiResponse<HealthResponse>> => {
    const response = await apiClient.notification.get<HealthResponse>('/api/v1/notifications/health');
    return response;
  },
};
