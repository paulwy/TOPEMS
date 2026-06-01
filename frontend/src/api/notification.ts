import apiClient from './client';
import type { ApiResponse } from './client';

export interface NotificationType {
  id: string;
  user_id: string;
  notification_type: 'system' | 'workflow' | 'reminder' | 'alert' | 'message';
  title: string;
  content: string;
  metadata?: any;
  status: 'unread' | 'read';
  action_url?: string;
  created_at: string;
  updated_at: string;
}

export type Notification = NotificationType;

export interface NotificationListData {
  items: NotificationType[];
  total: number;
}

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
  const response = await apiClient.notification.get<NotificationListData>(
    '/api/v1/notifications'
  );
  
  // 转换后端返回的数据格式为前端期望的格式
  const items = response.data?.items || [];
  const total = response.data?.total || 0;
  const unreadCount = items.filter((n: NotificationType) => n.status === 'unread').length;
  
  return {
    ...response,
    data: {
      notifications: items,
      total,
      page,
      pageSize,
      unreadCount
    }
  };
};

export const getUnreadNotifications = async (): Promise<ApiResponse<NotificationType[]>> => {
  const response = await apiClient.notification.get<NotificationListData>(
    '/api/v1/notifications'
  );
  
  const items = response.data?.items || [];
  const unreadItems = items.filter((n: NotificationType) => n.status === 'unread');
  
  return {
    ...response,
    data: unreadItems
  };
};

export const getUnreadCount = async (): Promise<ApiResponse<number>> => {
  const response = await apiClient.notification.get<NotificationListData>(
    '/api/v1/notifications'
  );
  
  const items = response.data?.items || [];
  const unreadCount = items.filter((n: NotificationType) => n.status === 'unread').length;
  
  return {
    ...response,
    data: unreadCount
  };
};

export const markAsRead = async (id: string): Promise<ApiResponse<NotificationType>> => {
  const response = await apiClient.notification.put<any>(
    `/api/v1/notifications/${id}/read`
  );
  
  // 转换后端返回的数据格式
  return {
    ...response,
    data: response.data
  };
};

export const markAllAsRead = async (): Promise<ApiResponse<number>> => {
  // 后端没有批量标记已读的端点，我们先获取所有未读通知，然后逐个标记
  const unreadResponse = await getUnreadNotifications();
  const unreadItems = unreadResponse.data || [];
  
  let markedCount = 0;
  for (const item of unreadItems) {
    try {
      await markAsRead(item.id);
      markedCount++;
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  }
  
  return {
    code: 200,
    success: true,
    data: markedCount,
    message: '批量标记已读成功',
    timestamp: new Date().toISOString()
  };
};

export const deleteNotification = async (id: string): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.notification.delete<string>(
    `/api/v1/notifications/${id}`
  );
  
  return {
    ...response,
    data: true
  };
};

export const createNotification = async (
  notification: Omit<NotificationType, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<ApiResponse<NotificationType>> => {
  // 转换前端数据格式为后端期望的格式
  const payload = {
    user_id: notification.user_id,
    title: notification.title,
    content: notification.content,
    notification_type: notification.notification_type,
    action_url: notification.action_url,
    metadata: notification.metadata
  };
  
  return apiClient.notification.post<NotificationType>(
    '/api/v1/notifications',
    payload
  );
};
