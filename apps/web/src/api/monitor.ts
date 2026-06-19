import apiClient from "./client";
import type { ApiResponse } from "./client";

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  uptime: number;
  timestamp: string;
}

export interface ServiceHealth {
  service_name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  error_rate: number;
  last_checked: string;
  uptime_percentage: number;
}

export interface ApiPerformance {
  endpoint: string;
  method: string;
  avg_response_time: number;
  p95_response_time: number;
  p99_response_time: number;
  request_count: number;
  error_count: number;
  error_rate: number;
  throughput: number;
}

export interface DatabaseMetrics {
  connections: number;
  max_connections: number;
  query_count: number;
  slow_query_count: number;
  avg_query_time: number;
  cache_hit_rate: number;
}

export interface Alert {
  id: string;
  alert_type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  service_name: string;
  status: "active" | "resolved" | "acknowledged";
  created_at: string;
  resolved_at?: string;
  acknowledged_at?: string;
}

export interface AlertQueryParams {
  page?: number;
  page_size?: number;
  severity?: string;
  status?: string;
  service_name?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PerformanceReport {
  period: string;
  period_type: "hourly" | "daily" | "weekly";
  metrics: {
    avg_cpu: number;
    avg_memory: number;
    avg_latency: number;
    total_requests: number;
    total_errors: number;
    uptime: number;
  };
  services: ServiceHealth[];
  top_endpoints: ApiPerformance[];
  alerts: Alert[];
  generated_at: string;
}

export const monitorApi = {
  getSystemMetrics: async (): Promise<ApiResponse<SystemMetrics>> => {
    return apiClient.master.get<SystemMetrics>(
      "/api/monitor/metrics/system",
    );
  },

  getServiceHealth: async (): Promise<ApiResponse<ServiceHealth[]>> => {
    return apiClient.master.get<ServiceHealth[]>("/api/monitor/health");
  },

  getApiPerformance: async (): Promise<ApiResponse<ApiPerformance[]>> => {
    return apiClient.master.get<ApiPerformance[]>(
      "/api/monitor/performance/api",
    );
  },

  getDatabaseMetrics: async (): Promise<ApiResponse<DatabaseMetrics>> => {
    return apiClient.master.get<DatabaseMetrics>(
      "/api/monitor/metrics/database",
    );
  },

  listAlerts: async (
    params?: AlertQueryParams,
  ): Promise<ApiResponse<PaginatedResponse<Alert>>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.page_size)
      queryParams.append("page_size", params.page_size.toString());
    if (params?.severity) queryParams.append("severity", params.severity);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.service_name)
      queryParams.append("service_name", params.service_name);

    return apiClient.master.get<PaginatedResponse<Alert>>(
      `/api/monitor/alerts?${queryParams.toString()}`,
    );
  },

  getAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return apiClient.master.get<Alert>(`/api/monitor/alerts/${id}`);
  },

  acknowledgeAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return apiClient.master.put<Alert>(
      `/api/monitor/alerts/${id}/acknowledge`,
    );
  },

  resolveAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return apiClient.master.put<Alert>(`/api/monitor/alerts/${id}/resolve`);
  },

  getPerformanceReport: async (
    periodType?: "hourly" | "daily" | "weekly",
    period?: string,
  ): Promise<ApiResponse<PerformanceReport>> => {
    const queryParams = new URLSearchParams();
    if (periodType) queryParams.append("period_type", periodType);
    if (period) queryParams.append("period", period);

    return apiClient.master.get<PerformanceReport>(
      `/api/monitor/reports/performance?${queryParams.toString()}`,
    );
  },

  getRealtimeMetrics: async (): Promise<ApiResponse<SystemMetrics>> => {
    return apiClient.master.get<SystemMetrics>(
      "/api/monitor/metrics/realtime",
    );
  },

  health: async (): Promise<ApiResponse<string>> => {
    return apiClient.master.get<string>("/health");
  },
};
