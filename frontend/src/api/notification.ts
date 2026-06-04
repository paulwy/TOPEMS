import apiClient from './client';
import type { ApiResponse } from './client';

export type NotificationTypeEnum = 'system' | 'workflow' | 'reminder' | 'alert' | 'message';

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

export const getNotifications = async (
  page = 1,
  pageSize = 20,
  notificationType?: NotificationTypeEnum
): Promise<ApiResponse<NotificationListResponse>> => {
  const params: Record<string, any> = {
    page,
    page_size: pageSize
  };
  
  if (notificationType) {
    params.notification_type = notificationType;
  }
  
  const response = await apiClient.notification.get<NotificationListResponse>(
    '/api/v1/notifications',
    { params }
  );
  
  return response;
};

export const getUnreadNotifications = async (): Promise<ApiResponse<Notification[]>> => {
  const response = await apiClient.notification.get<Notification[]>(
    '/api/v1/notifications/unread'
  );
  
  return response;
};

export const getUnreadCount = async (): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.get<number>(
    '/api/v1/notifications/unread-count'
  );
  
  return response;
};

export const markAsRead = async (id: string): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.put<Notification>(
    `/api/v1/notifications/${id}/read`
  );
};

export const markAllAsRead = async (): Promise<ApiResponse<number>> => {
  return await apiClient.notification.put<number>(
    '/api/v1/notifications/read-all'
  );
};

export const deleteNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  return await apiClient.notification.delete<boolean>(
    `/api/v1/notifications/${id}`
  );
};

export const createNotification = async (
  notification: CreateNotificationRequest
): Promise<ApiResponse<Notification>> => {
  return await apiClient.notification.post<Notification>(
    '/api/v1/notifications',
    notification
  );
};

export const bulkMarkAsRead = async (
  ids: string[]
): Promise<ApiResponse<number>> => {
  return await apiClient.notification.put<number>(
    '/api/v1/notifications/bulk/read',
    { ids }
  );
};

export const bulkDeleteNotifications = async (
  ids: string[]
): Promise<ApiResponse<number>> => {
  return await apiClient.notification.post<number>(
    '/api/v1/notifications/bulk/delete',
    { ids }
  );
};
