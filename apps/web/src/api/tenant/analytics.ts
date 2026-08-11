/**
 * Tenant · 租户分析与账单 API 绑定
 *
 * 后端: svc/unified-core/src/modules/tenant_analytics.rs
 * 路由:
 *   GET    /tenant/{id}/analytics/overview
 *   GET    /tenant/{id}/analytics/usage
 *   GET    /tenant/{id}/analytics/activity
 *   GET    /tenant/{id}/analytics/api-usage
 *   GET    /tenant/{id}/analytics/top-endpoints
 *   GET    /tenant/{id}/analytics/user-stats
 *   GET    /tenant/{id}/analytics/real-time
 *   GET    /tenant/{id}/billing
 *   GET    /tenant/{id}/billing/invoices
 *   GET    /tenant/{id}/billing/invoices/{invoice_id}
 *   POST   /tenant/{id}/billing/invoices/{invoice_id}/pay
 *   GET    /tenant/{id}/billing/subscription
 *   POST   /tenant/{id}/billing/subscription/cancel
 *   POST   /tenant/{id}/billing/plan
 *   POST   /tenant/{id}/billing/card
 *   DELETE /tenant/{id}/billing/card
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';
import type { TenantPlan } from './types';

export interface AnalyticsOverview {
  tenant_id: string;
  period_start: string;
  period_end: string;
  active_users: number;
  new_users: number;
  returning_users: number;
  api_calls_total: number;
  api_calls_by_endpoint: Array<{ endpoint: string; count: number }>;
  avg_response_time_ms: number;
  error_rate: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  billing_amount: number;
  billing_currency: string;
  compared_to_previous?: {
    active_users: number;
    new_users: number;
    api_calls: number;
    storage: number;
  };
}

export interface UsageData {
  tenant_id: string;
  date: string;
  users_active: number;
  users_new: number;
  users_returning: number;
  api_calls: number;
  api_errors: number;
  storage_gb: number;
  bandwidth_gb: number;
  cpu_usage_percent?: number;
  memory_usage_percent?: number;
}

export interface ActivityEvent {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface ApiUsageStats {
  tenant_id: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p99_latency_ms: number;
  by_method: Record<string, number>;
  by_endpoint: Array<{
    method: string;
    path: string;
    count: number;
    avg_latency_ms: number;
    error_rate: number;
  }>;
  rate_limit_hits: number;
  throttled_requests: number;
  period: { start: string; end: string };
}

export interface TopEndpoint {
  rank: number;
  method: string;
  path: string;
  category: string;
  calls: number;
  errors: number;
  avg_latency_ms: number;
  last_called_at?: string;
}

export interface UserStats {
  total_users: number;
  active_today: number;
  active_this_week: number;
  active_this_month: number;
  by_role: Record<string, number>;
  by_status: Record<string, number>;
  by_activity: Array<{
    user_id: string;
    email: string;
    name: string;
    role: string;
    last_active_at: string;
    api_calls_30d: number;
  }>;
  inactive_users_30d: number;
}

export interface RealTimeMetrics {
  tenant_id: string;
  timestamp: string;
  active_users_now: number;
  requests_last_minute: number;
  requests_last_5min: number;
  requests_last_hour: number;
  error_rate_last_minute: number;
  avg_response_time_ms: number;
  concurrent_sessions: number;
  queued_tasks: number;
  system_health: 'healthy' | 'degraded' | 'critical';
}

export interface BillingSubscription {
  id: string;
  tenant_id: string;
  plan: TenantPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  next_billing_date?: string;
  auto_renew: boolean;
  seats_used: number;
  seats_total: number;
  amount: number;
  currency: string;
  features: Array<{ key: string; name: string; included: boolean }>;
  add_ons: Array<{ key: string; name: string; price: number }>;
}

export interface BillingInvoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'void';
  billing_date: string;
  due_date: string;
  paid_at?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  tax_amount?: number;
  discount_amount?: number;
  total_amount: number;
  pdf_url?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'alipay' | 'wechat_pay';
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  is_verified: boolean;
}

export interface ChangePlanRequest {
  plan: TenantPlan;
  seats?: number;
  billing_cycle?: 'monthly' | 'annual';
  coupon_code?: string;
}

export const tenantAnalyticsApi = {
  // ==================== 概览分析 ====================

  getOverview: async (
    tenantId: string,
    params?: {
      period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<AnalyticsOverview>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/overview`, { params });
  },

  getUsage: async (
    tenantId: string,
    params?: {
      start_date?: string;
      end_date?: string;
      granularity?: 'hour' | 'day' | 'week' | 'month';
    }
  ): Promise<ApiResponse<UsageData[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/usage`, { params });
  },

  getActivity: async (
    tenantId: string,
    params?: {
      action?: string;
      user_id?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<ApiResponse<PaginatedResponse<ActivityEvent>>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/activity`, { params });
  },

  // ==================== API 使用分析 ====================

  getApiUsageStats: async (
    tenantId: string,
    params?: {
      period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<ApiUsageStats>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/api-usage`, { params });
  },

  getTopEndpoints: async (
    tenantId: string,
    params?: { period?: 'week' | 'month' | 'quarter'; limit?: number; category?: string }
  ): Promise<ApiResponse<TopEndpoint[]>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/top-endpoints`, { params });
  },

  // ==================== 用户分析 ====================

  getUserStats: async (tenantId: string): Promise<ApiResponse<UserStats>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/user-stats`);
  },

  // ==================== 实时监控 ====================

  getRealTimeMetrics: async (tenantId: string): Promise<ApiResponse<RealTimeMetrics>> => {
    return apiClient.core.get(`/tenant/${tenantId}/analytics/real-time`);
  },

  // ==================== 订阅与账单 ====================

  getSubscription: async (tenantId: string): Promise<ApiResponse<BillingSubscription>> => {
    return apiClient.core.get(`/tenant/${tenantId}/billing/subscription`);
  },

  getBillingInfo: async (tenantId: string): Promise<ApiResponse<BillingSubscription>> => {
    return apiClient.core.get(`/tenant/${tenantId}/billing`);
  },

  listInvoices: async (
    tenantId: string,
    params?: { status?: BillingInvoice['status']; page?: number; pageSize?: number }
  ): Promise<ApiResponse<PaginatedResponse<BillingInvoice>>> => {
    return apiClient.core.get(`/tenant/${tenantId}/billing/invoices`, { params });
  },

  getInvoice: async (tenantId: string, invoiceId: string): Promise<ApiResponse<BillingInvoice>> => {
    return apiClient.core.get(`/tenant/${tenantId}/billing/invoices/${invoiceId}`);
  },

  payInvoice: async (
    tenantId: string,
    invoiceId: string,
    data?: { payment_method_id?: string }
  ): Promise<ApiResponse<{ success: boolean; payment_id?: string }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/billing/invoices/${invoiceId}/pay`, data || {});
  },

  // ==================== 计划管理 ====================

  changePlan: async (
    tenantId: string,
    data: ChangePlanRequest
  ): Promise<ApiResponse<BillingSubscription>> => {
    return apiClient.core.post(`/tenant/${tenantId}/billing/plan`, data);
  },

  cancelSubscription: async (
    tenantId: string,
    data?: { reason?: string }
  ): Promise<ApiResponse<{ canceled_at: string }>> => {
    return apiClient.core.post(`/tenant/${tenantId}/billing/subscription/cancel`, data || {});
  },

  // ==================== 支付方式 ====================

  addPaymentMethod: async (
    tenantId: string,
    data: { type: PaymentMethod['type']; token?: string; is_default?: boolean }
  ): Promise<ApiResponse<PaymentMethod>> => {
    return apiClient.core.post(`/tenant/${tenantId}/billing/card`, data);
  },

  removePaymentMethod: async (tenantId: string): Promise<ApiResponse<string>> => {
    return apiClient.core.delete(`/tenant/${tenantId}/billing/card`);
  },
};

export default tenantAnalyticsApi;
