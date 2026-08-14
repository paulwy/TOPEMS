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

class UXMonitorImpl {
  private metrics: Map<string, UXMetric> = new Map();
  private alerts: Map<string, UXAlert> = new Map();
  private listeners: Set<(event: UXMonitorEvent) => void> = new Set();
  private segmentData: Map<UserSegment, UXMetric[]> = new Map();
  private thresholds: Record<UXMetricType, number>;

  constructor() {
    this.thresholds = {
      CLS: UX_THRESHOLDS.CLS.needsImprovement,
      LCP: UX_THRESHOLDS.LCP.needsImprovement,
      INP: UX_THRESHOLDS.INP.needsImprovement,
      FCP: UX_THRESHOLDS.FCP.needsImprovement,
    };
    this.initializeSegmentData();
    this.seedSampleData();
  }

  private initializeSegmentData(): void {
    for (const segment of DEFAULT_USER_SEGMENTS) {
      this.segmentData.set(segment, []);
    }
  }

  private seedSampleData(): void {
    const urls = [
      '/dashboard',
      '/crm/customers',
      '/pm/projects',
      '/hrm/employees',
      '/reports/analytics',
    ];
    const segments: UserSegment[] = ['desktop', 'mobile', 'new_user', 'returning_user'];
    const types: UXMetricType[] = ['CLS', 'LCP', 'INP', 'FCP'];

    for (let i = 0; i < 30; i++) {
      const now = Date.now() - i * 60000;
      for (const type of types) {
        for (const segment of segments) {
          const baseValue =
            type === 'CLS'
              ? 0.05 + Math.random() * 0.3
              : type === 'LCP'
                ? 1500 + Math.random() * 3000
                : type === 'INP'
                  ? 100 + Math.random() * 400
                  : 800 + Math.random() * 2500;

          const metric: UXMetric = {
            id: generateId(),
            type,
            value: Math.round(baseValue * 100) / 100,
            userSegment: segment,
            timestamp: new Date(now).toISOString(),
            url: urls[Math.floor(Math.random() * urls.length)],
            sessionId: `session-${i}-${segment}`,
          };

          this.metrics.set(metric.id, metric);
          const segData = this.segmentData.get(segment) || [];
          segData.push(metric);
          this.segmentData.set(segment, segData);
        }
      }
    }
  }

