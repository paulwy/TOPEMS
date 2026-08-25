import i18n from '@/i18n';

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

const UX_THRESHOLDS: Record<
  UXMetricType,
  { good: number; needsImprovement: number; poor: number }
> = {
  CLS: { good: 0.1, needsImprovement: 0.25, poor: 0.5 },
  LCP: { good: 2500, needsImprovement: 4000, poor: 6000 },
  INP: { good: 200, needsImprovement: 500, poor: 800 },
  FCP: { good: 1800, needsImprovement: 3000, poor: 5000 },
};

const METRIC_LABELS: Record<UXMetricType, string> = {
  CLS: i18n.t('ai.ux-monitor.k0'),
  LCP: i18n.t('ai.ux-monitor.k1'),
  INP: i18n.t('ai.ux-monitor.k2'),
  FCP: i18n.t('ai.ux-monitor.k3'),
};

function generateId(): string {
  return `ux_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_USER_SEGMENTS: UserSegment[] = [
  'all',
  'desktop',
  'mobile',
  'tablet',
  'new_user',
  'returning_user',
  'power_user',
];
