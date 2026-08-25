import i18n from '@/i18n';

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
  { name: 'render_count', value: 12, unit: i18n.t('ai.continuous-performance.k0') },
  { name: 'error_rate', value: 0.02, unit: '%' },
];
