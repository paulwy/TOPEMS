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
