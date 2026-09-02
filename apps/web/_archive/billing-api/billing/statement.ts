/**
 * Billing · 账单报表 API 绑定
 *
 * 后端: svc/billing/src/handlers.rs
 * 路由:
 *   GET    /usage/{tenant_id}
 *   POST   /usage/{tenant_id}/{metric_type}
 *   GET    /stats
 *   GET    /reports/revenue
 *   GET    /reports/outstanding
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface MetricUsage {
  current: number;
  quota: number;
  percent_used: number;
}

export interface UsageMetrics {
  users: MetricUsage;
  storage: MetricUsage;
  api_calls: MetricUsage;
}

export interface CostBreakdown {
  base_cost_cents: number;
  overage_cost_cents: number;
  plugin_cost_cents: number;
  total_cost_cents: number;
}

export interface PeriodInfo {
  start_date: string;
  end_date: string;
}

export interface UsageSummary {
  tenant_id: string;
  period: PeriodInfo;
  usage: UsageMetrics;
  costs: CostBreakdown;
}

export interface UsageRecord {
  id: string;
  tenant_id: string;
  metric_type: string;
  metric_name?: string;
  quantity: number;
  unit?: string;
  period_start: string;
  period_end: string;
  cost_cents?: number;
  created_at: string;
}

export interface BillingStats {
  total_revenue: number;
  monthly_revenue: number;
  active_subscriptions: number;
  expired_subscriptions: number;
  overdue_invoices: number;
  by_plan: Record<string, number>;
  revenue_trend: Array<{ month: string; amount: number }>;
}

export interface RevenueReportItem {
  period: string;
  revenue: number;
  plan?: string;
  cost?: number;
  profit?: number;
}

export interface OutstandingItem {
  invoice_id: string;
  invoice_number: string;
  tenant_id: string;
  tenant_name?: string;
  amount_due: number;
  due_date: string;
  days_overdue: number;
  status: string;
}

export type MetricType = 'users' | 'storage' | 'api_calls';

export const statementApi = {
  getUsageSummary: async (tenantId: string): Promise<ApiResponse<UsageSummary>> => {
    return apiClient.billing.get(`/usage/${tenantId}`);
  },

  recordUsage: async (
    tenantId: string,
    metricType: MetricType,
    quantity: number
  ): Promise<ApiResponse<UsageRecord>> => {
    return apiClient.billing.post(`/usage/${tenantId}/${metricType}`, quantity);
  },

  getStats: async (params?: {
    period?: 'month' | 'quarter' | 'year';
  }): Promise<ApiResponse<BillingStats>> => {
    return apiClient.billing.get('/stats', { params });
  },

  getRevenueReport: async (params?: {
    start_date?: string;
    end_date?: string;
    by?: 'plan' | 'month';
  }): Promise<ApiResponse<RevenueReportItem[]>> => {
    return apiClient.billing.get('/reports/revenue', { params });
  },

  getOutstandingReport: async (params?: {
    tenant_id?: string;
    days?: number;
  }): Promise<ApiResponse<OutstandingItem[]>> => {
    return apiClient.billing.get('/reports/outstanding', { params });
  },
};

export default statementApi;
