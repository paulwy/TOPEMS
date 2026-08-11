/**
 * Monitor · 告警增强管理 API 绑定
 *
 * 后端: svc/monitor/src/modules/monitor/alerts.rs
 * 路由:
 *   GET    /alerts/statistics
 *   POST   /alerts/acknowledge
 *   POST   /alerts/resolve
 *   GET    /alerts/{id}/history
 *   GET    /alerts/{id}/timeline
 *   POST   /alerts/bulk-acknowledge
 *   POST   /alerts/bulk-resolve
 *   DELETE /alerts/{id}
 */

import apiClient from '../client';
import type { ApiResponse } from '../client';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged' | 'suppressed';

export interface AlertDetail {
  id: string;
  tenant_id?: string;
  alert_type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  service_name: string;
  component?: string;
  metric_name?: string;
  metric_value?: number;
  threshold?: number;
  status: AlertStatus;
  source: 'monitor' | 'manual' | 'api' | 'synthetic';
  metadata?: Record<string, unknown>;
  acknowledged_by?: string;
  resolved_by?: string;
  resolved_reason?: string;
  parent_alert_id?: string;
  related_alert_ids?: string[];
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface AlertStatistics {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  suppressed: number;
  critical: number;
  warning: number;
  info: number;
  by_service: Array<{
    service_name: string;
    total: number;
    critical: number;
    active: number;
  }>;
  by_severity: Array<{
    severity: AlertSeverity;
    count: number;
  }>;
  by_status: Array<{
    status: AlertStatus;
    count: number;
  }>;
  trend: Array<{
    date: string;
    total: number;
    critical: number;
    warning: number;
    info: number;
  }>;
}

export interface AlertHistoryEvent {
  id: string;
  alert_id: string;
  event_type:
    | 'created'
    | 'updated'
    | 'acknowledged'
    | 'resolved'
    | 'suppressed'
    | 'escalated'
    | 'routed'
    | 'triggered';
  from_status?: AlertStatus;
  to_status?: AlertStatus;
  note?: string;
  user_id?: string;
  user_name?: string;
  created_at: string;
}

export interface AlertTimelinePoint {
  timestamp: string;
  event: string;
  severity?: AlertSeverity;
  value?: number;
  threshold?: number;
  note?: string;
}

export interface BulkAcknowledgeRequest {
  alert_ids: string[];
  note?: string;
}

export interface BulkResolveRequest {
  alert_ids: string[];
  reason?: string;
}

export const alertApi = {
  listAlerts: async (params?: {
    severity?: AlertSeverity;
    status?: AlertStatus;
    service_name?: string;
    page?: number;
    page_size?: number;
  }): Promise<ApiResponse<{ items: AlertDetail[]; total: number }>> => {
    return apiClient.monitor.get('/alerts', { params });
  },

  getAlert: async (id: string): Promise<ApiResponse<AlertDetail>> => {
    return apiClient.monitor.get(`/alerts/${id}`);
  },

  updateAlert: async (
    id: string,
    data: Partial<AlertDetail>
  ): Promise<ApiResponse<AlertDetail>> => {
    return apiClient.monitor.post(`/alerts/${id}`, data);
  },

  deleteAlert: async (id: string): Promise<ApiResponse<{ deleted: boolean }>> => {
    return apiClient.monitor.delete(`/alerts/${id}`);
  },

  getStatistics: async (params?: {
    period?: 'day' | 'week' | 'month';
    service_name?: string;
  }): Promise<ApiResponse<AlertStatistics>> => {
    return apiClient.monitor.get('/alerts/statistics', { params });
  },

  acknowledgeAlert: async (id: string, note?: string): Promise<ApiResponse<AlertDetail>> => {
    return apiClient.monitor.post(`/alerts/${id}/acknowledge`, { note });
  },

  resolveAlert: async (id: string, reason?: string): Promise<ApiResponse<AlertDetail>> => {
    return apiClient.monitor.post(`/alerts/${id}/resolve`, { reason });
  },

  bulkAcknowledge: async (
    data: BulkAcknowledgeRequest
  ): Promise<ApiResponse<{ acknowledged: number }>> => {
    return apiClient.monitor.post('/alerts/acknowledge', data);
  },

  bulkResolve: async (data: BulkResolveRequest): Promise<ApiResponse<{ resolved: number }>> => {
    return apiClient.monitor.post('/alerts/resolve', data);
  },

  getHistory: async (alertId: string): Promise<ApiResponse<AlertHistoryEvent[]>> => {
    return apiClient.monitor.get(`/alerts/${alertId}/history`);
  },

  getTimeline: async (alertId: string): Promise<ApiResponse<AlertTimelinePoint[]>> => {
    return apiClient.monitor.get(`/alerts/${alertId}/timeline`);
  },
};

export default alertApi;
