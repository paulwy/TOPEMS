import apiClient from './client';
import type { ApiResponse } from './client';

export interface NotificationType {
  id: string;
  userId: string;
  notificationType: 'system' | 'workflow' | 'reminder' | 'alert' | 'message';
  title: string;
  content: string;
  data?: any;
  isRead: boolean;
  priority: number;
  createdAt: string;
  readAt?: string;
}

export type Notification = NotificationType;

export interface NotificationListResponse {
  notifications: NotificationType[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

export const getNotifications = async (
  page = 1,
  pageSize = 20,
  notificationType?: string
): Promise<ApiResponse<NotificationListResponse>> => {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('pageSize', pageSize.toString());
  if (notificationType) {
    params.append('notificationType', notificationType);
  }
  
  return apiClient.lims.get<NotificationListResponse>(
    `/api/v1/notifications?${params.toString()}`
  );
};

export const getUnreadNotifications = async (): Promise<ApiResponse<NotificationType[]>> => {
  return apiClient.lims.get<NotificationType[]>(
    '/api/v1/notifications/unread'
  );
};

export const getUnreadCount = async (): Promise<ApiResponse<number>> => {
  return apiClient.lims.get<number>(
    '/api/v1/notifications/unread-count'
  );
};

export const markAsRead = async (id: string): Promise<ApiResponse<NotificationType>> => {
  return apiClient.lims.put<NotificationType>(
    `/api/v1/notifications/${id}/read`
  );
};

export const markAllAsRead = async (): Promise<ApiResponse<number>> => {
  return apiClient.lims.put<number>(
    '/api/v1/notifications/read-all'
  );
};

export const deleteNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  return apiClient.lims.delete<boolean>(
    `/api/v1/notifications/${id}`
  );
};

export const createNotification = async (
  notification: Omit<NotificationType, 'id' | 'createdAt' | 'readAt' | 'isRead'>
): Promise<ApiResponse<NotificationType>> => {
  return apiClient.lims.post<NotificationType>(
    '/api/v1/notifications',
    notification
  );
};
