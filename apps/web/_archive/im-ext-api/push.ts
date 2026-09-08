/**
 * IM · 离线推送与消息投递 API 绑定
 *
 * 后端: IM 服务 /push/* /notifications/*
 * 路由:
 *   POST   /push/tokens
 *   PUT    /push/tokens/{id}
 *   DELETE /push/tokens/{id}
 *   GET    /push/tokens
 *   POST   /push/send
 *   POST   /push/broadcast
 *   GET    /push/delivery/{id}
 *   GET    /push/delivery
 *   POST   /push/templates
 *   PUT    /push/templates/{id}
 *   DELETE /push/templates/{id}
 *   GET    /push/templates
 *   POST   /push/test
 *   GET    /push/preferences
 *   PUT    /push/preferences
 *   GET    /push/silent-periods
 *   POST   /push/silent-periods
 *   PUT    /push/silent-periods/{id}
 *   DELETE /push/silent-periods/{id}
 *   GET    /push/stats
 *   POST   /push/refresh
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type PushPlatform = 'ios' | 'android' | 'web' | 'desktop';

export type PushStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface PushToken {
  id: string;
  user_id: string;
  device_id: string;
  platform: PushPlatform;
  token: string;
  app_id: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RegisterPushTokenRequest {
  device_id: string;
  platform: PushPlatform;
  token: string;
  app_id: string;
  is_active?: boolean;
}

export interface PushDelivery {
  id: string;
  message_id?: string;
  push_token_id: string;
  recipient_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: PushStatus;
  platform: PushPlatform;
  attempted_at?: string;
  delivered_at?: string;
  failed_at?: string;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  created_at: string;
}

export interface SendPushRequest {
  recipient_ids?: string[];
  token_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: MessagePriority;
  sound?: string;
  badge?: number;
  category?: string;
  force_notification?: boolean;
  collapse_key?: string;
  ttl_seconds?: number;
}

export interface BroadcastRequest {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  target: {
    user_ids?: string[];
    department_ids?: string[];
    role_ids?: string[];
    all_active?: boolean;
  };
  priority?: MessagePriority;
  exclude_tokens?: string[];
}

export interface PushTemplate {
  id: string;
  name: string;
  code: string;
  description?: string;
  title_template: string;
  body_template: string;
  data_template?: Record<string, unknown>;
  variables: Array<{ key: string; description?: string; required?: boolean }>;
  category: 'chat' | 'call' | 'mention' | 'system' | 'custom';
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePushTemplateRequest {
  name: string;
  code: string;
  description?: string;
  title_template: string;
  body_template: string;
  data_template?: Record<string, unknown>;
  variables?: Array<{ key: string; description?: string; required?: boolean }>;
  category?: PushTemplate['category'];
}

export interface PushPreferences {
  user_id: string;
  enable_push: boolean;
  enable_sound: boolean;
  enable_vibration: boolean;
  enable_led: boolean;
  show_preview: boolean;
  lock_screen_visible: 'always' | 'when_unlocked' | 'never';
  group_sound?: string;
  private_sound?: string;
  call_sound?: string;
  mute_dnd: boolean;
  categories: Record<string, { enabled: boolean; sound?: string; vibration?: boolean }>;
  updated_at: string;
}

export interface SilentPeriod {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  timezone?: string;
  repeat: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;
  exclude_calls: boolean;
  exclude_urgent: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSilentPeriodRequest {
  start_time: string;
  end_time: string;
  timezone?: string;
  repeat?: SilentPeriod['repeat'];
  exclude_calls?: boolean;
  exclude_urgent?: boolean;
  is_active?: boolean;
}

export interface PushStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  avg_latency_ms: number;
  by_platform: Record<string, { sent: number; delivered: number; failed: number; rate: number }>;
  by_category: Record<string, { sent: number; delivered: number }>;
  by_hour: Array<{ hour: number; count: number }>;
  top_errors: Array<{ error: string; count: number }>;
}

export const imPushApi = {
  // ==================== Push Token 管理 ====================

  registerToken: async (data: RegisterPushTokenRequest): Promise<ApiResponse<PushToken>> => {
    return apiClient.im.post('/push/tokens', data);
  },

  updateToken: async (
    id: string,
    data: Partial<RegisterPushTokenRequest>
  ): Promise<ApiResponse<PushToken>> => {
    return apiClient.im.put(`/push/tokens/${id}`, data);
  },

  deleteToken: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/push/tokens/${id}`);
  },

  listMyTokens: async (): Promise<ApiResponse<PushToken[]>> => {
    return apiClient.im.get('/push/tokens');
  },

  // ==================== 推送发送 ====================

  sendPush: async (
    data: SendPushRequest
  ): Promise<ApiResponse<{ sent: number; failed: number; delivery_ids: string[] }>> => {
    return apiClient.im.post('/push/send', data);
  },

  broadcastPush: async (
    data: BroadcastRequest
  ): Promise<ApiResponse<{ total: number; sent: number; failed: number }>> => {
    return apiClient.im.post('/push/broadcast', data);
  },

  testPush: async (data: {
    token: string;
    title?: string;
    body?: string;
  }): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiClient.im.post('/push/test', data);
  },

  // ==================== 投递记录 ====================

  getDelivery: async (id: string): Promise<ApiResponse<PushDelivery>> => {
    return apiClient.im.get(`/push/delivery/${id}`);
  },

  listDeliveries: async (params?: {
    user_id?: string;
    status?: PushStatus;
    platform?: PushPlatform;
    start_date?: string;
    end_date?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<PushDelivery>>> => {
    return apiClient.im.get('/push/delivery', { params });
  },

  // ==================== 推送模板 ====================

  listTemplates: async (params?: {
    category?: PushTemplate['category'];
    is_active?: boolean;
  }): Promise<ApiResponse<PushTemplate[]>> => {
    return apiClient.im.get('/push/templates', { params });
  },

  createTemplate: async (data: CreatePushTemplateRequest): Promise<ApiResponse<PushTemplate>> => {
    return apiClient.im.post('/push/templates', data);
  },

  updateTemplate: async (
    id: string,
    data: Partial<CreatePushTemplateRequest>
  ): Promise<ApiResponse<PushTemplate>> => {
    return apiClient.im.put(`/push/templates/${id}`, data);
  },

  deleteTemplate: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/push/templates/${id}`);
  },

  // ==================== 推送偏好 ====================

  getPreferences: async (): Promise<ApiResponse<PushPreferences>> => {
    return apiClient.im.get('/push/preferences');
  },

  updatePreferences: async (
    data: Partial<PushPreferences>
  ): Promise<ApiResponse<PushPreferences>> => {
    return apiClient.im.put('/push/preferences', data);
  },

  // ==================== 静默时段 ====================

  listSilentPeriods: async (): Promise<ApiResponse<SilentPeriod[]>> => {
    return apiClient.im.get('/push/silent-periods');
  },

  createSilentPeriod: async (
    data: CreateSilentPeriodRequest
  ): Promise<ApiResponse<SilentPeriod>> => {
    return apiClient.im.post('/push/silent-periods', data);
  },

  updateSilentPeriod: async (
    id: string,
    data: Partial<CreateSilentPeriodRequest>
  ): Promise<ApiResponse<SilentPeriod>> => {
    return apiClient.im.put(`/push/silent-periods/${id}`, data);
  },

  deleteSilentPeriod: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/push/silent-periods/${id}`);
  },

  // ==================== 推送统计 ====================

  getPushStats: async (params?: {
    period?: 'day' | 'week' | 'month';
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<PushStats>> => {
    return apiClient.im.get('/push/stats', { params });
  },

  // ==================== Token 刷新 ====================

  refreshTokens: async (): Promise<ApiResponse<{ refreshed: number; expired: number }>> => {
    return apiClient.im.post('/push/refresh');
  },
};

export default imPushApi;
