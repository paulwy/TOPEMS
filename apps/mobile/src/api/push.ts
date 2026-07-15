import { apiClient } from './client';
import type { ApiResponse } from '@/types';

export interface RegisterDeviceRequest {
  device_token: string;
  platform: 'ios' | 'android';
  device_model?: string;
  device_os?: string;
  app_version?: string;
}

export interface RegisterDeviceResponse {
  id: string;
  device_token: string;
  platform: string;
  user_id: string;
  created_at: string;
}

export interface PushTemplate {
  id: string;
  name: string;
  title_template: string;
  body_template: string;
  notification_type: string;
  description?: string;
  created_at: string;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  data?: Record<string, unknown>;
  target_type: string;
  target_ids: string[];
  status: string;
  sent_count: number;
  delivered_count: number;
  clicked_count: number;
  created_at: string;
}

export interface PushStats {
  total_sent: number;
  delivered_count: number;
  clicked_count: number;
  delivery_rate: number;
  click_rate: number;
}

export interface SendNotificationRequest {
  title: string;
  body: string;
  notification_type: string;
  data?: Record<string, unknown>;
  target_type: string;
  target_ids: string[];
  template_id?: string;
  template_params?: Record<string, unknown>;
}

export interface SendNotificationResponse {
  notification_id: string;
  status: string;
  sent_count: number;
  message: string;
}

export const pushApi = {
  registerDevice: async (
    data: RegisterDeviceRequest,
  ): Promise<ApiResponse<RegisterDeviceResponse>> => {
    return apiClient.post('/push/devices/register', data);
  },

  getDevices: async (): Promise<ApiResponse<RegisterDeviceResponse[]>> => {
    return apiClient.get('/push/devices');
  },

  sendNotification: async (
    data: SendNotificationRequest,
  ): Promise<ApiResponse<SendNotificationResponse>> => {
    return apiClient.post('/push/notifications', data);
  },

  sendBroadcast: async (
    data: SendNotificationRequest,
  ): Promise<ApiResponse<SendNotificationResponse>> => {
    return apiClient.post('/push/notifications/broadcast', data);
  },

  getNotificationList: async (params?: {
    page?: number;
    size?: number;
  }): Promise<ApiResponse<{ items: PushNotification[]; total: number }>> => {
    return apiClient.get('/push/notifications', { params });
  },

  getNotificationById: async (id: string): Promise<ApiResponse<PushNotification>> => {
    return apiClient.get(`/push/notifications/${id}`);
  },

  getStats: async (): Promise<ApiResponse<PushStats>> => {
    return apiClient.get('/push/notifications/stats');
  },

  getTemplates: async (): Promise<ApiResponse<PushTemplate[]>> => {
    return apiClient.get('/push/templates');
  },

  createTemplate: async (data: {
    name: string;
    title_template: string;
    body_template: string;
    notification_type: string;
    description?: string;
  }): Promise<ApiResponse<PushTemplate>> => {
    return apiClient.post('/push/templates', data);
  },
};
