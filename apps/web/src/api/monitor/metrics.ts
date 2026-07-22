/**
 * 监控指标 API
 *
 * 包含业务指标大盘、SLO/SLA 看板、告警规则配置相关接口。
 * Phase 4 可观测性增强。
 *
 * @module api/monitor/metrics
 */

import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

// ==================== 业务指标类型 ====================

export interface BusinessMetric {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  current_value: number;
  target_value: number | null;
  previous_value: number | null;
  change_percent: number | null;
  trend_direction: 'up' | 'down' | 'flat';
  service_name: string | null;
  description: string | null;
  last_updated: string;
}

export interface BusinessMetricCategory {
  code: string;
  name: string;
  metric_count: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
}

export interface BusinessMetricTrend {
  metric_code: string;
  metric_name: string;
  unit: string;
  timestamp: string;
  value: number;
  target_value: number | null;
}

export interface BusinessMetricSummary {
  total_metrics: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  categories: BusinessMetricCategory[];
  top_metrics: BusinessMetric[];
}

export interface BusinessMetricKpi {
  code: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  achievement_rate: number;
  period: string;
  service_name: string | null;
}

export interface BusinessMetricRequest {
  name: string;
  code: string;
  category: string;
  unit: string;
  target_value?: number | null;
  service_name?: string | null;
  description?: string | null;
}

export interface BusinessMetricQuery {
  category?: string;
  service_name?: string;
  status?: string;
  keyword?: string;
}

// ==================== SLO 类型 ====================

export interface Slo {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  service_name: string;
  slo_type: 'availability' | 'latency' | 'throughput' | 'error_rate' | string;
  target: number;
  window: string;
  current_value: number;
  compliance_rate: number;
  error_budget_total: number;
  error_budget_consumed: number;
  error_budget_remaining: number;
  burn_rate: number;
  status: 'healthy' | 'warning' | 'critical' | string;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface SloRequest {
  name: string;
  description?: string | null;
  service_name: string;
  slo_type: string;
  target: number;
  window: string;
  owner?: string | null;
}

export interface SloViolation {
  id: string;
  slo_id: string;
  slo_name: string;
  service_name: string;
  violation_type: string;
  severity: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  current_value: number;
  target_value: number;
  description: string;
  resolved: boolean;
}

export interface SloBudget {
  slo_id: string;
  slo_name: string;
  service_name: string;
  window: string;
  total_budget: number;
  consumed: number;
  remaining: number;
  remaining_percent: number;
  burn_rate_1h: number;
  burn_rate_6h: number;
  burn_rate_24h: number;
  projected_exhaustion: string | null;
  status: string;
}

export interface SloSummary {
  total_slos: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
  avg_compliance: number;
  slos: Slo[];
  recent_violations: SloViolation[];
}

export interface SloTrendPoint {
  timestamp: string;
  compliance_rate: number;
  error_budget_remaining: number;
  current_value: number;
  target_value: number;
}

export interface SloQuery {
  service_name?: string;
  slo_type?: string;
  status?: string;
  keyword?: string;
}

// ==================== 告警规则类型 ====================

export interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
  comparison_type?: string | null;
}

export interface RuleAction {
  action_type: string;
  target?: string | null;
  config: Record<string, unknown>;
}