  on(listener: (event: UXMonitorEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: UXMonitorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore
      }
    }
  }

  recordMetric(
    type: UXMetricType,
    value: number,
    userSegment?: UserSegment,
    url?: string
  ): UXMetric {
    const metric: UXMetric = {
      id: generateId(),
      type,
      value: Math.round(value * 1000) / 1000,
      userSegment: userSegment || 'all',
      timestamp: new Date().toISOString(),
      url,
      sessionId: `session-${Date.now()}`,
    };

    this.metrics.set(metric.id, metric);

    const segData = this.segmentData.get(metric.userSegment) || [];
    segData.push(metric);
    if (segData.length > 500) {
      segData.splice(0, segData.length - 500);
    }
    this.segmentData.set(metric.userSegment, segData);

    this.emit({ type: 'metric_recorded', metricId: metric.id });

    this.checkThreshold(metric);

    return metric;
  }

  private checkThreshold(metric: UXMetric): void {
    const threshold = this.thresholds[metric.type];
    if (metric.value > threshold) {
      const userImpact = this.calculateUserImpact(metric);
      const alert: UXAlert = {
        id: generateId(),
        metric: metric.type,
        threshold,
        currentValue: metric.value,
        userImpact,
        status: 'active',
        createdAt: new Date().toISOString(),
        message: `${METRIC_LABELS[metric.type]}${i18n.t('ai.ux-monitor.k0')}${metric.value.toFixed(2)} > ${threshold}`,
      };
      this.alerts.set(alert.id, alert);
      this.emit({ type: 'alert_created', alertId: alert.id, metric: metric.type });
    }
  }

  private calculateUserImpact(metric: UXMetric): 'low' | 'medium' | 'high' | 'critical' {
    const thresholds = UX_THRESHOLDS[metric.type];
    const ratio = metric.value / thresholds.good;
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }

  getMetrics(filters?: { type?: UXMetricType; segment?: UserSegment; limit?: number }): UXMetric[] {
    let result = Array.from(this.metrics.values());
    if (filters?.type) result = result.filter((m) => m.type === filters.type);
    if (filters?.segment && filters.segment !== 'all') {
      result = result.filter((m) => m.userSegment === filters.segment);
    }
    result = result.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filters?.limit) result = result.slice(0, filters.limit);
    return result;
  }

  getUserSegments(): UserSegment[] {
    return [...DEFAULT_USER_SEGMENTS];
  }

  createAlert(
    metric: UXMetricType,
    threshold: number,
    userImpact?: 'low' | 'medium' | 'high' | 'critical'
  ): UXAlert {
    const recentMetrics = this.getMetrics({ type: metric, limit: 1 });
    const currentValue = recentMetrics.length > 0 ? recentMetrics[0].value : 0;

    const alert: UXAlert = {
      id: generateId(),
      metric,
      threshold,
      currentValue,
      userImpact:
        userImpact ||
        this.calculateUserImpact({
          id: '',
          type: metric,
          value: currentValue,
          userSegment: 'all',
          timestamp: new Date().toISOString(),
        }),
      status: 'active',
      createdAt: new Date().toISOString(),
      message: `${i18n.t('ai.ux-monitor.k1')}${METRIC_LABELS[metric]}${i18n.t('ai.ux-monitor.k2')}${threshold}`,
    };

    this.alerts.set(alert.id, alert);
    this.emit({ type: 'alert_created', alertId: alert.id, metric });
    return alert;
  }

  getAlerts(status?: AlertStatus): UXAlert[] {
    let result = Array.from(this.alerts.values());
    if (status) result = result.filter((a) => a.status === status);
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = new Date().toISOString();
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date().toISOString();
    }
  }

  getUxDashboard(): {
    scores: Record<UXMetricType, { value: number; rating: string; threshold: number }>;
    alerts: UXAlert[];
    totalMetrics: number;
    segmentCoverage: Record<UserSegment, number>;
    recentMetrics: UXMetric[];
  } {
    const scores: Record<UXMetricType, { value: number; rating: string; threshold: number }> = {
      CLS: { value: 0, rating: 'N/A', threshold: this.thresholds.CLS },
      LCP: { value: 0, rating: 'N/A', threshold: this.thresholds.LCP },
      INP: { value: 0, rating: 'N/A', threshold: this.thresholds.INP },
      FCP: { value: 0, rating: 'N/A', threshold: this.thresholds.FCP },
    };

    for (const type of Object.keys(scores) as UXMetricType[]) {
      const recent = this.getMetrics({ type, limit: 10 });
      if (recent.length > 0) {
        const avg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
        const thresholds = UX_THRESHOLDS[type];
        let rating = 'good';
        if (avg > thresholds.poor) rating = 'poor';
        else if (avg > thresholds.needsImprovement) rating = 'needs-improvement';
        scores[type] = {
          value: Math.round(avg * 1000) / 1000,
          rating,
          threshold: this.thresholds[type],
        };
      }
    }

    const segmentCoverage: Record<UserSegment, number> = {
      all: 0,
      desktop: 0,
      mobile: 0,
      tablet: 0,
      new_user: 0,
      returning_user: 0,
      power_user: 0,
    };

    for (const segment of DEFAULT_USER_SEGMENTS) {
      segmentCoverage[segment] = (this.segmentData.get(segment) || []).length;
    }

    return {
      scores,
      alerts: this.getAlerts('active'),
      totalMetrics: this.metrics.size,
      segmentCoverage,
      recentMetrics: this.getMetrics({ limit: 20 }),
    };
  }

  getFunnelAnalysis(steps?: string[]): FunnelAnalysis {
    const defaultSteps = steps || [i18n.t('ai.ux-monitor.k8'), i18n.t('ai.ux-monitor.k7'), i18n.t('ai.ux-monitor.k6'), i18n.t('ai.ux-monitor.k5'), i18n.t('ai.ux-monitor.k4')];
    const values = defaultSteps.map((_, i) => {
      if (i === 0) return 10000 + Math.floor(Math.random() * 2000);
      const prev = 10000 * Math.pow(0.75, i);
      return Math.floor(prev * (0.8 + Math.random() * 0.4));
    });

    const maxValue = values[0];
    const funnelSteps: FunnelStep[] = defaultSteps.map((name, i) => ({
      name,
      value: values[i],
      percentage: Math.round((values[i] / maxValue) * 10000) / 100,
      ...(i > 0 && { previousValue: values[i - 1] }),
    }));

    const dropOff: Array<{ from: string; to: string; rate: number }> = [];
    for (let i = 1; i < defaultSteps.length; i++) {
      const rate = Math.round(((values[i - 1] - values[i]) / values[i - 1]) * 10000) / 100;
      dropOff.push({
        from: defaultSteps[i - 1],
        to: defaultSteps[i],
        rate,
      });
    }

    const analysis: FunnelAnalysis = {
      id: generateId(),
      name: i18n.t('ai.ux-monitor.k9'),
      steps: funnelSteps,
      dropOff,
      analyzedAt: new Date().toISOString(),
      totalUsers: maxValue,
    };

    this.emit({ type: 'funnel_analyzed', analysisId: analysis.id });
    return analysis;
  }

  setThreshold(metric: UXMetricType, threshold: number): void {
    this.thresholds[metric] = threshold;
  }

  getThresholds(): Record<UXMetricType, number> {
    return { ...this.thresholds };
  }
}

export class UXMonitor {
  private static instance: UXMonitorImpl;

  static getInstance(): UXMonitorImpl {
    if (!UXMonitor.instance) {
      UXMonitor.instance = new UXMonitorImpl();
    }
    return UXMonitor.instance;
  }
}

export const uxMonitor = UXMonitor.getInstance();
