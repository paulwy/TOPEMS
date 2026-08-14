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

class QualityGateImpl {
  private criteria: Map<string, GateCriteria> = new Map();
  private results: Map<string, GateResult[]> = new Map();
  private overrides: Map<string, GateOverride[]> = new Map();
  private listeners: Set<(event: GateEvent) => void> = new Set();

  constructor() {
    for (const c of DEFAULT_CRITERIA) {
      this.criteria.set(c.id, { ...c });
    }
  }

  on(listener: (event: GateEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: GateEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore
      }
    }
  }

  evaluateGate(metrics?: Record<string, number>): GateResult[] {
    const allCriteria = Array.from(this.criteria.values()).filter((c) => c.enabled);
    const results: GateResult[] = [];
    const now = new Date().toISOString();

    const defaultMetrics: Record<string, number> = metrics || {
      line_coverage: 75 + Math.random() * 20,
      branch_coverage: 65 + Math.random() * 25,
      bundle_size_kb: 200 + Math.random() * 150,
      initial_load_kb: 300 + Math.random() * 200,
      fcp_seconds: 1.5 + Math.random() * 2,
      lcp_seconds: 2 + Math.random() * 3,
      critical_vulnerabilities: Math.random() > 0.9 ? 1 : 0,
      outdated_deps: Math.floor(Math.random() * 8),
    };

    for (const criteria of allCriteria) {
      const start = Date.now();
      const actual = defaultMetrics[criteria.metric_key] ?? 0;

      const passed = this.compare(actual, criteria.threshold, criteria.comparison);
      const duration = Date.now() - start;

      const status: GateStatus = passed
        ? 'passed'
        : criteria.action === 'warn'
          ? 'warned'
          : 'failed';

      const result: GateResult = {
        criteria_id: criteria.id,
        criteria_name: criteria.name,
        type: criteria.type,
        passed,
        actual: Math.round(actual * 100) / 100,
        threshold: criteria.threshold,
        action: criteria.action,
        status,
        message: passed
          ? `${criteria.name}${i18n.t('ai.quality-gate.k0')}${actual.toFixed(2)} ${criteria.comparison} ${criteria.threshold})`
          : `${criteria.name}${i18n.t('ai.quality-gate.k1')}${actual.toFixed(2)} ${criteria.comparison} ${criteria.threshold})`,
        measured_at: now,
        duration_ms: duration,
      };

      results.push(result);
      const criteriaResults = this.results.get(criteria.id) || [];
      criteriaResults.unshift(result);
      this.results.set(criteria.id, criteriaResults.slice(0, 50));

      this.emit({
        type: 'gate_evaluated',
        criteria_id: criteria.id,
        passed,
        actual: result.actual,
        threshold: criteria.threshold,
      });
    }

    return results;
  }

  private compare(actual: number, threshold: number, comparison: MetricComparison): boolean {
    switch (comparison) {
      case 'gt':
        return actual > threshold;
      case 'lt':
        return actual < threshold;
      case 'gte':
        return actual >= threshold;
      case 'lte':
        return actual <= threshold;
      case 'eq':
        return actual === threshold;
      default:
        return false;
    }
  }

  getGateResults(criteriaId?: string, limit: number = 10): GateResult[] {
    if (criteriaId) {
      return (this.results.get(criteriaId) || []).slice(0, limit);
    }
    const all: GateResult[] = [];
    for (const results of this.results.values()) {
      all.push(...results);
    }
    return all.sort((a, b) => b.measured_at.localeCompare(a.measured_at)).slice(0, limit);
  }

  configureCriteria(criteria: Omit<GateCriteria, 'id'>): GateCriteria {
    const id = generateId();
    const newCriteria: GateCriteria = { ...criteria, id };
    this.criteria.set(id, newCriteria);
    this.emit({ type: 'criteria_configured', criteria_id: id });
    return newCriteria;
  }

  listCriteria(filter?: { type?: GateType; enabled?: boolean }): GateCriteria[] {
    let result = Array.from(this.criteria.values());
    if (filter?.type) result = result.filter((c) => c.type === filter.type);
    if (filter?.enabled !== undefined) result = result.filter((c) => c.enabled === filter.enabled);
    return result.sort((a, b) => {
      const typeOrder: GateType[] = ['coverage', 'security', 'performance', 'bundle', 'size'];
      return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    });
  }

  overrideGate(
    criteriaId: string,
    reason: string,
    approvedBy: string,
    durationMinutes: number = 60
  ): GateOverride | null {
    const criteria = this.criteria.get(criteriaId);
    if (!criteria) return null;

    const now = new Date();
    const override: GateOverride = {
      criteria_id: criteriaId,
      reason,
      approved_by: approvedBy,
      approved_at: now.toISOString(),
      expires_at: new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString(),
    };

    const overrides = this.overrides.get(criteriaId) || [];
    overrides.unshift(override);
    this.overrides.set(criteriaId, overrides);

    criteria.enabled = false;
    this.emit({
      type: 'gate_overridden',
      criteria_id: criteriaId,
      reason,
      approved_by: approvedBy,
    });

    return override;
  }

  getOverrides(criteriaId?: string): GateOverride[] {
    if (criteriaId) {
      return this.overrides.get(criteriaId) || [];
    }
    const all: GateOverride[] = [];
    for (const overrides of this.overrides.values()) {
      all.push(...overrides);
    }
    return all.sort((a, b) => b.approved_at.localeCompare(a.approved_at));
  }

  getTrend(criteriaId: string, limit: number = 20): TrendPoint[] {
    const results = this.results.get(criteriaId) || [];
    const criteria = this.criteria.get(criteriaId);
    if (!criteria) return [];

    const points = results
      .slice(0, limit)
      .reverse()
      .map((r) => ({
        timestamp: r.measured_at,
        value: r.actual,
        threshold: r.threshold,
        passed: r.passed,
      }));

    if (points.length === 0) {
      const now = Date.now();
      for (let i = limit; i > 0; i--) {
        const value = 70 + Math.random() * 30;
        points.push({
          timestamp: new Date(now - i * 3600000).toISOString(),
          value: Math.round(value * 100) / 100,
          threshold: criteria.threshold,
          passed: this.compare(value, criteria.threshold, criteria.comparison),
        });
      }
    }

    return points;
  }

  getSummary(): {
    total_criteria: number;
    enabled_count: number;
    last_results: Array<GateResult & { criteria_name: string }>;
    status_counts: Record<GateStatus, number>;
  } {
    const all = Array.from(this.criteria.values());
    const lastResults: Array<GateResult & { criteria_name: string }> = [];

    for (const c of all) {
      const results = this.results.get(c.id) || [];
      if (results[0]) {
        lastResults.push({ ...results[0], criteria_name: c.name });
      }
    }

    const statusCounts: Record<GateStatus, number> = {
      passed: 0,
      failed: 0,
      warned: 0,
      skipped: 0,
    };
    for (const r of lastResults) {
      statusCounts[r.status]++;
    }

    return {
      total_criteria: all.length,
      enabled_count: all.filter((c) => c.enabled).length,
      last_results: lastResults,
      status_counts: statusCounts,
    };
  }
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

export const qualityGate = new QualityGateImpl();
export { QualityGateImpl as QualityGate };
