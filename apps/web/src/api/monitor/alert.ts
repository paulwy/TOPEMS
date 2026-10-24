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

export interface AlertTimelinePoint {
  timestamp: string;
  event: string;
  severity?: AlertSeverity;
  value?: number;
  threshold?: number;
  note?: string;
}
