import apiClient, { downloadBlob } from '../client';
import type { ApiResponse } from '../client';

export interface ServicePerformance {
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_percentage: number;
  avg_response_time: number;
  p95_response_time: number;
  error_rate: number;
  request_count: number;
  total_incidents?: number;
  sla_compliance?: number;
}

export interface PerformanceSummary {
  total_requests: number;
  avg_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  error_rate: number;
  total_errors: number;
  uptime_percentage: number;
  services: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  by_endpoint?: Array<{
    endpoint: string;
    method: string;
    avg_time: number;
    error_count: number;
    request_count: number;
  }>;
}

export interface PerformanceTrendPoint {
  timestamp: string;
  avg_response_time: number;
  p95_response_time: number;
  request_count: number;
  error_count: number;
  error_rate: number;
}

export interface SlowQuery {
  id: string;
  query: string;
  database: string;
  duration_ms: number;
  timestamp: string;
  rows_scanned?: number;
  execution_plan?: string;
  service_name?: string;
  normalized_query?: string;
}

export const performanceExtendedApi = {
  getServices: (params?: {
    service_name?: string;
    status?: string;
  }): Promise<ApiResponse<ServicePerformance[]>> => {
    return apiClient.monitor.get('/performance/services', { params });
  },

  getSummary: (params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<PerformanceSummary>> => {
    return apiClient.monitor.get('/performance/summary', { params });
  },

  getTrend: (params?: {
    endpoint?: string;
    service_name?: string;
    interval?: '1m' | '5m' | '15m' | '1h' | '1d';
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<PerformanceTrendPoint[]>> => {
    return apiClient.monitor.get('/performance/trend', { params });
  },

  getSlowQueries: (params?: {
    database?: string;
    min_duration_ms?: number;
    limit?: number;
  }): Promise<ApiResponse<SlowQuery[]>> => {
    return apiClient.monitor.get('/performance/slow-queries', { params });
  },

  exportReport: (params?: {
    format?: 'csv' | 'json' | 'pdf';
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<Blob> => {
    return downloadBlob('monitor', '/performance/export', {
      params: params as unknown as Record<string, unknown>,
    });
  },
};

export default performanceExtendedApi;