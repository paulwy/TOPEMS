import { apiClient } from '../client';
import type { Notification, NotificationSetting, NotificationType } from './types';

export const notificationApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/notifications`);
  },

  get: async (id: string) => {
    return apiClient.pm.get(`/notifications/${id}`);
  },

  create: async (data: {
    project_id: string;
    user_id?: string;
    notification_type: string;
    title: string;
    message: string;
    priority?: string;
    metadata?: Record<string, any>;
    due_date?: string;
  }) => {
    return apiClient.pm.post('/notifications', data);
  },

  update: async (
    id: string,
    data: {
      status?: string;
      read_at?: string;
    }
  ) => {
    return apiClient.pm.put(`/notifications/${id}`, data);
  },

  markAsRead: async (id: string) => {
    return apiClient.pm.post(`/notifications/${id}/read`);
  },
};

export const notificationSettingApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/notification-settings`);
  },

  create: async (
    projectId: string,
    data: {
      notification_type: string;
      enabled: boolean;
      notify_before_days?: number;
      preferred_channel?: string;
    }
  ) => {
    return apiClient.pm.post(`/projects/${projectId}/notification-settings`, data);
  },

  update: async (
    id: string,
    data: {
      enabled?: boolean;
      notify_before_days?: number;
      preferred_channel?: string;
    }
  ) => {
    return apiClient.pm.put(`/notification-settings/${id}`, data);
  },
};

export const notificationTypeApi = {
  list: async () => {
    return apiClient.pm.get('/notification-types');
  },
};

export default notificationApi;
