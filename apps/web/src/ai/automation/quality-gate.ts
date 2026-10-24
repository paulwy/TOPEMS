export type GateType = 'coverage' | 'bundle' | 'size' | 'performance' | 'security';
export type GateAction = 'block' | 'warn' | 'info';
export type GateStatus = 'passed' | 'failed' | 'warned' | 'skipped';
export type MetricComparison = 'gt' | 'lt' | 'gte' | 'lte' | 'eq';

export interface TrendPoint {
  timestamp: string;
  value: number;
  threshold: number;
  passed: boolean;
}
