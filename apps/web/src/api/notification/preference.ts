/**
 * Notification · 用户偏好设置 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/preferences
 *   PUT    /notification/preferences
 *   GET    /notification/preferences/categories
 *   PUT    /notification/preferences/categories/{category}
 *   POST   /notification/preferences/global-mute
 *   DELETE /notification/preferences/global-mute
 *   GET    /notification/preferences/quiet-hours
 *   PUT    /notification/preferences/quiet-hours
 *   POST   /notification/preferences/reset
 *   GET    /notification/preferences/defaults
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type NotificationCategory =
  | 'system'
  | 'workflow'
  | 'reminder'
  | 'alert'
  | 'message'
  | 'task'
  | 'approval'
  | 'comment'
  | 'mention'
  | 'announcement';

export type DeliveryChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';

export interface CategoryPreference {
  category: NotificationCategory;
  enabled: boolean;
  channels: DeliveryChannel[];
  min_priority?: number;
}

export interface QuietHours {
  enabled: boolean;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  bypass_priority?: number;
}

export interface GlobalMute {
  enabled: boolean;
  muted_until?: string;
  reason?: string;
}

export interface UserPreferences {
  user_id: string;
  categories: CategoryPreference[];
  quiet_hours: QuietHours;
  global_mute: GlobalMute;
  default_channels: DeliveryChannel[];
  language: string;
  timezone: string;
  updated_at: string;
}

export interface UpdatePreferenceRequest {
  categories?: CategoryPreference[];
  quiet_hours?: QuietHours;
  default_channels?: DeliveryChannel[];
  language?: string;
  timezone?: string;
}

export interface CategoryPreferenceResponse {
  categories: CategoryPreference[];
}

export const preferenceApi = {
  getMyPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.notification.get('/notification/preferences');
  },

  updateMyPreferences: async (
    data: UpdatePreferenceRequest
  ): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.notification.put('/notification/preferences', data);
  },

  getCategoryPreferences: async (): Promise<ApiResponse<CategoryPreferenceResponse>> => {
    return apiClient.notification.get('/notification/preferences/categories');
  },

  updateCategoryPreference: async (
    category: NotificationCategory,
    data: Partial<CategoryPreference>
  ): Promise<ApiResponse<CategoryPreference>> => {
    return apiClient.notification.put(`/notification/preferences/categories/${category}`, data);
  },

  enableCategory: async (
    category: NotificationCategory
  ): Promise<ApiResponse<CategoryPreference>> => {
    return apiClient.notification.put(`/notification/preferences/categories/${category}`, {
      enabled: true,
    });
  },

  disableCategory: async (
    category: NotificationCategory
  ): Promise<ApiResponse<CategoryPreference>> => {
    return apiClient.notification.put(`/notification/preferences/categories/${category}`, {
      enabled: false,
    });
  },

  setCategoryChannels: async (
    category: NotificationCategory,
    channels: DeliveryChannel[]
  ): Promise<ApiResponse<CategoryPreference>> => {
    return apiClient.notification.put(`/notification/preferences/categories/${category}`, {
      channels,
    });
  },

  setGlobalMute: async (
    muted_until?: string,
    reason?: string
  ): Promise<ApiResponse<GlobalMute>> => {
    return apiClient.notification.post('/notification/preferences/global-mute', {
      muted_until,
      reason,
    });
  },

  cancelGlobalMute: async (): Promise<ApiResponse<GlobalMute>> => {
    return apiClient.notification.delete('/notification/preferences/global-mute');
  },

  getQuietHours: async (): Promise<ApiResponse<QuietHours>> => {
    return apiClient.notification.get('/notification/preferences/quiet-hours');
  },

  updateQuietHours: async (data: QuietHours): Promise<ApiResponse<QuietHours>> => {
    return apiClient.notification.put('/notification/preferences/quiet-hours', data);
  },

  resetPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.notification.post('/notification/preferences/reset');
  },

  getDefaultPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.notification.get('/notification/preferences/defaults');
  },

  setDefaultChannels: async (
    channels: DeliveryChannel[]
  ): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.notification.put('/notification/preferences', {
      default_channels: channels,
    });
  },
};

export default preferenceApi;
