import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface Threshold {
  id: string;
  metric_name: string;
  metric_code?: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  warning_value: number;
  critical_value: number;
  unit?: string;
  service_name?: string;
  evaluation_interval_seconds?: number;
  comparison_window_seconds?: number;
  status?: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ThresholdEvaluateResult {
  metric_name: string;
  current_value: number;
  status: 'normal' | 'warning' | 'critical';
  warning_threshold: number;
  critical_threshold: number;
  exceeded_by?: number;
}

export const thresholdApi = {
  list: (params?: {
    metric_name?: string;
    service_name?: string;
    status?: string;
  }): Promise<ApiResponse<Threshold[]>> => {
    return apiClient.monitor.get('/thresholds', { params });
  },

  get: (id: string): Promise<ApiResponse<Threshold>> => {
    return apiClient.monitor.get(`/thresholds/${id}`);
  },

  create: (data: Partial<Threshold>): Promise<ApiResponse<Threshold>> => {
    return apiClient.monitor.post('/thresholds', data);
  },

  update: (id: string, data: Partial<Threshold>): Promise<ApiResponse<Threshold>> => {
    return apiClient.monitor.put(`/thresholds/${id}`, data);
  },

  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.monitor.delete(`/thresholds/${id}`);
  },

  evaluate: (data: {
    metric_name: string;
    current_value: number;
    warning_value: number;
    critical_value: number;
  }): Promise<ApiResponse<ThresholdEvaluateResult>> => {
    return apiClient.monitor.post('/thresholds/evaluate', data);
  },
};

export default thresholdApi;
