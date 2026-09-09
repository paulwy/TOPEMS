import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface BusinessMetric {
  id: string;
  name: string;
  code?: string;
  description?: string;
  metric_type?: 'counter' | 'gauge' | 'histogram' | 'summary';
  value?: number;
  unit?: string;
  tags?: Record<string, string>;
  service_name?: string;
  updated_at?: string;
}

export interface BusinessMetricKpi {
  name: string;
  value: number;
  target?: number;
  unit?: string;
  status?: 'healthy' | 'warning' | 'critical';
  trend?: number;
}

export interface PerformanceReport {
  period: string;
  total_requests: number;
  avg_response_time_ms: number;
  error_rate: number;
  apdex_score?: number;
  by_endpoint?: Array<{
    endpoint: string;
    method: string;
    avg_time_ms: number;
    request_count: number;
    error_count: number;
  }>;
}

interface Slos {
  id?: string;
  name: string;
  target_percentage: number;
  current_percentage?: number;
  burn_rate?: number;
  status?: 'met' | 'at_risk' | 'breached';
  error_budget_remaining?: number;
  description?: string;
}

interface SlosBudget {
  total_error_budget: number;
  consumed: number;
  remaining: number;
  burn_rate_current?: number;
  burn_rate_forecast?: number;
}

export const businessMetricApi = {
  list: (params?: {
    service_name?: string;
    metric_type?: string;
  }): Promise<ApiResponse<BusinessMetric[]>> => {
    return apiClient.monitor.get('/business-metrics', { params });
  },

  get: (id: string): Promise<ApiResponse<BusinessMetric>> => {
    return apiClient.monitor.get(`/business-metrics/${id}`);
  },

  create: (data: Partial<BusinessMetric>): Promise<ApiResponse<BusinessMetric>> => {
    return apiClient.monitor.post('/business-metrics', data);
  },

  update: (id: string, data: Partial<BusinessMetric>): Promise<ApiResponse<BusinessMetric>> => {
    return apiClient.monitor.put(`/business-metrics/${id}`, data);
  },

  getKpi: (params?: { service_name?: string }): Promise<ApiResponse<BusinessMetricKpi[]>> => {
    return apiClient.monitor.get('/business-metrics/kpi', { params });
  },

  getSummary: (params?: { period?: string }): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.get('/business-metrics/summary', { params });
  },

  getTrend: (params?: {
    metric_name?: string;
    interval?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<Array<{ timestamp: string; value: number }>>> => {
    return apiClient.monitor.get('/business-metrics/trend', { params });
  },

  getHealth: (): Promise<ApiResponse<{ status: string; services: Record<string, string> }>> => {
    return apiClient.monitor.get('/health');
  },

  getMetrics: (
    type: 'system' | 'database' | 'realtime'
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.get(`/metrics/${type}`);
  },

  getPerformanceApi: (params?: {
    endpoint?: string;
    period?: string;
  }): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.get('/performance/api', { params });
  },

  getPerformanceReport: (params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<PerformanceReport>> => {
    return apiClient.monitor.get('/reports/performance', { params });
  },

  listAlerts: (params?: {
    status?: string;
    severity?: string;
  }): Promise<ApiResponse<Record<string, unknown>[]>> => {
    return apiClient.monitor.get('/alerts', { params });
  },

  acknowledgeAlert: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post(`/alerts/${id}/acknowledge`, {});
  },

  dismissAlert: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post(`/alerts/${id}/dismiss`, {});
  },

  escalateAlert: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post(`/alerts/${id}/escalate`, {});
  },

  resolveAlert: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post(`/alerts/${id}/resolve`, {});
  },

  listRules: (params?: { status?: string }): Promise<ApiResponse<Record<string, unknown>[]>> => {
    return apiClient.monitor.get('/rules', { params });
  },

  createRule: (data: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post('/rules', data);
  },

  getRule: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.get(`/rules/${id}`);
  },

  updateRule: (
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.put(`/rules/${id}`, data);
  },

  deleteRule: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.monitor.delete(`/rules/${id}`);
  },

  enableRule: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post(`/rules/${id}/enable`, {});
  },

  disableRule: (id: string): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.post(`/rules/${id}/disable`, {});
  },

  listSlos: (params?: { status?: string }): Promise<ApiResponse<Slos[]>> => {
    return apiClient.monitor.get('/slos', { params });
  },

  createSlos: (data: Partial<Slos>): Promise<ApiResponse<Slos>> => {
    return apiClient.monitor.post('/slos', data);
  },

  getSlos: (id: string): Promise<ApiResponse<Slos>> => {
    return apiClient.monitor.get(`/slos/${id}`);
  },

  updateSlos: (id: string, data: Partial<Slos>): Promise<ApiResponse<Slos>> => {
    return apiClient.monitor.put(`/slos/${id}`, data);
  },

  getSlosBudget: (): Promise<ApiResponse<SlosBudget>> => {
    return apiClient.monitor.get('/slos/budget');
  },

  getSlosSummary: (): Promise<ApiResponse<Record<string, unknown>>> => {
    return apiClient.monitor.get('/slos/summary');
  },

  getSlosTrend: (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<Array<{ timestamp: string; value: number }>>> => {
    return apiClient.monitor.get('/slos/trend', { params });
  },

  resolveSloViolation: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.monitor.post(`/slos/violations/${id}/resolve`, {});
  },
};

export default businessMetricApi;
