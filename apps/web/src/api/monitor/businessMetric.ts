/**
 * Monitor · 业务指标 API 绑定
 *
 * 后端: svc/monitor/src/modules/monitor/business_metrics.rs
 * 路由:
 *   GET    /business-metrics
 *   POST   /business-metrics
 *   GET    /business-metrics/summary
 *   GET    /business-metrics/trend
 *   GET    /business-metrics/kpi
 *   GET    /business-metrics/{id}
 *   PUT    /business-metrics/{id}
 *   DELETE /business-metrics/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type MetricType =
  | 'revenue'
  | 'orders'
  | 'users'
  | 'conversion'
  | 'retention'
  | 'churn'
  | 'arpu'
  | 'cac'
  | 'ltv'
  | 'custom';

export type MetricAggregation = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate';

export interface BusinessMetric {
  id: string;
  tenant_id?: string;
  name: string;
  code: string;
  description?: string;
  metric_type: MetricType;
  aggregation: MetricAggregation;
  source_table?: string;
  source_column?: string;
  formula?: string;
  unit?: string;
  tags?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricSummary {
  total_metrics: number;
  active_metrics: number;
  by_type: Array<{
    type: MetricType;
    count: number;
  }>;
  recent_values: Array<{
    metric_id: string;
    metric_name: string;
    value: number;
    period: string;
  }>;
  top_growth: Array<{
    metric_id: string;
    metric_name: string;
    growth_percent: number;
  }>;
  top_decline: Array<{
    metric_id: string;
    metric_name: string;
    decline_percent: number;
  }>;
}

export interface MetricTrendPoint {
  period: string;
  value: number;
  target?: number;
  yoy_change?: number;
  mom_change?: number;
}

export interface KpiDashboard {
  period: string;
  total_revenue?: number;
  total_orders?: number;
  active_users?: number;
  conversion_rate?: number;
  retention_rate?: number;
  churn_rate?: number;
  arpu?: number;
  cac?: number;
  ltv?: number;
  metrics: Array<{
    metric_id: string;
    metric_name: string;
    current_value: number;
    previous_value?: number;
    change_percent?: number;
    target?: number;
    achieved_percent?: number;
  }>;
  by_channel?: Array<{
    channel: string;
    revenue: number;
    orders: number;
    users: number;
  }>;
  by_region?: Array<{
    region: string;
    revenue: number;
    orders: number;
    users: number;
  }>;
}

export interface CreateBusinessMetricRequest {
  name: string;
  code: string;
  description?: string;
  metric_type: MetricType;
  aggregation: MetricAggregation;
  source_table?: string;
  source_column?: string;
  formula?: string;
  unit?: string;
  tags?: string[];
}

export const businessMetricApi = {
  listMetrics: async (params?: {
    metric_type?: MetricType;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: BusinessMetric[]; total: number }>> => {
    return apiClient.monitor.get('/business-metrics', { params });
  },

  getMetric: async (id: string): Promise<ApiResponse<BusinessMetric>> => {
    return apiClient.monitor.get(`/business-metrics/${id}`);
  },

  createMetric: async (data: CreateBusinessMetricRequest): Promise<ApiResponse<BusinessMetric>> => {
    return apiClient.monitor.post('/business-metrics', data);
  },

  updateMetric: async (
    id: string,
    data: Partial<CreateBusinessMetricRequest>
  ): Promise<ApiResponse<BusinessMetric>> => {
    return apiClient.monitor.put(`/business-metrics/${id}`, data);
  },

  deleteMetric: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.monitor.delete(`/business-metrics/${id}`);
  },

  getSummary: async (): Promise<ApiResponse<MetricSummary>> => {
    return apiClient.monitor.get('/business-metrics/summary');
  },

  getTrend: async (params?: {
    metric_id?: string;
    from?: string;
    to?: string;
    granularity?: 'day' | 'week' | 'month';
  }): Promise<ApiResponse<MetricTrendPoint[]>> => {
    return apiClient.monitor.get('/business-metrics/trend', { params });
  },

  getKpiDashboard: async (params?: {
    period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    date?: string;
  }): Promise<ApiResponse<KpiDashboard>> => {
    return apiClient.monitor.get('/business-metrics/kpi', { params });
  },
};

export default businessMetricApi;
