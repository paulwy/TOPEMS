import { apiClient } from '../client';

export const notificationApi = {
  list: async (projectId: string) => {
    return apiClient.pm.get(`/projects/${projectId}/notifications`);
  },

  create: async (data: {
    project_id: string;
    user_id?: string;
    notification_type: string;
    title: string;
    message: string;
    priority?: string;
    metadata?: Record<string, unknown>;
    due_date?: string;
  }) => {
    return apiClient.pm.post(`/projects/${data.project_id}/notifications`, data);
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
