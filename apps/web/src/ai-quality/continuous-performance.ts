export type RegressionSeverity = 'info' | 'warning' | 'critical';

export interface PerfMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface PerfBaseline {
  id: string;
  metrics: Record<string, number>;
  createdAt: string;
  version: string;
  name?: string;
  description?: string;
  environment?: string;
}

export interface PerfRegression {
  id: string;
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  severity: RegressionSeverity;
  detectedAt: string;
  threshold?: number;
  trend?: 'improving' | 'stable' | 'degrading';
  history?: Array<{ timestamp: string; value: number }>;
}

export interface PerfAlert {
  id: string;
  regressionId: string;
  message: string;
  severity: RegressionSeverity;
  acknowledged: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface PerfTrendPoint {
  timestamp: string;
  metric: string;
  value: number;
  baseline: number;
}

export interface ContinuousPerfEvent {
  type: 'baseline_set' | 'regression_detected' | 'alert_triggered' | 'measurement_recorded';
  [key: string]: unknown;
}

function generateId(): string {
  return `perf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_METRICS = [
  { name: 'page_load_time', value: 1200, unit: 'ms' },
  { name: 'first_contentful_paint', value: 800, unit: 'ms' },
  { name: 'time_to_interactive', value: 2500, unit: 'ms' },
  { name: 'bundle_size', value: 256, unit: 'KB' },
  { name: 'api_response_time', value: 350, unit: 'ms' },
  { name: 'memory_usage', value: 128, unit: 'MB' },
  { name: 'render_count', value: 12, unit: '次' },
  { name: 'error_rate', value: 0.02, unit: '%' },
];

class ContinuousPerformanceImpl {
  private baselines: Map<string, PerfBaseline> = new Map();
  private regressions: Map<string, PerfRegression> = new Map();
  private alerts: Map<string, PerfAlert> = new Map();
  private history: Map<string, PerfMetric[]> = new Map();
  private listeners: Set<(event: ContinuousPerfEvent) => void> = new Set();
  private thresholds: Map<string, number> = new Map();

  constructor() {
    this.setupDefaultThresholds();
    this.createDefaultBaseline();
  }

  private setupDefaultThresholds(): void {
    this.thresholds.set('page_load_time', 0.2);
    this.thresholds.set('first_contentful_paint', 0.15);
    this.thresholds.set('time_to_interactive', 0.2);
    this.thresholds.set('bundle_size', 0.1);
    this.thresholds.set('api_response_time', 0.25);
    this.thresholds.set('memory_usage', 0.15);
    this.thresholds.set('render_count', 0.3);
    this.thresholds.set('error_rate', 0.5);
  }

  private createDefaultBaseline(): void {
    const metrics: Record<string, number> = {};
    for (const m of DEFAULT_METRICS) {
      metrics[m.name] = m.value;
    }
    const baseline: PerfBaseline = {
      id: generateId(),
      metrics,
      createdAt: new Date().toISOString(),
      version: 'v1.0.0',
      name: '默认性能基线',
      description: '初始性能基线',
      environment: 'development',
    };
    this.baselines.set(baseline.id, baseline);
  }

  on(listener: (event: ContinuousPerfEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ContinuousPerfEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore
      }
    }
  }

  set_baseline(metrics: Record<string, number>, version?: string, name?: string): PerfBaseline {
    const baseline: PerfBaseline = {
      id: generateId(),
      metrics,
      createdAt: new Date().toISOString(),
      version: version || `v${Date.now()}`,
      name: name || '自定义基线',
      description: '用户手动设置的性能基线',
      environment: 'production',
    };
    this.baselines.set(baseline.id, baseline);
    this.emit({ type: 'baseline_set', baselineId: baseline.id });
    return baseline;
  }

  measure_performance(): PerfMetric[] {
    const currentMetrics: PerfMetric[] = [];
    for (const def of DEFAULT_METRICS) {
      const variation = (Math.random() - 0.4) * 0.4;
      const value = Math.max(1, def.value * (1 + variation));
      const metric: PerfMetric = {
        name: def.name,
        value,
        unit: def.unit,
        timestamp: new Date().toISOString(),
      };
      currentMetrics.push(metric);

      const history = this.history.get(def.name) || [];
      history.push(metric);
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      this.history.set(def.name, history);
    }

    this.emit({ type: 'measurement_recorded', count: currentMetrics.length });
    return currentMetrics;
  }

  detect_regression(currentMetrics?: PerfMetric[]): PerfRegression[] {
    const activeBaselines = Array.from(this.baselines.values());
    if (activeBaselines.length === 0) {
      return [];
    }

    const baseline = activeBaselines[activeBaselines.length - 1];
    const metrics = currentMetrics || this.measure_performance();
    const regressions: PerfRegression[] = [];

    for (const metric of metrics) {
      const baselineValue = baseline.metrics[metric.name];
      if (baselineValue === undefined) continue;

      const delta = (metric.value - baselineValue) / baselineValue;
      const threshold = this.thresholds.get(metric.name) || 0.2;

      let severity: RegressionSeverity = 'info';
      if (delta > threshold) {
        severity = 'critical';
      } else if (delta > threshold * 0.5) {
        severity = 'warning';
      }

      if (severity !== 'info') {
        const history_data = this.history.get(metric.name) || [];
        const regression: PerfRegression = {
          id: generateId(),
          metric: metric.name,
          baseline: baselineValue,
          current: metric.value,
          delta,
          severity,
          detectedAt: new Date().toISOString(),
          threshold,
          trend: delta > 0 ? 'degrading' : 'improving',
          history: history_data.slice(-20).map((h) => ({
            timestamp: h.timestamp,
            value: h.value,
          })),
        };
        regressions.push(regression);
        this.regressions.set(regression.id, regression);
      }
    }

    if (regressions.length > 0) {
      this.emit({
        type: 'regression_detected',
        count: regressions.length,
        critical: regressions.filter((r) => r.severity === 'critical').length,
      });
    }

    return regressions;
  }

  get_baselines(): PerfBaseline[] {
    return Array.from(this.baselines.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get_regressions(filters?: { severity?: RegressionSeverity; metric?: string }): PerfRegression[] {
    let result = Array.from(this.regressions.values());
    if (filters?.severity) result = result.filter((r) => r.severity === filters.severity);
    if (filters?.metric) result = result.filter((r) => r.metric === filters.metric);
    return result.sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }

  get_performance_trend(metricName?: string): PerfTrendPoint[] {
    const activeBaselines = Array.from(this.baselines.values());
    const baseline = activeBaselines[activeBaselines.length - 1];
    const result: PerfTrendPoint[] = [];

    if (metricName) {
      const history = this.history.get(metricName) || [];
      const baselineValue = baseline?.metrics[metricName] || 0;
      for (const h of history) {
        result.push({
          timestamp: h.timestamp,
          metric: metricName,
          value: h.value,
          baseline: baselineValue,
        });
      }
    } else {
      for (const [name, history] of this.history.entries()) {
        const baselineValue = baseline?.metrics[name] || 0;
        for (const h of history.slice(-10)) {
          result.push({
            timestamp: h.timestamp,
            metric: name,
            value: h.value,
            baseline: baselineValue,
          });
        }
      }
    }

    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  alert_on_regression(regressionId: string): PerfAlert | null {
    const regression = this.regressions.get(regressionId);
    if (!regression) return null;

    const alert: PerfAlert = {
      id: generateId(),
      regressionId,
      message: `性能回归告警: ${regression.metric} 从 ${regression.baseline.toFixed(2)} 变化到 ${regression.current.toFixed(2)} (${(regression.delta * 100).toFixed(1)}%)`,
      severity: regression.severity,
      acknowledged: false,
      createdAt: new Date().toISOString(),
    };

    this.alerts.set(alert.id, alert);
    this.emit({ type: 'alert_triggered', alertId: alert.id, regressionId });

    return alert;
  }

  get_alerts(): PerfAlert[] {
    return Array.from(this.alerts.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  acknowledge_alert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.resolvedAt = new Date().toISOString();
    }
  }

  set_threshold(metric: string, threshold: number): void {
    this.thresholds.set(metric, threshold);
  }

  get_thresholds(): Map<string, number> {
    return new Map(this.thresholds);
  }

  get_current_metrics(): PerfMetric[] {
    const result: PerfMetric[] = [];
    for (const [name, history] of this.history.entries()) {
      if (history.length > 0) {
        result.push(history[history.length - 1]);
      }
    }
    return result;
  }
}

export class ContinuousPerformance {
  private static instance: ContinuousPerformanceImpl;

  static getInstance(): ContinuousPerformanceImpl {
    if (!ContinuousPerformance.instance) {
      ContinuousPerformance.instance = new ContinuousPerformanceImpl();
    }
    return ContinuousPerformance.instance;
  }
}

export const continuousPerformance = ContinuousPerformance.getInstance();
