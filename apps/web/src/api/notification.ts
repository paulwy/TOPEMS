import apiClient from './client';
import type { ApiResponse } from './client';
import { apiLogger } from '@/utils/logger';

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

export interface Notification {
  id: string;
  user_id: string;
  notification_type: NotificationTypeEnum;
  title: string;
  content: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  priority: number;
  link_url?: string;
  created_at: string;
  read_at?: string;
  // 详情页使用的额外字段
  level?: string;
  type?: string;
  source_module?: string;
  source_id?: string;
  actions?: Array<{ type?: string; label?: string; url?: string }>;
  sender_name?: string;
  recipient_name?: string;
  is_top?: boolean;
  is_deleted?: boolean;
  updated_at?: string;
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
  data_schema?: Record<string, unknown>;
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
  data_schema?: Record<string, unknown>;
  default_priority?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

export interface NotificationListQuery {
  page?: number;
  pagesize?: number;
  notification_type?: NotificationTypeEnum;
}

export interface NotificationListResponse<T = Notification> {
  notifications: T[];
  total: number;
  page: number;
  pagesize: number;
  unread_count: number;
}

export interface CreateNotificationRequest {
  title: string;
  content: string;
  notification_type?: NotificationTypeEnum;
  data?: Record<string, unknown>;
  priority?: number;
  link_url?: string;
}

export const getNotifications = async (
  page = 1,
  pageSize = 20,
  notificationType?: NotificationTypeEnum
): Promise<ApiResponse<NotificationListResponse>> => {
  try {
    const params: Record<string, any> = {
      page,
      pagesize: pageSize,
    };

    if (notificationType) {
      params.notification_type = notificationType;
    }

    const response = await apiClient.notification.get<NotificationListResponse>(
      '/v1/notifications',
      { params }
    );

    return response;
  } catch (error: unknown) {
    // 处理 401 错误
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 401) {
      apiLogger.debug('Notification list request returned 401, returning empty');
      return {
        code: 0,
        success: true,
        data: {
          notifications: [],
          total: 0,
          page,
          pagesize: pageSize,
          unread_count: 0,
        },
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      };
    }
    throw error;
  }
};

export const getUnreadNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  const response = await apiClient.notification.get<Notification[]>('/v1/notifications/unread');

  return response;
};

export const getUnreadCount = async (): Promise<ApiResponse<number>> => {
  try {
    const response = await apiClient.notification.get<number>('/v1/notifications/unread-count');
    return response;
  } catch (error: unknown) {
    const err = error as { code?: string; name?: string; response?: { status?: number } };
    if (err.code === 'ERR_CANCELED' || err.code === 'ECONNABORTED' || err.name === 'AbortError') {
      apiLogger.debug('Notification count request was canceled or aborted');
      return {
        code: 0,
        success: true,
        data: 0,
        message: 'Request canceled',
        timestamp: new Date().toISOString(),
      };
    }
    // 401 errors are handled by the API client interceptor, suppress them here
    if (err.response?.status === 401) {
      apiLogger.debug('Notification count request returned 401, skipping');
      return {
        code: 0,
        success: true,
        data: 0,
        message: 'Unauthorized',
        timestamp: new Date().toISOString(),
      };
    }
    apiLogger.error('Failed to fetch unread count:', error);
    throw error;
  }
};

export const markAsRead = async (id: string): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.put<Notification>(`/v1/notifications/${id}`);
};

export const markAllAsRead = async (): Promise<ApiResponse<number>> => {
  return await apiClient.notification.put<number>('/v1/notifications/read-all');
};

export const deleteNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  return await apiClient.notification.delete<boolean>(`/notifications/${id}`);
};

export const createNotification = async (
  notification: CreateNotificationRequest
): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.post<Notification>('/v1/notifications', notification);
};

export const getArchivedNotifications = async (
  page = 1,
  pageSize = 20
): Promise<ApiResponse<NotificationListResponse<ArchivedNotification>>> => {
  const params = {
    page,
    pagesize: pageSize,
  };
  const response = await apiClient.notification.get<NotificationListResponse<ArchivedNotification>>(
    '/notifications/archived',
    { params }
  );
  return response;
};

export const getArchiveConfig = async (): Promise<ApiResponse<ArchiveConfig>> => {
  const response = await apiClient.notification.get<ArchiveConfig>('/notifications/archive/config');
  return response;
};

export const updateArchiveConfig = async (
  config: ArchiveConfig
): Promise<ApiResponse<ArchiveConfig>> => {
  const response = await apiClient.notification.put<ArchiveConfig>(
    '/notifications/archive/config',
    config
  );
  return response;
};

export interface AutoArchiveResponse {
  archived_count: number;
}

export const runAutoArchive = async (): Promise<ApiResponse<AutoArchiveResponse>> => {
  const response = await apiClient.notification.post<AutoArchiveResponse>(
    '/notifications/archive/run'
  );
  return response;
};

export const getMyNotificationStats = async (): Promise<ApiResponse<NotificationStats>> => {
  const response = await apiClient.notification.get<NotificationStats>('/notifications/stats/me');
  return response;
};

export interface NotificationTemplateListResponse {
  templates: NotificationTemplate[];
  total: number;
  page: number;
  pagesize: number;
}

export const getTemplates = async (
  page = 1,
  pageSize = 20,
  status?: TemplateStatusEnum,
  search?: string
): Promise<ApiResponse<NotificationTemplateListResponse>> => {
  const params: Record<string, any> = {
    page,
    pagesize: pageSize,
  };
  if (status) {
    params.status = status;
  }
  if (search) {
    params.search = search;
  }
  const response = await apiClient.notification.get<NotificationTemplateListResponse>(
    '/notification-templates',
    { params }
  );
  return response;
};

export const getTemplate = async (id: string): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.get<NotificationTemplate>(
    `/notification-templates/${id}`
  );
  return response;
};

export const createTemplate = async (
  template: CreateTemplateRequest
): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.post<NotificationTemplate>(
    '/notification-templates',
    template
  );
  return response;
};

export const updateTemplate = async (
  id: string,
  template: UpdateTemplateRequest
): Promise<ApiResponse<NotificationTemplate>> => {
  const response = await apiClient.notification.put<NotificationTemplate>(
    `/notification-templates/${id}`,
    template
  );
  return response;
};

export const deleteTemplate = async (id: string): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.notification.delete<boolean>(`/notification-templates/${id}`);
  return response;
};

export const renderTemplate = async (
  id: string,
  data: Record<string, any>
): Promise<ApiResponse<{ title: string; content: string }>> => {
  const response = await apiClient.notification.post<{
    title: string;
    content: string;
  }>(`/notification-templates/${id}/render`, data);
  return response;
};

export const bulkMarkAsRead = async (ids: string[]): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.put<number>('/notifications/bulk-read', {
    ids,
  });
  return response;
};

export const bulkDeleteNotifications = async (ids: string[]): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.delete<number>('/notifications/bulk', {
    data: { ids },
  });
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
    const response = await apiClient.notification.get<HealthResponse>(
      '/notifications/health/detailed'
    );
    return response;
  },
};

export const notificationApi = {
  get: async (id: string): Promise<ApiResponse<Notification>> => {
    return await apiClient.notification.get<Notification>(`/notifications/${id}`);
  },
  markRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return await apiClient.notification.put<Notification>(`/notifications/${id}/read`);
  },
  markUnread: async (id: string): Promise<ApiResponse<Notification>> => {
    return await apiClient.notification.put<Notification>(`/notifications/${id}/unread`);
  },
};
