import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  createNotification as createGeneralNotification,
} from '../notification';
import type { CreateNotificationRequest, ListParams, Notification } from './types';
import type { ApiResponse } from '../client';
import type { NotificationTypeEnum } from '../notification';

interface RawNotification {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  notification_type: string;
  data?: {
    workflow_instance_id?: string;
    approval_id?: string;
  };
  is_read: boolean;
  created_at: string;
}

const adaptToWorkflowNotification = (n: RawNotification): Notification => ({
  id: n.id,
  user_id: n.user_id,
  title: n.title,
  content: n.content,
  notification_type: n.notification_type,
  workflow_instance_id: n.data?.workflow_instance_id,
  approval_id: n.data?.approval_id,
  is_read: n.is_read,
  created_at: n.created_at,
});

export const notificationApi = {
  list: async (_userId: string, params?: ListParams): Promise<ApiResponse<Notification[]>> => {
    const response = await getNotifications(params?.page, params?.pagesize);
    const adapted = (response.data?.notifications || []).map(adaptToWorkflowNotification);
    return { ...response, data: adapted };
  },

  getCount: async (_userId: string): Promise<ApiResponse<number>> => {
    return getUnreadCount();
  },

  markAsRead: async (_userId: string): Promise<ApiResponse<number>> => {
    return markAllAsRead();
  },

  create: async (data: CreateNotificationRequest): Promise<ApiResponse<Notification>> => {
    const response = await createGeneralNotification({
      title: data.title,
      content: data.content,
      notification_type: data.notification_type as NotificationTypeEnum,
      data: {
        workflow_instance_id: data.workflow_instance_id,
        approval_id: data.approval_id,
      },
    });
    return { ...response, data: adaptToWorkflowNotification(response.data as RawNotification) };
  },

  listNotifications: async (
    _userId: string,
    params?: ListParams
  ): Promise<ApiResponse<Notification[]>> => {
    const response = await getNotifications(params?.page, params?.pagesize);
    const adapted = (response.data?.notifications || []).map(adaptToWorkflowNotification);
    return { ...response, data: adapted };
  },
};
