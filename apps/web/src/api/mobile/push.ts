/**
 * Mobile · 推送通知 API 绑定
 *
 * 后端: svc/mobile/src/modules/push_notification.rs
 * 路由（已注册 main.rs）:
 *   GET    /push/devices
 *   POST   /push/devices/register
 *   GET    /push/notifications
 *   POST   /push/notifications
 *   POST   /push/notifications/broadcast
 *   GET    /push/notifications/stats
 *   GET    /push/notifications/{id}
 *   GET    /push/templates
 *   POST   /push/templates
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type PushPlatform = 'ios' | 'android';
export type PushNotificationType =
  'system' | 'approval' | 'task' | 'alert' | 'message' | 'marketing';
export type TargetType = 'user' | 'role' | 'department' | 'all';

export interface MobilePushDevice {
  id: string;
  user_id: string;
  token: string;
  platform: PushPlatform;
  app_version?: string;
  is_active: boolean;
  created_at: string;
}

export interface MobilePushNotification {
  id: string;
  title: string;
  body: string;
  notification_type: PushNotificationType;
  data?: Record<string, unknown>;
  target_type: TargetType;
  target_ids: string[];
  template_id?: string;
  status: 'pending' | 'sent' | 'failed';
  sent_count?: number;
  created_at: string;
}

export interface MobilePushTemplate {
  id: string;
  name: string;
  title_template: string;
  body_template: string;
  notification_type: PushNotificationType;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MobilePushStats {
  total_sent: number;
  delivered_count: number;
  clicked_count: number;
  delivery_rate: number;
  click_rate: number;
}

export interface RegisterPushDeviceRequest {
  token: string;
  platform: PushPlatform;
  app_version?: string;
}

export interface SendPushNotificationRequest {
  title: string;
  body: string;
  notification_type: PushNotificationType;
  data?: Record<string, unknown>;
  target_type: TargetType;
  target_ids: string[];
  template_id?: string;
  template_params?: Record<string, unknown>;
}

export interface BroadcastPushRequest {
  title: string;
  body: string;
  notification_type: PushNotificationType;
  data?: Record<string, unknown>;
  template_id?: string;
  template_params?: Record<string, unknown>;
}

export interface CreatePushTemplateRequest {
  name: string;
  title_template: string;
  body_template: string;
  notification_type: PushNotificationType;
  description?: string;
}

export interface SendPushResponse {
  notification_id: string;
  status: string;
  sent_count: number;
  message: string;
}

export const pushApi = {
  listDevices: async (): Promise<ApiResponse<MobilePushDevice[]>> => {
    return apiClient.mobile.get('/push/devices');
  },

  registerDevice: async (
    data: RegisterPushDeviceRequest
  ): Promise<ApiResponse<MobilePushDevice>> => {
    return apiClient.mobile.post('/push/devices/register', data);
  },

  listPushNotifications: async (params?: {
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: MobilePushNotification[]; total: number }>> => {
    return apiClient.mobile.get('/push/notifications', { params });
  },

  sendPushNotification: async (
    data: SendPushNotificationRequest
  ): Promise<ApiResponse<SendPushResponse>> => {
    return apiClient.mobile.post('/push/notifications', data);
  },

  broadcastPush: async (data: BroadcastPushRequest): Promise<ApiResponse<SendPushResponse>> => {
    return apiClient.mobile.post('/push/notifications/broadcast', data);
  },

  getPushStats: async (): Promise<ApiResponse<MobilePushStats>> => {
    return apiClient.mobile.get('/push/notifications/stats');
  },

  getPushNotification: async (id: string): Promise<ApiResponse<MobilePushNotification>> => {
    return apiClient.mobile.get(`/push/notifications/${id}`);
  },

  listPushTemplates_v2: async (): Promise<ApiResponse<MobilePushTemplate[]>> => {
    return apiClient.mobile.get('/push/templates');
  },

  createPushTemplate_v2: async (
    data: CreatePushTemplateRequest
  ): Promise<ApiResponse<MobilePushTemplate>> => {
    return apiClient.mobile.post('/push/templates', data);
  },
};

export default pushApi;
