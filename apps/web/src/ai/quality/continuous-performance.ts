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
