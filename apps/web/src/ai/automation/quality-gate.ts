export type GateType = 'coverage' | 'bundle' | 'size' | 'performance' | 'security';
export type GateAction = 'block' | 'warn' | 'info';
export type GateStatus = 'passed' | 'failed' | 'warned' | 'skipped';
export type MetricComparison = 'gt' | 'lt' | 'gte' | 'lte' | 'eq';

export interface GateCriteria {
  id: string;
  type: GateType;
  name: string;
  description: string;
  threshold: number;
  comparison: MetricComparison;
  action: GateAction;
  enabled: boolean;
  metric_key: string;
}

export interface GateResult {
  criteria_id: string;
  criteria_name: string;
  type: GateType;
  passed: boolean;
  actual: number;
  threshold: number;
  action: GateAction;
  status: GateStatus;
  message: string;
  measured_at: string;
  duration_ms: number;
}

export interface GateOverride {
  criteria_id: string;
  reason: string;
  approved_by: string;
  approved_at: string;
  expires_at: string;
}

export interface TrendPoint {
  timestamp: string;
  value: number;
  threshold: number;
  passed: boolean;
}

export type GateEvent =
  | {
      type: 'gate_evaluated';
      criteria_id: string;
      passed: boolean;
      actual: number;
      threshold: number;
    }
  | { type: 'criteria_configured'; criteria_id: string }
  | { type: 'gate_overridden'; criteria_id: string; reason: string; approved_by: string };
