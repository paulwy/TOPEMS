import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated';
export type AlertType =
  'security' | 'performance' | 'system' | 'business' | 'compliance' | 'integration';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  level: string;
  status: AlertStatus;
  title: string;
  description: string;
  message: string;
  source?: string;
  source_id?: string;
  affected_users?: string[];
  affected_services?: string[];
  metadata?: Record<string, unknown>;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertQueryParams {
  page?: number;
  page_size?: number;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  source?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  format?: string;
}

interface PaginatedAlerts {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
}

export interface AlertStats {
  total_alerts: number;
  pending_alerts: number;
  pending_count: number;
  today_count: number;
  resolved_count: number;
  rule_count: number;
  acknowledged_alerts: number;
  resolved_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  medium_alerts: number;
  low_alerts: number;
  byType: Array<{ type: AlertType; count: number }>;
  bySeverity: Array<{ severity: AlertSeverity; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  trend: Array<{ date: string; count: number }>;
  mttr: number;
  avg_response_time: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  type: AlertType;
  severity: AlertSeverity;
  level: string;
  condition: string;
  threshold?: number;
  window_seconds?: number;
  notification_channels: Array<'email' | 'sms' | 'webhook' | 'system' | 'internal'>;
  notification_targets?: string[];
  enabled: boolean;
  mute_until?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  type: AlertType;
  severity: AlertSeverity;
  condition: string;
  threshold?: number;
  window_seconds?: number;
  notification_channels: Array<'email' | 'sms' | 'webhook' | 'system' | 'internal'>;
  notification_targets?: string[];
  enabled?: boolean;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  condition?: string;
  threshold?: number;
  window_seconds?: number;
  notification_channels?: Array<'email' | 'sms' | 'webhook' | 'system' | 'internal'>;
  notification_targets?: string[];
  enabled?: boolean;
  mute_until?: string;
}

interface SystemMetric {
  id: string;
  name: string;
  category: string;
  value: number;
  unit?: string;
  status: 'normal' | 'warning' | 'critical';
  threshold_warning?: number;
  threshold_critical?: number;
  timestamp: string;
}

export interface SystemHealth {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency_ms?: number;
    error_rate?: number;
    uptime_percent?: number;
  }>;
  metrics: SystemMetric[];
  last_check: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_latency?: number;
  api_requests?: number;
  average_response_time?: number;
  error_rate?: number;
  online_users?: number;
}

export const monitoringApi = {
  listAlerts: async (params?: AlertQueryParams): Promise<ApiResponse<PaginatedAlerts>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.source) queryParams.append('source', params.source);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.monitor.get<PaginatedAlerts>(`/alerts?${queryParams.toString()}`);
  },

  getAlert: async (id: string): Promise<ApiResponse<Alert>> => {
    return apiClient.monitor.get<Alert>(`/alerts/${id}`);
  },

  acknowledgeAlert: async (id: string, data?: { note?: string }): Promise<ApiResponse<Alert>> => {
    return apiClient.monitor.post(`/alerts/acknowledge`, {
      alert_ids: [id],
      ...data,
    });
  },

  resolveAlert: async (id: string, data?: { note?: string }): Promise<ApiResponse<Alert>> => {
    return apiClient.monitor.post(`/alerts/resolve`, {
      alert_ids: [id],
      ...data,
    });
  },

  escalateAlert: async (
    id: string,
    data?: { reason?: string; target_users?: string[] }
  ): Promise<ApiResponse<Alert>> => {
    return apiClient.monitor.post(`/alerts/${id}/escalate`, data);
  },

  dismissAlert: async (id: string, data?: { reason?: string }): Promise<ApiResponse<Alert>> => {
    return apiClient.monitor.post(`/alerts/${id}/dismiss`, data);
  },

  getAlertStats: async (params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<AlertStats>> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);

    return apiClient.monitor.get<AlertStats>(`/alerts/statistics?${queryParams.toString()}`);
  },

  exportAlerts: async (params?: AlertQueryParams): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.source) queryParams.append('source', params.source);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.monitor.get(`/alerts/export?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data as unknown as Blob;
  },

  listAlertRules: async (params?: {
    page?: number;
    page_size?: number;
    type?: AlertType;
    enabled?: boolean;
    search?: string;
  }): Promise<
    ApiResponse<{ items: AlertRule[]; total: number; page: number; page_size: number }>
  > => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.enabled !== undefined) queryParams.append('enabled', params.enabled.toString());
    if (params?.search) queryParams.append('search', params.search);

    return apiClient.monitor.get(`/rules?${queryParams.toString()}`);
  },

  getAlertRule: async (id: string): Promise<ApiResponse<AlertRule>> => {
    return apiClient.monitor.get<AlertRule>(`/rules/${id}`);
  },

  createAlertRule: async (data: CreateAlertRuleRequest): Promise<ApiResponse<AlertRule>> => {
    return apiClient.monitor.post('/rules', data);
  },

  updateAlertRule: async (
    id: string,
    data: UpdateAlertRuleRequest
  ): Promise<ApiResponse<AlertRule>> => {
    return apiClient.monitor.put(`/rules/${id}`, data);
  },

  deleteAlertRule: async (id: string): Promise<ApiResponse<string>> => {
    return apiClient.monitor.delete(`/rules/${id}`);
  },

  enableAlertRule: async (id: string): Promise<ApiResponse<AlertRule>> => {
    return apiClient.monitor.post(`/rules/${id}/enable`);
  },

  disableAlertRule: async (id: string): Promise<ApiResponse<AlertRule>> => {
    return apiClient.monitor.post(`/rules/${id}/disable`);
  },

  getSystemHealth: async (): Promise<ApiResponse<SystemHealth>> => {
    return apiClient.monitor.get('/health');
  },

  getSystemMetrics: async (params?: {
    category?: string;
    limit?: number;
  }): Promise<ApiResponse<SystemMetric[]>> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient.monitor.get(`/metrics?${queryParams.toString()}`);
  },

  triggerTestAlert: async (data: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    description: string;
  }): Promise<ApiResponse<Alert>> => {
    return apiClient.monitor.post('/alerts/test', data);
  },
};

export default monitoringApi;
