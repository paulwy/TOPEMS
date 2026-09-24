/**
 * Notification · 送达追踪 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/deliveries
 *   GET    /notification/deliveries/{id}
 *   POST   /notification/deliveries/{id}/retry
 *   GET    /notification/deliveries/batch/{batch_id}
 *   GET    /notification/deliveries/by-user/{user_id}
 *   GET    /notification/deliveries/stats
 *   GET    /notification/deliveries/failed
 *   POST   /notification/deliveries/retry-all
 *   GET    /notification/deliveries/by-channel/{channel}
 *   DELETE /notification/deliveries/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type DeliveryStatus = 'pending' | 'delivering' | 'delivered' | 'failed' | 'expired';

export type DeliveryChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';

export interface DeliveryRecord {
  id: string;
  notification_id: string;
  user_id: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  recipient: string;
  subject?: string;
  body?: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  failure_reason?: string;
  retry_count: number;
  max_retries: number;
  next_retry_at?: string;
  provider_message_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DeliveryListQuery {
  page?: number;
  page_size?: number;
  status?: DeliveryStatus;
  channel?: DeliveryChannel;
  user_id?: string;
  notification_id?: string;
  batch_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface DeliveryListResponse {
  deliveries: DeliveryRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  expired: number;
  by_channel: Record<DeliveryChannel, number>;
  by_status: Record<DeliveryStatus, number>;
  delivery_rate: number;
  average_delivery_time_ms: number;
  failure_reasons: Array<{ reason: string; count: number }>;
}

export interface RetryDeliveryResponse {
  id: string;
  previous_status: DeliveryStatus;
  new_status: DeliveryStatus;
}

export const deliveryApi = {
  listDeliveries: async (
    params?: DeliveryListQuery
  ): Promise<ApiResponse<DeliveryListResponse>> => {
    return apiClient.notification.get('/notification/deliveries', { params });
  },

  getDelivery: async (id: string): Promise<ApiResponse<DeliveryRecord>> => {
    return apiClient.notification.get(`/notification/deliveries/${id}`);
  },

  retryDelivery: async (id: string): Promise<ApiResponse<RetryDeliveryResponse>> => {
    return apiClient.notification.post(`/notification/deliveries/${id}/retry`);
  },

  getBatchDeliveries: async (
    batchId: string,
    params?: { page?: number; page_size?: number }
  ): Promise<ApiResponse<DeliveryListResponse>> => {
    return apiClient.notification.get(`/notification/deliveries/batch/${batchId}`, {
      params,
    });
  },

  getUserDeliveries: async (
    userId: string,
    params?: { page?: number; page_size?: number; status?: DeliveryStatus }
  ): Promise<ApiResponse<DeliveryListResponse>> => {
    return apiClient.notification.get(`/notification/deliveries/by-user/${userId}`, {
      params,
    });
  },

  getDeliveryStats: async (params?: {
    from_date?: string;
    to_date?: string;
    channel?: DeliveryChannel;
  }): Promise<ApiResponse<DeliveryStats>> => {
    return apiClient.notification.get('/notification/deliveries/stats', { params });
  },

  getFailedDeliveries: async (params?: {
    page?: number;
    page_size?: number;
    from_date?: string;
    to_date?: string;
  }): Promise<ApiResponse<DeliveryListResponse>> => {
    return apiClient.notification.get('/notification/deliveries/failed', { params });
  },

  retryAllFailed: async (): Promise<ApiResponse<{ retried_count: number }>> => {
    return apiClient.notification.post('/notification/deliveries/retry-all');
  },

  getChannelDeliveries: async (
    channel: DeliveryChannel,
    params?: { page?: number; page_size?: number; status?: DeliveryStatus }
  ): Promise<ApiResponse<DeliveryListResponse>> => {
    return apiClient.notification.get(`/notification/deliveries/by-channel/${channel}`, {
      params,
    });
  },

  deleteDelivery: async (id: string): Promise<ApiResponse<boolean>> => {
    return apiClient.notification.delete(`/notification/deliveries/${id}`);
  },
};

export default deliveryApi;
