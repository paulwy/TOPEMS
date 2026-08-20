/**
 * Monitor · SLO (服务等级目标) API 绑定
 *
 * 后端: svc/monitor/src/modules/monitor/slo.rs
 * 路由:
 *   GET    /slos
 *   POST   /slos
 *   GET    /slos/{id}
 *   PUT    /slos/{id}
 *   DELETE /slos/{id}
 *   GET    /slos/summary
 *   GET    /slos/budget
 *   GET    /slos/trend
 *   GET    /slos/violations
 *   POST   /slos/violations/{id}/resolve
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type SloType = 'availability' | 'latency' | 'accuracy' | 'throughput';
export type SloDirection = 'above' | 'below';
export type SloStatus = 'active' | 'paused' | 'archived';
export type SloBudgetStatus = 'healthy' | 'warning' | 'critical' | 'exhausted';

export interface Slo {
  id: string;
  tenant_id?: string;
  name: string;
  description?: string;
  slo_type: SloType;
  service_name: string;
  target_percentage: number;
  direction: SloDirection;
  current_value: number;
  status: SloStatus;
  window_start?: string;
  window_end?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SloSummary {
  total: number;
  active: number;
  paused: number;
  healthy: number;
  warning: number;
  critical: number;
  by_service: Array<{
    service_name: string;
    total_slos: number;
    healthy: number;
    warning: number;
    critical: number;
  }>;
  average_compliance: number;
}

export interface SloBudget {
  id: string;
  slo_id: string;
  period: string;
  total_budget: number;
  consumed_budget: number;
  remaining_budget: number;
  status: SloBudgetStatus;
  burn_rate: number;
  burn_rate_7d: number;
  burn_rate_30d: number;
  forecast_exhaustion?: string;
}

export interface SloTrendPoint {
  timestamp: string;
  value: number;
  target: number;
  budget_consumed: number;
  violation: boolean;
  note?: string;
}

export interface SloViolation {
  id: string;
  slo_id: string;
  slo_name: string;
  slo_type: SloType;
  service_name: string;
  violation_start: string;
  violation_end?: string;
  duration_minutes: number;
  value: number;
  target: number;
  severity: 'minor' | 'major' | 'critical';
  root_cause?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

interface CreateSloRequest {
  name: string;
  description?: string;
  slo_type: SloType;
  service_name: string;
  target_percentage: number;
  direction: SloDirection;
  tags?: string[];
}

export const sloApi = {
  listSlos: async (params?: {
    slo_type?: SloType;
    service_name?: string;
    status?: SloStatus;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: Slo[]; total: number }>> => {
    return apiClient.monitor.get('/slos', { params });
  },

  getSlo: async (id: string): Promise<ApiResponse<Slo>> => {
    return apiClient.monitor.get(`/slos/${id}`);
  },

  createSlo: async (data: CreateSloRequest): Promise<ApiResponse<Slo>> => {
    return apiClient.monitor.post('/slos', data);
  },

  updateSlo: async (id: string, data: Partial<CreateSloRequest>): Promise<ApiResponse<Slo>> => {
    return apiClient.monitor.put(`/slos/${id}`, data);
  },

  deleteSlo: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.monitor.delete(`/slos/${id}`);
  },

  getSummary: async (): Promise<ApiResponse<SloSummary>> => {
    return apiClient.monitor.get('/slos/summary');
  },

  getBudget: async (params?: {
    slo_id?: string;
    period?: string;
  }): Promise<ApiResponse<SloBudget[]>> => {
    return apiClient.monitor.get('/slos/budget', { params });
  },

  getTrend: async (params?: {
    slo_id?: string;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<SloTrendPoint[]>> => {
    return apiClient.monitor.get('/slos/trend', { params });
  },

  listViolations: async (params?: {
    slo_id?: string;
    service_name?: string;
    resolved?: boolean;
    severity?: 'minor' | 'major' | 'critical';
  }): Promise<ApiResponse<SloViolation[]>> => {
    return apiClient.monitor.get('/slos/violations', { params });
  },

  resolveViolation: async (
    violationId: string,
    data: { root_cause?: string }
  ): Promise<ApiResponse<SloViolation>> => {
    return apiClient.monitor.post(`/slos/violations/${violationId}/resolve`, data);
  },
};

export default sloApi;
