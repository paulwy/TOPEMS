/**
 * Monitor · 监控仪表盘 API 绑定
 *
 * 后端: svc/monitor/src/modules/monitor/metrics.rs
 * 路由:
 *   GET    /performance/summary
 *   GET    /performance/trend
 *   GET    /performance/services
 *   GET    /performance/slow-queries
 *   POST   /performance/export
 *   GET    /metrics/realtime
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface PerformanceSummary {
  period: string;
  period_type: 'hour' | 'day' | 'week' | 'month';
  total_requests: number;
  total_errors: number;
  error_rate: number;
  avg_response_time: number;
  p50_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  uptime_percentage: number;
  active_alerts: number;
  critical_alerts: number;
  degraded_services: number;
  sla_compliance: number;
}

export interface PerformanceTrendPoint {
  timestamp: string;
  requests: number;
  errors: number;
  avg_response_time: number;
  p99_response_time: number;
  error_rate: number;
  active_alerts: number;
}

export interface ServicePerformance {
  service_name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime_percentage: number;
  avg_response_time: number;
  error_rate: number;
  request_count: number;
  last_check: string;
  sla_percentage?: number;
  version?: string;
  dependencies?: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
  }>;
}

export interface SlowQuery {
  id: string;
  query: string;
  database: string;
  duration_ms: number;
  rows_examined: number;
  rows_returned: number;
  timestamp: string;
  user?: string;
  query_hash?: string;
  normalized_query?: string;
}

export interface RealtimeMetrics {
  timestamp: string;
  cpu: {
    usage_percent: number;
    load_1m: number;
    load_5m: number;
    load_15m: number;
  };
  memory: {
    total_mb: number;
    used_mb: number;
    free_mb: number;
    usage_percent: number;
  };
  network: {
    inbound_bps: number;
    outbound_bps: number;
    connections: number;
  };
  database: {
    active_connections: number;
    idle_connections: number;
    queries_per_second: number;
    slow_queries_per_minute: number;
  };
  requests: {
    per_second: number;
    error_rate: number;
    avg_response_time: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
  };
}

export const dashboardApi = {
  getPerformanceSummary: async (params?: {
    period?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<ApiResponse<PerformanceSummary>> => {
    return apiClient.monitor.get('/performance/summary', { params });
  },

  getPerformanceTrend: async (params?: {
    from?: string;
    to?: string;
    granularity?: 'minute' | 'hour' | 'day';
  }): Promise<ApiResponse<PerformanceTrendPoint[]>> => {
    return apiClient.monitor.get('/performance/trend', { params });
  },

  getServicePerformance: async (): Promise<ApiResponse<ServicePerformance[]>> => {
    return apiClient.monitor.get('/performance/services');
  },

  getSlowQueries: async (params?: {
    limit?: number;
    database?: string;
  }): Promise<ApiResponse<SlowQuery[]>> => {
    return apiClient.monitor.get('/performance/slow-queries', { params });
  },

  exportPerformance: async (params: {
    format: 'csv' | 'json' | 'pdf';
    from?: string;
    to?: string;
    metrics?: string[];
  }): Promise<ApiResponse<{ download_url: string }>> => {
    return apiClient.monitor.post('/performance/export', params);
  },

  getRealtimeMetrics: async (): Promise<ApiResponse<RealtimeMetrics>> => {
    return apiClient.monitor.get('/metrics/realtime');
  },
};

export default dashboardApi;
