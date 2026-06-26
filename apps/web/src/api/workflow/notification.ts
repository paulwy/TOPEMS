import apiClient from '../client';
import type { CreateNotificationRequest, ListParams } from './types';

export const notificationApi = {
  list: (userId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/notifications/${userId}`, { params });
  },

  getCount: (userId: string) => {
    return apiClient.workflow.get(`/api/flow/notifications/${userId}/count`);
  },

  markAsRead: (userId: string) => {
    return apiClient.workflow.post(`/api/flow/notifications/${userId}/read`);
  },

  create: (data: CreateNotificationRequest) => {
    return apiClient.workflow.post('/api/flow/notifications', data);
  },

  listNotifications: (userId: string, params?: ListParams) => {
    return apiClient.workflow.get(`/api/flow/notifications/${userId}`, { params });
  },
};
