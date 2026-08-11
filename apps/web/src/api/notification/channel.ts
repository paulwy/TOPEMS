/**
 * Notification · 渠道与 Provider 管理 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/channels
 *   POST   /notification/channels
 *   GET    /notification/channels/{id}
 *   PUT    /notification/channels/{id}
 *   DELETE /notification/channels/{id}
 *   POST   /notification/channels/{id}/test
 *   GET    /notification/channels/{id}/metrics
 *   GET    /notification/providers
 *   POST   /notification/providers
 *   PUT    /notification/providers/{id}
 *   DELETE /notification/providers/{id}
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type ChannelType =
  'in_app' | 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'dingtalk' | 'wechat';
export type ChannelStatus = 'active' | 'inactive' | 'error';
export type ProviderStatus = 'configured' | 'unconfigured' | 'error';

export interface NotificationChannel {
  id: string;
  tenant_id: string;
  name: string;
  type: ChannelType;
  status: ChannelStatus;
  provider_id?: string;
  is_default: boolean;
  config: Record<string, unknown>;
  rate_limit_per_minute?: number;
  retry_count?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationProvider {
  id: string;
  tenant_id: string;
  name: string;
  type: ChannelType;
  status: ProviderStatus;
  config: Record<string, unknown>;
  is_predefined: boolean;
  description?: string;
  last_tested_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateChannelRequest {
  name: string;
  type: ChannelType;
  provider_id?: string;
  config: Record<string, unknown>;
  is_default?: boolean;
  rate_limit_per_minute?: number;
  retry_count?: number;
  description?: string;
}

export interface UpdateChannelRequest {
  name?: string;
  config?: Record<string, unknown>;
  is_default?: boolean;
  rate_limit_per_minute?: number;
  retry_count?: number;
  description?: string;
  status?: ChannelStatus;
}

export interface ChannelMetrics {
  total_sent: number;
  total_failed: number;
  success_rate: number;
  avg_latency_ms: number;
  by_hour: Array<{ hour: string; sent: number; failed: number }>;
}

export const channelApi = {
  // ==================== 渠道管理 ====================

  listChannels: async (params?: {
    type?: ChannelType;
    status?: ChannelStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<PaginatedResponse<NotificationChannel>>> => {
    return apiClient.notification.get('/notification/channels', { params });
  },

  getChannel: async (id: string): Promise<ApiResponse<NotificationChannel>> => {
    return apiClient.notification.get(`/notification/channels/${id}`);
  },

  createChannel: async (data: CreateChannelRequest): Promise<ApiResponse<NotificationChannel>> => {
    return apiClient.notification.post('/notification/channels', data);
  },

  updateChannel: async (
    id: string,
    data: UpdateChannelRequest
  ): Promise<ApiResponse<NotificationChannel>> => {
    return apiClient.notification.put(`/notification/channels/${id}`, data);
  },

  deleteChannel: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/channels/${id}`);
  },

  testChannel: async (id: string): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiClient.notification.post(`/notification/channels/${id}/test`);
  },

  getChannelMetrics: async (
    id: string,
    params?: { from_date?: string; to_date?: string }
  ): Promise<ApiResponse<ChannelMetrics>> => {
    return apiClient.notification.get(`/notification/channels/${id}/metrics`, { params });
  },

  setDefaultChannel: async (id: string): Promise<ApiResponse<NotificationChannel>> => {
    return apiClient.notification.put(`/notification/channels/${id}`, {
      is_default: true,
    });
  },

  // ==================== Provider 管理 ====================

  listProviders: async (params?: {
    type?: ChannelType;
    status?: ProviderStatus;
  }): Promise<ApiResponse<NotificationProvider[]>> => {
    return apiClient.notification.get('/notification/providers', { params });
  },

  getProvider: async (id: string): Promise<ApiResponse<NotificationProvider>> => {
    return apiClient.notification.get(`/notification/providers/${id}`);
  },

  createProvider: async (
    data: Omit<NotificationProvider, 'id' | 'created_at' | 'updated_at' | 'is_predefined'>
  ): Promise<ApiResponse<NotificationProvider>> => {
    return apiClient.notification.post('/notification/providers', data);
  },

  updateProvider: async (
    id: string,
    data: Partial<Omit<NotificationProvider, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<ApiResponse<NotificationProvider>> => {
    return apiClient.notification.put(`/notification/providers/${id}`, data);
  },

  deleteProvider: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/providers/${id}`);
  },

  getProviderTypes: async (): Promise<
    ApiResponse<Array<{ type: ChannelType; name: string; is_configurable: boolean }>>
  > => {
    return apiClient.notification.get('/notification/provider-types');
  },

  testProvider: async (
    id: string
  ): Promise<ApiResponse<{ success: boolean; message?: string }>> => {
    return apiClient.notification.post(`/notification/providers/${id}/test`);
  },
};

export default channelApi;
