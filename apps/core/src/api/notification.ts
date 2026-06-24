import { createRequest } from '@topems/shared-utils';

export type NotificationType =
  | 'system'
  | 'workflow'
  | 'message'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, any>;
  read: boolean;
  priority: number;
  linkUrl?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  titleTemplate: string;
  contentTemplate: string;
  type: NotificationType;
  status: 'active' | 'inactive' | 'draft';
  variables?: string[];
  defaultPriority?: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  types: Record<NotificationType, boolean>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotificationListQuery {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  read?: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  titleTemplate: string;
  contentTemplate: string;
  type: NotificationType;
  status?: 'active' | 'inactive' | 'draft';
  variables?: string[];
  defaultPriority?: number;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  id: string;
}

const api = createRequest('/api/core/notify');

export const notificationApi = {
  listNotifications: async (
    params?: NotificationListQuery
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<number> => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (id: string): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },

  bulkMarkAsRead: async (ids: string[]): Promise<number> => {
    const response = await api.put('/notifications/bulk-read', { ids });
    return response.data;
  },

  bulkDelete: async (ids: string[]): Promise<number> => {
    const response = await api.delete('/notifications/bulk', { data: { ids } });
    return response.data;
  },

  getSettings: async (): Promise<NotificationSettings> => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> => {
    const response = await api.put('/settings', settings);
    return response.data;
  },

  listTemplates: async (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  }): Promise<PaginatedResponse<NotificationTemplate>> => {
    const response = await api.get('/templates', { params });
    return response.data;
  },

  getTemplate: async (id: string): Promise<NotificationTemplate> => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  createTemplate: async (
    template: CreateTemplateRequest
  ): Promise<NotificationTemplate> => {
    const response = await api.post('/templates', template);
    return response.data;
  },

  updateTemplate: async (
    id: string,
    template: UpdateTemplateRequest
  ): Promise<NotificationTemplate> => {
    const response = await api.put(`/templates/${id}`, template);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await api.delete(`/templates/${id}`);
  },

  renderTemplate: async (
    id: string,
    data: Record<string, any>
  ): Promise<{ title: string; content: string }> => {
    const response = await api.post(`/templates/${id}/render`, data);
    return response.data;
  },
};
