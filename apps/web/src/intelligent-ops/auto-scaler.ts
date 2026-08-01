export type ScalingMetric = 'CPU' | 'Memory' | 'RequestRate' | 'Latency';
export type ScalingDirection = 'ScaleUp' | 'ScaleDown';

export interface ScalingPolicy {
  id: string;
  metric: ScalingMetric;
  target: number;
  min_instances: number;
  max_instances: number;
  cooldown_ms: number;
}

export interface ScalingAction {
  id: string;
  policy_id: string;
  direction: ScalingDirection;
  instances: number;
  reason: string;
  executed_at: number;
}

interface MetricSample {
  timestamp: number;
  value: number;
}

interface DemandPattern {
  hour: number;
  avg_requests: number;
  peak_multiplier: number;
}

class AutoScalerImpl {
  private policies: Map<string, ScalingPolicy> = new Map();
  private actions: ScalingAction[] = [];
  private currentInstances: Map<string, number> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private metricHistory: Map<string, MetricSample[]> = new Map();
  private demandPatterns: DemandPattern[] = [];

  constructor() {
    this.init_default_policies();
    this.init_demand_patterns();
  }

  private init_default_policies(): void {
    const defaults: ScalingPolicy[] = [
      {
        id: 'cpu-scale',
        metric: 'CPU',
        target: 75,
        min_instances: 2,
        max_instances: 20,
        cooldown_ms: 300000,
      },
      {
        id: 'memory-scale',
        metric: 'Memory',
        target: 80,
        min_instances: 2,
        max_instances: 15,
        cooldown_ms: 300000,
      },
      {
        id: 'request-rate-scale',
        metric: 'RequestRate',
        target: 1000,
        min_instances: 2,
        max_instances: 30,
        cooldown_ms: 180000,
      },
      {
        id: 'latency-scale',
        metric: 'Latency',
        target: 200,
        min_instances: 2,
        max_instances: 25,
        cooldown_ms: 240000,
      },
    ];
    defaults.forEach((p) => this.policies.set(p.id, p));
  }

  private init_demand_patterns(): void {
    for (let h = 0; h < 24; h++) {
      let avg = 200;
      let peak = 1.0;
      if (h >= 9 && h <= 11) {
        avg = 800;
        peak = 2.5;
      } else if (h >= 14 && h <= 17) {
        avg = 950;
        peak = 3.0;
      } else if (h >= 19 && h <= 21) {
        avg = 600;
        peak = 1.8;
      } else if (h >= 0 && h <= 6) {
        avg = 80;
        peak = 0.4;
      }
      this.demandPatterns.push({ hour: h, avg_requests: avg, peak_multiplier: peak });
    }
  }

  get_metric_value(metric: ScalingMetric): number {
    const baseValues: Record<ScalingMetric, number> = {
      CPU: 45 + Math.random() * 30,
      Memory: 60 + Math.random() * 20,
      RequestRate: 500 + Math.random() * 400,
      Latency: 120 + Math.random() * 80,
    };
    return Math.round(baseValues[metric] * 100) / 100;
  }

  evaluate_scaling(policyId: string): ScalingAction | null {
    const policy = this.policies.get(policyId);
    if (!policy) return null;

    const now = Date.now();
    const lastAction = this.cooldowns.get(policyId) || 0;
    if (now - lastAction < policy.cooldown_ms) return null;

    const currentValue = this.get_metric_value(policy.metric);
    const currentInstances = this.currentInstances.get(policyId) ?? policy.min_instances;

    let direction: ScalingDirection | null = null;
    let targetInstances = currentInstances;

    if (policy.metric === 'RequestRate' || policy.metric === 'Latency') {
      if (currentValue > policy.target) {
        direction = 'ScaleUp';
        const ratio = currentValue / policy.target;
        targetInstances = Math.min(
          policy.max_instances,
          Math.ceil(currentInstances * Math.max(ratio, 1.5))
        );
      } else if (currentValue < policy.target * 0.5 && currentInstances > policy.min_instances) {
        direction = 'ScaleDown';
        targetInstances = Math.max(policy.min_instances, Math.floor(currentInstances * 0.7));
      }
    } else {
      if (currentValue > policy.target) {
        direction = 'ScaleUp';
        const excess = (currentValue - policy.target) / policy.target;
        targetInstances = Math.min(
          policy.max_instances,
          Math.ceil(currentInstances * (1 + excess))
        );
      } else if (currentValue < policy.target * 0.6 && currentInstances > policy.min_instances) {
        direction = 'ScaleDown';
        targetInstances = Math.max(policy.min_instances, Math.floor(currentInstances * 0.6));
      }
    }

    if (!direction || targetInstances === currentInstances) return null;

    const action: ScalingAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      policy_id: policyId,
      direction,
      instances: targetInstances,
      reason: `${policy.metric}=${currentValue.toFixed(1)} ${direction === 'ScaleUp' ? '>' : '<'} ${policy.target}`,
      executed_at: now,
    };

    return action;
  }

  scale(policyId: string): ScalingAction | null {
    const action = this.evaluate_scaling(policyId);
    if (!action) return null;

    this.currentInstances.set(policyId, action.instances);
    this.cooldowns.set(policyId, Date.now());
    this.actions.unshift(action);

    if (this.actions.length > 200) {
      this.actions = this.actions.slice(0, 200);
    }

    this.record_metric(policyId, action);
    return action;
  }

  get_scaling_history(policyId?: string): ScalingAction[] {
    if (!policyId) return [...this.actions];
    return this.actions.filter((a) => a.policy_id === policyId);
  }

  update_policy(
    policyId: string,
    updates: Partial<Omit<ScalingPolicy, 'id'>>
  ): ScalingPolicy | null {
    const existing = this.policies.get(policyId);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    this.policies.set(policyId, updated);
    return updated;
  }

  list_policies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  get_current_capacity(policyId?: string): Map<string, number> {
    if (policyId) {
      const m = new Map<string, number>();
      m.set(policyId, this.currentInstances.get(policyId) ?? 0);
      return m;
    }
    return new Map(this.currentInstances);
  }

  predict_demand(
    hoursAhead: number = 24
  ): { hour: number; predicted_requests: number; confidence: number }[] {
    const now = new Date();
    const currentHour = now.getHours();
    const predictions: { hour: number; predicted_requests: number; confidence: number }[] = [];

    for (let i = 0; i < hoursAhead; i++) {
      const hour = (currentHour + i) % 24;
      const pattern = this.demandPatterns[hour];
      const confidence = Math.max(0.5, 1 - i * 0.03);
      const predicted = Math.round(
        pattern.avg_requests * pattern.peak_multiplier * (0.85 + Math.random() * 0.3)
      );
      predictions.push({
        hour,
        predicted_requests: predicted,
        confidence: Math.round(confidence * 100) / 100,
      });
    }

    return predictions;
  }

  private record_metric(policyId: string, action: ScalingAction): void {
    const samples = this.metricHistory.get(policyId) || [];
    samples.push({ timestamp: action.executed_at, value: action.instances });
    if (samples.length > 500) samples.shift();
    this.metricHistory.set(policyId, samples);
  }

  get_metric_history(policyId: string): MetricSample[] {
    return this.metricHistory.get(policyId) || [];
  }
}

export const autoScaler = new AutoScalerImpl();
export type { AutoScalerImpl };
