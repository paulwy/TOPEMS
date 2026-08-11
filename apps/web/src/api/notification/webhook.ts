/**
 * Notification · Webhook 集成 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/webhooks
 *   POST   /notification/webhooks
 *   GET    /notification/webhooks/{id}
 *   PUT    /notification/webhooks/{id}
 *   DELETE /notification/webhooks/{id}
 *   POST   /notification/webhooks/{id}/test
 *   GET    /notification/webhooks/{id}/events
 *   POST   /notification/webhooks/{id}/enable
 *   POST   /notification/webhooks/{id}/disable
 *   POST   /notification/webhooks/{id}/rotate-secret
 *   GET    /notification/webhooks/events/{event_id}/deliveries
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type WebhookEventType =
  | 'notification.created'
  | 'notification.read'
  | 'notification.delivered'
  | 'notification.failed'
  | 'broadcast.completed'
  | 'template.created'
  | 'template.updated'
  | 'user.preference.changed';

export type WebhookStatus = 'active' | 'inactive' | 'error';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  description?: string;
  events: WebhookEventType[];
  secret?: string;
  status: WebhookStatus;
  headers?: Record<string, string>;
  retry_count: number;
  max_retries: number;
  timeout_seconds: number;
  last_delivery_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  description?: string;
  events: WebhookEventType[];
  headers?: Record<string, string>;
  max_retries?: number;
  timeout_seconds?: number;
}

export interface UpdateWebhookRequest extends Partial<CreateWebhookRequest> {}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: WebhookEventType;
  status: 'delivered' | 'failed' | 'pending';
  request_url: string;
  request_body?: Record<string, unknown>;
  response_status?: number;
  response_body?: string;
  duration_ms: number;
  retry_count: number;
  delivered_at?: string;
  failed_at?: string;
  error_message?: string;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: WebhookEventType;
  payload: Record<string, unknown>;
  deliveries: WebhookDelivery[];
  created_at: string;
}

export interface TestWebhookResponse {
  success: boolean;
  status_code: number;
  response_body?: string;
  duration_ms: number;
  error_message?: string;
}

export interface WebhookListResponse {
  webhooks: WebhookConfig[];
  total: number;
}

export interface WebhookEventListResponse {
  events: WebhookEvent[];
  total: number;
  page: number;
  pagesize: number;
}

export const webhookApi = {
  listWebhooks: async (): Promise<ApiResponse<WebhookListResponse>> => {
    return apiClient.notification.get('/notification/webhooks');
  },

  createWebhook: async (data: CreateWebhookRequest): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.notification.post('/notification/webhooks', data);
  },

  getWebhook: async (id: string): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.notification.get(`/notification/webhooks/${id}`);
  },

  updateWebhook: async (
    id: string,
    data: UpdateWebhookRequest
  ): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.notification.put(`/notification/webhooks/${id}`, data);
  },

  deleteWebhook: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.delete(`/notification/webhooks/${id}`);
  },

  testWebhook: async (id: string): Promise<ApiResponse<TestWebhookResponse>> => {
    return apiClient.notification.post(`/notification/webhooks/${id}/test`);
  },

  getWebhookEvents: async (
    id: string,
    params?: { page?: number; pagesize?: number; event_type?: WebhookEventType }
  ): Promise<ApiResponse<WebhookEventListResponse>> => {
    return apiClient.notification.get(`/notification/webhooks/${id}/events`, {
      params,
    });
  },

  enableWebhook: async (id: string): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.notification.post(`/notification/webhooks/${id}/enable`);
  },

  disableWebhook: async (id: string): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.notification.post(`/notification/webhooks/${id}/disable`);
  },

  rotateWebhookSecret: async (id: string): Promise<ApiResponse<WebhookConfig>> => {
    return apiClient.notification.post(`/notification/webhooks/${id}/rotate-secret`);
  },

  getEventDeliveries: async (eventId: string): Promise<ApiResponse<WebhookDelivery[]>> => {
    return apiClient.notification.get(`/notification/webhooks/events/${eventId}/deliveries`);
  },
};

export default webhookApi;
