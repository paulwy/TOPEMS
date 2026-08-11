/**
 * Notification · 订阅管理 API 绑定
 *
 * 后端: svc/communication/src/notification.rs
 * 路由:
 *   GET    /notification/subscriptions
 *   POST   /notification/subscriptions
 *   GET    /notification/subscriptions/{id}
 *   PUT    /notification/subscriptions/{id}
 *   DELETE /notification/subscriptions/{id}
 *   POST   /notification/subscriptions/{id}/pause
 *   POST   /notification/subscriptions/{id}/resume
 *   GET    /notification/my-subscriptions
 *   POST   /notification/batch-subscribe
 *   DELETE /notification/batch-unsubscribe
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { DeliveryChannel } from './delivery';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'expired';

export interface NotificationSubscription {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  event_category?: string;
  channels: DeliveryChannel[];
  status: SubscriptionStatus;
  filter_expression?: string;
  priority?: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionRequest {
  event_type: string;
  event_category?: string;
  channels: DeliveryChannel[];
  filter_expression?: string;
  priority?: number;
  expires_at?: string;
}

export interface UpdateSubscriptionRequest {
  channels?: DeliveryChannel[];
  filter_expression?: string;
  priority?: number;
  expires_at?: string;
}

export interface SubscriptionListQuery {
  event_type?: string;
  status?: SubscriptionStatus;
  channel?: DeliveryChannel;
  page?: number;
  page_size?: number;
}

export const subscriptionApi = {
  listSubscriptions: async (
    params?: SubscriptionListQuery
  ): Promise<ApiResponse<PaginatedResponse<NotificationSubscription>>> => {
    return apiClient.notification.get('/notification/subscriptions', { params });
  },

  getSubscription: async (id: string): Promise<ApiResponse<NotificationSubscription>> => {
    return apiClient.notification.get(`/notification/subscriptions/${id}`);
  },

  createSubscription: async (
    data: CreateSubscriptionRequest
  ): Promise<ApiResponse<NotificationSubscription>> => {
    return apiClient.notification.post('/notification/subscriptions', data);
  },

  updateSubscription: async (
    id: string,
    data: UpdateSubscriptionRequest
  ): Promise<ApiResponse<NotificationSubscription>> => {
    return apiClient.notification.put(`/notification/subscriptions/${id}`, data);
  },

  deleteSubscription: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete(`/notification/subscriptions/${id}`);
  },

  pauseSubscription: async (id: string): Promise<ApiResponse<NotificationSubscription>> => {
    return apiClient.notification.post(`/notification/subscriptions/${id}/pause`);
  },

  resumeSubscription: async (id: string): Promise<ApiResponse<NotificationSubscription>> => {
    return apiClient.notification.post(`/notification/subscriptions/${id}/resume`);
  },

  getMySubscriptions: async (
    params?: SubscriptionListQuery
  ): Promise<ApiResponse<PaginatedResponse<NotificationSubscription>>> => {
    return apiClient.notification.get('/notification/my-subscriptions', { params });
  },

  batchSubscribe: async (
    subscriptions: CreateSubscriptionRequest[]
  ): Promise<ApiResponse<{ created_count: number }>> => {
    return apiClient.notification.post('/notification/batch-subscribe', {
      subscriptions,
    });
  },

  batchUnsubscribe: async (
    subscriptionIds: string[]
  ): Promise<ApiResponse<{ cancelled_count: number }>> => {
    return apiClient.notification.delete('/notification/batch-unsubscribe', {
      data: { ids: subscriptionIds },
    });
  },

  subscribeToEvent: async (
    eventType: string,
    channels: DeliveryChannel[]
  ): Promise<ApiResponse<NotificationSubscription>> => {
    return apiClient.notification.post('/notification/subscriptions', {
      event_type: eventType,
      channels,
    });
  },

  unsubscribeFromEvent: async (eventType: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.notification.delete('/notification/subscriptions/event', {
      params: { event_type: eventType },
    });
  },

  listEventTypes: async (): Promise<
    ApiResponse<Array<{ event_type: string; description: string; category: string }>>
  > => {
    return apiClient.notification.get('/notification/event-types');
  },
};

export default subscriptionApi;
