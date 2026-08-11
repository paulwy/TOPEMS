/**
 * Notification · 推送配置 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/push-config
 *   PUT    /notification/push-config
 *   GET    /notification/push-config/channels
 *   POST   /notification/push-config/channels
 *   PUT    /notification/push-config/channels/{id}
 *   DELETE /notification/push-config/channels/{id}
 *   GET    /notification/push-config/preferences
 *   PUT    /notification/push-config/preferences
 *   POST   /notification/push-config/test
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type PushChannelType = 'web' | 'mobile' | 'email' | 'sms' | 'wechat';
export type PushStatus = 'enabled' | 'disabled';

export interface PushConfig {
  id: string;
  user_id: string;
  web_push_enabled: boolean;
  mobile_push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  wechat_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePushConfigRequest {
  web_push_enabled?: boolean;
  mobile_push_enabled?: boolean;
  email_enabled?: boolean;
  sms_enabled?: boolean;
  wechat_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

export interface UpdatePushConfigRequest extends Partial<CreatePushConfigRequest> {}

export interface PushChannel {
  id: string;
  user_id: string;
  channel_type: PushChannelType;
  name: string;
  config: Record<string, unknown>;
  status: PushStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatePushChannelRequest {
  channel_type: PushChannelType;
  name: string;
  config: Record<string, unknown>;
  status?: PushStatus;
}

export interface UpdatePushChannelRequest {
  name?: string;
  config?: Record<string, unknown>;
  status?: PushStatus;
}

export interface PushPreference {
  id: string;
  user_id: string;
  notification_categories: Record<string, boolean>;
  priority_filter?: number;
  desktop_notification: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  led_color?: string;
  auto_dismiss?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdatePushPreferenceRequest {
  notification_categories?: Record<string, boolean>;
  priority_filter?: number;
  desktop_notification?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  led_color?: string;
  auto_dismiss?: number;
}

export interface TestPushRequest {
  channel_type: PushChannelType;
  title: string;
  content: string;
  target_user_id?: string;
}

export interface TestPushResponse {
  success: boolean;
  channel_type: PushChannelType;
  sent_at?: string;
  message?: string;
  error_detail?: string;
}

export const pushConfigApi = {
  getConfig: async (): Promise<ApiResponse<PushConfig>> => {
    return apiClient.notification.get('/push-config');
  },

  updateConfig: async (data: UpdatePushConfigRequest): Promise<ApiResponse<PushConfig>> => {
    return apiClient.notification.put('/push-config', data);
  },

  listChannels: async (): Promise<ApiResponse<{ channels: PushChannel[] }>> => {
    return apiClient.notification.get('/push-config/channels');
  },

  createChannel: async (data: CreatePushChannelRequest): Promise<ApiResponse<PushChannel>> => {
    return apiClient.notification.post('/push-config/channels', data);
  },

  updateChannel: async (
    id: string,
    data: UpdatePushChannelRequest
  ): Promise<ApiResponse<PushChannel>> => {
    return apiClient.notification.put(`/push-config/channels/${id}`, data);
  },

  deleteChannel: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.delete(`/push-config/channels/${id}`);
  },

  getPreferences: async (): Promise<ApiResponse<PushPreference>> => {
    return apiClient.notification.get('/push-config/preferences');
  },

  updatePreferences: async (
    data: UpdatePushPreferenceRequest
  ): Promise<ApiResponse<PushPreference>> => {
    return apiClient.notification.put('/push-config/preferences', data);
  },

  testPush: async (data: TestPushRequest): Promise<ApiResponse<TestPushResponse>> => {
    return apiClient.notification.post('/push-config/test', data);
  },

  enableChannel: async (id: string): Promise<ApiResponse<PushChannel>> => {
    return apiClient.notification.put(`/push-config/channels/${id}/enable`, {});
  },

  disableChannel: async (id: string): Promise<ApiResponse<PushChannel>> => {
    return apiClient.notification.put(`/push-config/channels/${id}/disable`, {});
  },

  setQuietHours: async (start: string, end: string): Promise<ApiResponse<PushConfig>> => {
    return apiClient.notification.put('/push-config/quiet-hours', {
      quiet_hours_start: start,
      quiet_hours_end: end,
    });
  },

  clearQuietHours: async (): Promise<ApiResponse<PushConfig>> => {
    return apiClient.notification.delete('/push-config/quiet-hours');
  },
};

export default pushConfigApi;
