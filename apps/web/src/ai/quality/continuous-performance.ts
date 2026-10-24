export type RegressionSeverity = 'info' | 'warning' | 'critical';

interface PerfMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
}

interface PerfBaseline {
  id: string;
  metrics: Record<string, number>;
  createdAt: string;
  version: string;
  name?: string;
  description?: string;
  environment?: string;
}

interface PerfRegression {
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

interface PerfAlert {
  id: string;
  regressionId: string;
  message: string;
  severity: RegressionSeverity;
  acknowledged: boolean;
  createdAt: string;
  resolvedAt?: string;
}

interface PerfTrendPoint {
  timestamp: string;
  metric: string;
  value: number;
  baseline: number;
}

interface ContinuousPerfEvent {
  type: 'baseline_set' | 'regression_detected' | 'alert_triggered' | 'measurement_recorded';
  [key: string]: unknown;
}
