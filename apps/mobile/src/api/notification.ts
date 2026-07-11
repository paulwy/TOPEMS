import { apiClient } from './client';
import type { ApiResponse, Notification } from '@/types';

export const notificationApi = {
  getNotifications: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    type?: string;
  }): Promise<ApiResponse<{ items: Notification[]; total: number }>> => {
    return apiClient.get('/notifications', { params });
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    return apiClient.get('/notifications/unread-count');
  },

  getNotificationById: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiClient.get(`/notifications/${id}`);
  },

  markAsRead: async (id: string): Promise<ApiResponse<Notification>> => {
    return apiClient.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<ApiResponse<void>> => {
    return apiClient.put('/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/notifications/${id}`);
  },

  deleteAllRead: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/notifications/read');
  },
};