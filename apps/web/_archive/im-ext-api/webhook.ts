/**
 * IM · Webhook 集成 API 绑定
 *
 * 后端: IM 服务 /webhooks/*
 * 路由:
 *   GET    /webhooks
 *   POST   /webhooks
 *   GET    /webhooks/{id}
 *   PUT    /webhooks/{id}
 *   DELETE /webhooks/{id}
 *   POST   /webhooks/{id}/test
 *   POST   /webhooks/{id}/enable
 *   POST   /webhooks/{id}/disable
 *   POST   /webhooks/{id}/rotate-secret
 *   GET    /webhooks/{id}/deliveries
 *   POST   /webhooks/{id}/deliveries/{delivery_id}/retry
 *   POST   /webhooks/{id}/bulk-test
 *   GET    /webhooks/events
 *   GET    /webhooks/stats
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

export type WebhookStatus = 'active' | 'inactive' | 'error';
export type WebhookContentType = 'json' | 'form' | 'xml';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  status: WebhookStatus;
  content_type: WebhookContentType;
  secret: string;
  secret_masked: string;
  timeout_ms: number;
  retry_count: number;
  retry_interval_ms: number;
  max_retry_interval_ms: number;
  events: string[];
  filters?: Record<string, unknown>;
  headers?: Record<string, string>;
  is_ssl_verify: boolean;
  description?: string;
  created_by: string;
  created_by_name: string;
  last_delivery_at?: string;
  last_delivery_status?: 'success' | 'failed';
  delivery_count_7d: number;
  success_rate_7d: number;
  avg_response_time_ms: number;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  content_type?: WebhookContentType;
  events: string[];
  secret?: string;
  timeout_ms?: number;
  retry_count?: number;
  filters?: Record<string, unknown>;
  headers?: Record<string, string>;
  is_ssl_verify?: boolean;
  description?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  webhook_name: string;
  event_type: string;
  event_data: Record<string, unknown>;
  request_url: string;
  request_headers: Record<string, string>;
  request_body: string;
  response_status?: number;
  response_body?: string;
  response_time_ms: number;
  retry_count: number;
  status: 'pending' | 'delivering' | 'success' | 'failed' | 'expired';
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

export interface WebhookEvent {
  event_type: string;
  description: string;
  sample_payload: Record<string, unknown>;
  is_active: boolean;
  category: 'message' | 'member' | 'channel' | 'bot' | 'system';
}

export interface WebhookStats {
  total_webhooks: number;
  active_webhooks: number;
  total_deliveries_7d: number;
  success_rate_7d: number;
  avg_response_time_ms: number;
  failed_deliveries_7d: number;
  top_events: Array<{ event_type: string; count: number }>;
  top_webhooks: Array<{ webhook_id: string; webhook_name: string; deliveries: number }>;
}

export interface TestWebhookRequest {
  event_type: string;
  event_data?: Record<string, unknown>;
}

export interface TestWebhookResult {
  success: boolean;
  status_code?: number;
  response_body?: string;
  response_time_ms: number;
  error_message?: string;
}

export const imWebhookApi = {
  // ==================== Webhook CRUD ====================

  listWebhooks: async (params?: {
    status?: WebhookStatus;
    search?: string;
    event?: string;
    page?: number;
    pagesize?: number;
  }): Promise<ApiResponse<PaginatedResponse<WebhookConfig>>> => {
    return apiClient.im.get('/webhooks', { params });
  },

  createWebhook: async (data: CreateWebhookRequest): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.im.post('/webhooks', data);
  },

  getWebhook: async (id: string): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.im.get(`/webhooks/${id}`);
  },

  updateWebhook: async (
    id: string,
    data: Partial<
      Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at' | 'secret' | 'secret_masked'>
    >
  ): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.im.put(`/webhooks/${id}`, data);
  },

  deleteWebhook: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.im.delete(`/webhooks/${id}`);
  },

  // ==================== Webhook 状态管理 ====================

  enableWebhook: async (id: string): Promise<ApiResponse<{ enabled: boolean }>> => {
    return apiClient.im.post(`/webhooks/${id}/enable`);
  },

  disableWebhook: async (id: string): Promise<ApiResponse<{ disabled: boolean }>> => {
    return apiClient.im.post(`/webhooks/${id}/disable`);
  },

  rotateWebhookSecret: async (id: string): Promise<ApiResponse<{ new_secret: string }>> => {
    return apiClient.im.post(`/webhooks/${id}/rotate-secret`);
  },

  // ==================== Webhook 测试 ====================

  testWebhook: async (
    id: string,
    data?: TestWebhookRequest
  ): Promise<ApiResponse<TestWebhookResult>> => {
    return apiClient.im.post(`/webhooks/${id}/test`, data || {});
  },

  bulkTestWebhooks: async (data: {
    webhook_ids: string[];
    event_type: string;
  }): Promise<ApiResponse<Array<{ webhook_id: string; result: TestWebhookResult }>>> => {
    return apiClient.im.post('/webhooks/bulk-test', data);
  },

  // ==================== 投递记录 ====================

  listWebhookDeliveries: async (
    webhookId: string,
    params?: {
      status?: WebhookDelivery['status'];
      event_type?: string;
      from_time?: string;
      to_time?: string;
      page?: number;
      pagesize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<WebhookDelivery>>> => {
    return apiClient.im.get(`/webhooks/${webhookId}/deliveries`, { params });
  },

  retryDelivery: async (
    webhookId: string,
    deliveryId: string
  ): Promise<ApiResponse<WebhookDelivery>> => {
    return apiClient.im.post(`/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
  },

  retryAllFailedDeliveries: async (
    webhookId: string
  ): Promise<ApiResponse<{ retried: number }>> => {
    return apiClient.im.post(`/webhooks/${webhookId}/deliveries/retry-all`);
  },

  // ==================== 事件类型 ====================

  listWebhookEvents: async (params?: {
    category?: WebhookEvent['category'];
    is_active?: boolean;
  }): Promise<ApiResponse<WebhookEvent[]>> => {
    return apiClient.im.get('/webhooks/events', { params });
  },

  // ==================== 统计 ====================

  getWebhookStats: async (): Promise<ApiResponse<WebhookStats>> => {
    return apiClient.im.get('/webhooks/stats');
  },
};

export default imWebhookApi;