export interface AlertRuleRecord {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  service_name: string | null;
  severity: 'critical' | 'warning' | 'info' | 'error' | string;
  condition: RuleCondition;
  actions: RuleAction[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertRuleCreateRequest {
  name: string;
  description?: string | null;
  service_name?: string | null;
  severity: string;
  condition: RuleCondition;
  actions: RuleAction[];
  enabled?: boolean;
}

// ==================== API 方法 ====================

export const metricsApi = {
  // 业务指标
  listBusinessMetrics: (
    params?: BusinessMetricQuery
  ): Promise<ApiResponse<PaginatedResponse<BusinessMetric>>> =>
    apiClient.monitor.get<PaginatedResponse<BusinessMetric>>(
      '/business-metrics',
      { params }
    ),

  getBusinessMetric: (id: string): Promise<ApiResponse<BusinessMetric>> =>
    apiClient.monitor.get<BusinessMetric>(`/business-metrics/${id}`),

  createBusinessMetric: (
    payload: BusinessMetricRequest
  ): Promise<ApiResponse<BusinessMetric>> =>
    apiClient.monitor.post<BusinessMetric>('/business-metrics', payload),

  updateBusinessMetric: (
    id: string,
    payload: BusinessMetricRequest
  ): Promise<ApiResponse<BusinessMetric>> =>
    apiClient.monitor.put<BusinessMetric>(`/business-metrics/${id}`, payload),

  deleteBusinessMetric: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.monitor.delete<{ id: string }>(`/business-metrics/${id}`),

  getBusinessMetricSummary: (): Promise<ApiResponse<BusinessMetricSummary>> =>
    apiClient.monitor.get<BusinessMetricSummary>('/business-metrics/summary'),

  getBusinessMetricTrend: (
    metricCode: string,
    period?: string
  ): Promise<ApiResponse<BusinessMetricTrend[]>> =>
    apiClient.monitor.get<BusinessMetricTrend[]>('/business-metrics/trend', {
      params: { metric_code: metricCode, period: period ?? '7d' },
    }),

  getKpiDashboard: (
    period?: string,
    serviceName?: string
  ): Promise<ApiResponse<BusinessMetricKpi[]>> =>
    apiClient.monitor.get<BusinessMetricKpi[]>('/business-metrics/kpi', {
      params: {
        period: period ?? 'monthly',
        service_name: serviceName,
      },
    }),

  // SLO / SLA
  listSlos: (params?: SloQuery): Promise<ApiResponse<PaginatedResponse<Slo>>> =>
    apiClient.monitor.get<PaginatedResponse<Slo>>('/slos', { params }),

  getSlo: (id: string): Promise<ApiResponse<Slo>> =>
    apiClient.monitor.get<Slo>(`/slos/${id}`),

  createSlo: (payload: SloRequest): Promise<ApiResponse<Slo>> =>
    apiClient.monitor.post<Slo>('/slos', payload),

  updateSlo: (id: string, payload: SloRequest): Promise<ApiResponse<Slo>> =>
    apiClient.monitor.put<Slo>(`/slos/${id}`, payload),

  deleteSlo: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.monitor.delete<{ id: string }>(`/slos/${id}`),

  getSloSummary: (): Promise<ApiResponse<SloSummary>> =>
    apiClient.monitor.get<SloSummary>('/slos/summary'),

  getSloBudget: (): Promise<ApiResponse<SloBudget[]>> =>
    apiClient.monitor.get<SloBudget[]>('/slos/budget'),

  getSloTrend: (
    sloId: string,
    period?: string
  ): Promise<ApiResponse<SloTrendPoint[]>> =>
    apiClient.monitor.get<SloTrendPoint[]>('/slos/trend', {
      params: { slo_id: sloId, period: period ?? '7d' },
    }),

  listSloViolations: (
    params?: { slo_id?: string; service_name?: string; resolved?: boolean; page?: number; page_size?: number }
  ): Promise<ApiResponse<PaginatedResponse<SloViolation>>> =>
    apiClient.monitor.get<PaginatedResponse<SloViolation>>('/slos/violations', { params }),

  resolveSloViolation: (
    id: string
  ): Promise<ApiResponse<{ id: string; resolved: boolean; resolved_at: string }>> =>
    apiClient.monitor.post<{ id: string; resolved: boolean; resolved_at: string }>(
      `/slos/violations/${id}/resolve`
    ),

  // 告警规则
  listAlertRules: (): Promise<ApiResponse<AlertRuleRecord[]>> =>
    apiClient.monitor.get<AlertRuleRecord[]>('/rules'),

  getAlertRule: (id: string): Promise<ApiResponse<AlertRuleRecord>> =>
    apiClient.monitor.get<AlertRuleRecord>(`/rules/${id}`),

  createAlertRule: (
    payload: AlertRuleCreateRequest
  ): Promise<ApiResponse<AlertRuleRecord>> =>
    apiClient.monitor.post<AlertRuleRecord>('/rules', payload),

  updateAlertRule: (
    id: string,
    payload: AlertRuleCreateRequest
  ): Promise<ApiResponse<AlertRuleRecord>> =>
    apiClient.monitor.put<AlertRuleRecord>(`/rules/${id}`, payload),

  deleteAlertRule: (id: string): Promise<ApiResponse<{ id: string }>> =>
    apiClient.monitor.delete<{ id: string }>(`/rules/${id}`),

  enableAlertRule: (id: string): Promise<ApiResponse<AlertRuleRecord>> =>
    apiClient.monitor.post<AlertRuleRecord>(`/rules/${id}/enable`),

  disableAlertRule: (id: string): Promise<ApiResponse<AlertRuleRecord>> =>
    apiClient.monitor.post<AlertRuleRecord>(`/rules/${id}/disable`),
};

export default metricsApi;
