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
