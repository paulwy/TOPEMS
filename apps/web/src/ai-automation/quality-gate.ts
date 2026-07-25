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
    name: '行覆盖率',
    description: '代码行覆盖率不得低于阈值',
    threshold: 80,
    comparison: 'gte',
    action: 'block',
    enabled: true,
    metric_key: 'line_coverage',
  },
  {
    id: generateId(),
    type: 'coverage',
    name: '分支覆盖率',
    description: '分支覆盖率不得低于阈值',
    threshold: 70,
    comparison: 'gte',
    action: 'warn',
    enabled: true,
    metric_key: 'branch_coverage',
  },
  {
    id: generateId(),
    type: 'bundle',
    name: '主包体积',
    description: '主代码包（gzip 后）不得超过阈值',
    threshold: 300,
    comparison: 'lte',
    action: 'block',
    enabled: true,
    metric_key: 'bundle_size_kb',
  },
  {
    id: generateId(),
    type: 'size',
    name: '首屏资源',
    description: '首屏加载资源总量不得超过阈值',
    threshold: 500,
    comparison: 'lte',
    action: 'warn',
    enabled: true,
    metric_key: 'initial_load_kb',
  },
  {
    id: generateId(),
    type: 'performance',
    name: '首屏加载时间',
    description: '首次内容绘制 (FCP) 不得超过阈值',
    threshold: 3,
    comparison: 'lte',
    action: 'block',
    enabled: true,
    metric_key: 'fcp_seconds',
  },
  {
    id: generateId(),
    type: 'performance',
    name: '最大内容绘制',
    description: '最大内容绘制 (LCP) 不得超过阈值',
    threshold: 4,
    comparison: 'lte',
    action: 'warn',
    enabled: true,
    metric_key: 'lcp_seconds',
  },
  {
    id: generateId(),
    type: 'security',
    name: '安全漏洞',
    description: '严重安全漏洞数量必须为 0',
    threshold: 0,
    comparison: 'eq',
    action: 'block',
    enabled: true,
    metric_key: 'critical_vulnerabilities',
  },
  {
    id: generateId(),
    type: 'security',
    name: '依赖过期',
    description: '过期依赖数量不得超过阈值',
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

  evaluate_gate(metrics?: Record<string, number>): GateResult[] {
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
          ? `${criteria.name} 通过 (${actual.toFixed(2)} ${criteria.comparison} ${criteria.threshold})`
          : `${criteria.name} 未通过 (${actual.toFixed(2)} ${criteria.comparison} ${criteria.threshold})`,
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

  get_gate_results(criteriaId?: string, limit: number = 10): GateResult[] {
    if (criteriaId) {
      return (this.results.get(criteriaId) || []).slice(0, limit);
    }
    const all: GateResult[] = [];
    for (const results of this.results.values()) {
      all.push(...results);
    }
    return all.sort((a, b) => b.measured_at.localeCompare(a.measured_at)).slice(0, limit);
  }

  configure_criteria(criteria: Omit<GateCriteria, 'id'>): GateCriteria {
    const id = generateId();
    const newCriteria: GateCriteria = { ...criteria, id };
    this.criteria.set(id, newCriteria);
    this.emit({ type: 'criteria_configured', criteria_id: id });
    return newCriteria;
  }

  list_criteria(filter?: { type?: GateType; enabled?: boolean }): GateCriteria[] {
    let result = Array.from(this.criteria.values());
    if (filter?.type) result = result.filter((c) => c.type === filter.type);
    if (filter?.enabled !== undefined) result = result.filter((c) => c.enabled === filter.enabled);
    return result.sort((a, b) => {
      const typeOrder: GateType[] = ['coverage', 'security', 'performance', 'bundle', 'size'];
      return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    });
  }

  override_gate(
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

  get_overrides(criteriaId?: string): GateOverride[] {
    if (criteriaId) {
      return this.overrides.get(criteriaId) || [];
    }
    const all: GateOverride[] = [];
    for (const overrides of this.overrides.values()) {
      all.push(...overrides);
    }
    return all.sort((a, b) => b.approved_at.localeCompare(a.approved_at));
  }

  get_trend(criteriaId: string, limit: number = 20): TrendPoint[] {
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

  get_summary(): {
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
