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
