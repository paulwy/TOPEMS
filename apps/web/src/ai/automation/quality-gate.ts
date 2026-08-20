import i18n from '@/i18n';

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

const generateId = () => `gate_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_CRITERIA: GateCriteria[] = [
  {
    id: generateId(),
    type: 'coverage',
    name: i18n.t('ai.quality-gate.k0'),
    description: i18n.t('ai.quality-gate.k1'),
    threshold: 80,
    comparison: 'gte',
    action: 'block',
    enabled: true,
    metric_key: 'line_coverage',
  },
  {
    id: generateId(),
    type: 'coverage',
    name: i18n.t('ai.quality-gate.k2'),
    description: i18n.t('ai.quality-gate.k3'),
    threshold: 70,
    comparison: 'gte',
    action: 'warn',
    enabled: true,
    metric_key: 'branch_coverage',
  },
  {
    id: generateId(),
    type: 'bundle',
    name: i18n.t('ai.quality-gate.k4'),
    description: i18n.t('ai.quality-gate.gzip_5'),
    threshold: 300,
    comparison: 'lte',
    action: 'block',
    enabled: true,
    metric_key: 'bundle_size_kb',
  },
  {
    id: generateId(),
    type: 'size',
    name: i18n.t('ai.quality-gate.k6'),
    description: i18n.t('ai.quality-gate.k7'),
    threshold: 500,
    comparison: 'lte',
    action: 'warn',
    enabled: true,
    metric_key: 'initial_load_kb',
  },
  {
    id: generateId(),
    type: 'performance',
    name: i18n.t('ai.quality-gate.k8'),
    description: i18n.t('ai.quality-gate.fcp_9'),
    threshold: 3,
    comparison: 'lte',
    action: 'block',
    enabled: true,
    metric_key: 'fcp_seconds',
  },
  {
    id: generateId(),
    type: 'performance',
    name: i18n.t('ai.quality-gate.k10'),
    description: i18n.t('ai.quality-gate.lcp_11'),
    threshold: 4,
    comparison: 'lte',
    action: 'warn',
    enabled: true,
    metric_key: 'lcp_seconds',
  },
  {
    id: generateId(),
    type: 'security',
    name: i18n.t('ai.quality-gate.k12'),
    description: i18n.t('ai.quality-gate.0_13'),
    threshold: 0,
    comparison: 'eq',
    action: 'block',
    enabled: true,
    metric_key: 'critical_vulnerabilities',
  },
  {
    id: generateId(),
    type: 'security',
    name: i18n.t('ai.quality-gate.k14'),
    description: i18n.t('ai.quality-gate.k15'),
    threshold: 5,
    comparison: 'lte',
    action: 'warn',
    enabled: true,
    metric_key: 'outdated_deps',
  },
];


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
