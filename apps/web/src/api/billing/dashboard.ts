/**
 * Billing · 账单统计与看板 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   GET    /billing/dashboard/summary
 *   GET    /billing/dashboard/revenue-trend
 *   GET    /billing/dashboard/by-plan
 *   GET    /billing/dashboard/by-tenant
 *   GET    /billing/dashboard/invoice-health
 *   GET    /billing/dashboard/collection
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface BillingDashboardSummary {
  total_revenue: number;
  monthly_revenue: number;
  monthly_revenue_delta: number;
  active_subscriptions: number;
  new_subscriptions_this_month: number;
  churn_rate: number;
  outstanding_invoices: number;
  outstanding_amount: number;
  overdue_invoices: number;
  overdue_amount: number;
  average_invoice_amount: number;
  by_plan: Array<{
    plan_type: string;
    count: number;
    revenue: number;
  }>;
}

export interface RevenueTrendPoint {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  new_subscriptions: number;
  churned_subscriptions: number;
}

export interface InvoiceHealthMetric {
  total_invoices: number;
  paid: number;
  pending: number;
  overdue: number;
  void: number;
  paid_rate: number;
  avg_days_to_payment: number;
  overdue_rate: number;
}

export interface CollectionMetric {
  total_collected: number;
  total_outstanding: number;
  collection_rate: number;
  avg_collection_days: number;
  by_age_bucket: Array<{
    bucket: string;
    amount: number;
    count: number;
  }>;
}

export const dashboardApi = {
  getSummary: async (params?: {
    period?: 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<BillingDashboardSummary>> => {
    return apiClient.billing.get('/billing/dashboard/summary', { params });
  },

  getRevenueTrend: async (params?: {
    start_date?: string;
    end_date?: string;
    granularity?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<RevenueTrendPoint[]>> => {
    return apiClient.billing.get('/billing/dashboard/revenue-trend', { params });
  },

  getByPlan: async (params?: {
    period?: 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<Array<{ plan_type: string; count: number; revenue: number }>>> => {
    return apiClient.billing.get('/billing/dashboard/by-plan', { params });
  },

  getByTenant: async (params?: {
    top_n?: number;
    plan_type?: string;
  }): Promise<
    ApiResponse<
      Array<{
        tenant_id: string;
        tenant_name: string;
        plan_type: string;
        mrr: number;
        total_spend: number;
      }>
    >
  > => {
    return apiClient.billing.get('/billing/dashboard/by-tenant', { params });
  },

  getInvoiceHealth: async (): Promise<ApiResponse<InvoiceHealthMetric>> => {
    return apiClient.billing.get('/billing/dashboard/invoice-health');
  },

  getCollection: async (): Promise<ApiResponse<CollectionMetric>> => {
    return apiClient.billing.get('/billing/dashboard/collection');
  },
};

export default dashboardApi;
