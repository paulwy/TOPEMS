export type UXMetricType = 'CLS' | 'LCP' | 'INP' | 'FCP';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type UserSegment =
  'all' | 'desktop' | 'mobile' | 'tablet' | 'new_user' | 'returning_user' | 'power_user';

export interface UXMetric {
  id: string;
  type: UXMetricType;
  value: number;
  userSegment: UserSegment;
  timestamp: string;
  url?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UXAlert {
  id: string;
  metric: UXMetricType;
  threshold: number;
  currentValue: number;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
  status: AlertStatus;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  message?: string;
}

export interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
  previousValue?: number;
}

export interface FunnelAnalysis {
  id: string;
  name: string;
  steps: FunnelStep[];
  dropOff: Array<{ from: string; to: string; rate: number }>;
  analyzedAt: string;
  totalUsers: number;
}

export interface UXMonitorEvent {
  type: 'metric_recorded' | 'alert_created' | 'alert_resolved' | 'funnel_analyzed';
  [key: string]: unknown;
}
