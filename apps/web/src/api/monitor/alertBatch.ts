import apiClient from '../client';
import type { ApiResponse } from '../client';

export interface AlertStatistics {
  total: number;
  critical: number;
  warning: number;
  info: number;
  active: number;
  acknowledged: number;
  resolved: number;
  by_service: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  avg_resolution_time_minutes?: number;
}

export interface AlertHistoryEntry {
  id: string;
  alert_id: string;
  event_type: 'created' | 'updated' | 'acknowledged' | 'resolved' | 'escalated';
  message: string;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  created_at: string;
  created_by?: string;
}

export interface AlertTimelinePoint {
  timestamp: string;
  active_count: number;
  critical_count: number;
  warning_count: number;
  resolved_count: number;
}

export const alertBatchApi = {
  acknowledgeAlerts: (ids: string[]): Promise<ApiResponse<{ acknowledged_count: number }>> => {
    return apiClient.monitor.put('/alerts/acknowledge', { ids });
  },

  resolveAlerts: (ids: string[]): Promise<ApiResponse<{ resolved_count: number }>> => {
    return apiClient.monitor.put('/alerts/resolve', { ids });
  },

  getStatistics: (params?: {
    service_name?: string;
    severity?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<AlertStatistics>> => {
    return apiClient.monitor.get('/alerts/statistics', { params });
  },

  getHistory: (alertId: string): Promise<ApiResponse<AlertHistoryEntry[]>> => {
    return apiClient.monitor.get(`/alerts/${alertId}/history`);
  },

  getTimeline: (alertId: string): Promise<ApiResponse<AlertTimelinePoint[]>> => {
    return apiClient.monitor.get(`/alerts/${alertId}/timeline`);
  },
};

export default alertBatchApi;
