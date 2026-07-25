import { logger } from '@/utils/logger';

export type RollbackComparison = 'gt' | 'lt' | 'eq';
export type RollbackMetric =
  | 'error_rate'
  | 'latency_p99'
  | 'latency_p95'
  | 'cpu_usage'
  | 'memory_usage'
  | 'request_rate'
  | 'custom';

export interface RollbackCondition {
  metric: RollbackMetric;
  threshold: number;
  comparison: RollbackComparison;
  duration_window: number;
  custom_metric?: string;
  enabled: boolean;
}

export interface MetricSample {
  metric: RollbackMetric;
  value: number;
  timestamp: string;
  labels: Record<string, string>;
}

export interface RollbackEvent {
  id: string;
  deployment_id: string;
  trigger: {
    type: 'health_threshold' | 'manual' | 'dependency_failure';
    condition?: RollbackCondition;
    message: string;
  };
  metrics: MetricSample[];
  initiated_at: string;
  completed_at?: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  rollback_duration_ms?: number;
  affected_units: string[];
}

const ROLLBACK_EVENT_STORE = new Map<string, RollbackEvent>();
const CONDITION_STORE = new Map<string, RollbackCondition[]>();
const METRIC_STORE = new Map<string, MetricSample[]>();
const HEALTH_STATE = new Map<
  string,
  {
    last_check: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    consecutive_failures: number;
  }
>();

let autoRollbackEnabled = true;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

export class AutoRollback {
  private static instance: AutoRollback;

  static getInstance(): AutoRollback {
    if (!AutoRollback.instance) {
      AutoRollback.instance = new AutoRollback();
    }
    return AutoRollback.instance;
  }

  enable_auto_rollback(): void {
    autoRollbackEnabled = true;
    logger.info('[AutoRollback] Automatic rollback enabled');
  }

  disable_auto_rollback(): void {
    autoRollbackEnabled = false;
    logger.info('[AutoRollback] Automatic rollback disabled');
  }

  is_enabled(): boolean {
    return autoRollbackEnabled;
  }

  configure_conditions(conditions: RollbackCondition[]): void {
    CONDITION_STORE.clear();
    const grouped = new Map<string, RollbackCondition[]>();
    for (const cond of conditions) {
      const key = cond.metric;
      const list = grouped.get(key) || [];
      list.push(cond);
      grouped.set(key, list);
    }
    for (const [key, list] of grouped) {
      CONDITION_STORE.set(key, list);
    }
    logger.info('[AutoRollback] Conditions configured:', conditions.length);
  }

  get_conditions(): RollbackCondition[] {
    const all: RollbackCondition[] = [];
    CONDITION_STORE.forEach((list) => all.push(...list));
    return all;
  }

  record_metric(sample: MetricSample): void {
    const key = sample.metric;
    const samples = METRIC_STORE.get(key) || [];
    samples.push(sample);
    if (samples.length > 1000) {
      METRIC_STORE.set(key, samples.slice(-500));
    } else {
      METRIC_STORE.set(key, samples);
    }
  }

  async check_health(deploymentId?: string): Promise<{
    healthy: boolean;
    triggered_conditions: RollbackCondition[];
    current_metrics: MetricSample[];
  }> {
    const triggered: RollbackCondition[] = [];
    const currentMetrics: MetricSample[] = [];

    for (const [metricKey, conditions] of CONDITION_STORE) {
      const samples = METRIC_STORE.get(metricKey) || [];
      if (samples.length === 0) continue;

      const latestSample = samples[samples.length - 1];
      currentMetrics.push(latestSample);

      for (const condition of conditions) {
        if (!condition.enabled) continue;

        const durationWindowMs = condition.duration_window * 60 * 1000;
        const relevantSamples = samples.filter((s) => {
          const age = Date.now() - new Date(s.timestamp).getTime();
          return age <= durationWindowMs;
        });

        if (relevantSamples.length === 0) continue;

        const isTriggered = relevantSamples.some((s) => {
          switch (condition.comparison) {
            case 'gt':
              return s.value > condition.threshold;
            case 'lt':
              return s.value < condition.threshold;
            case 'eq':
              return s.value === condition.threshold;
            default:
              return false;
          }
        });

        if (isTriggered) {
          triggered.push(condition);
        }
      }
    }

    const healthy = triggered.length === 0;

    if (!deploymentId) {
      return { healthy, triggered_conditions: triggered, current_metrics: currentMetrics };
    }

    const state = HEALTH_STATE.get(deploymentId) || {
      last_check: now(),
      status: 'healthy' as const,
      consecutive_failures: 0,
    };

    state.last_check = now();
    if (healthy) {
      state.status = 'healthy';
      state.consecutive_failures = 0;
    } else {
      state.status = 'degraded';
      state.consecutive_failures += 1;
    }
    HEALTH_STATE.set(deploymentId, state);

    return { healthy, triggered_conditions: triggered, current_metrics: currentMetrics };
  }

  async trigger_rollback(params: {
    deployment_id: string;
    reason?: string;
    condition?: RollbackCondition;
  }): Promise<RollbackEvent> {
    const startTime = Date.now();
    const event: RollbackEvent = {
      id: generateId('rb'),
      deployment_id: params.deployment_id,
      trigger: {
        type: params.condition ? 'health_threshold' : 'manual',
        condition: params.condition,
        message: params.reason || 'Manual rollback triggered',
      },
      metrics: [],
      initiated_at: now(),
      status: 'initiated',
      affected_units: [],
    };

    ROLLBACK_EVENT_STORE.set(event.id, event);

    logger.warn('[AutoRollback] Rollback initiated:', {
      deployment: params.deployment_id,
      reason: event.trigger.message,
    });

    event.status = 'in_progress';

    await new Promise((resolve) => setTimeout(resolve, 1500));

    event.status = 'completed';
    event.completed_at = now();
    event.rollback_duration_ms = Date.now() - startTime;
    event.affected_units = ['stable-0', 'stable-1'];

    logger.info('[AutoRollback] Rollback completed:', event.id);
    return event;
  }

  get_rollback_history(deploymentId?: string, limit: number = 20): RollbackEvent[] {
    const all = Array.from(ROLLBACK_EVENT_STORE.values()).sort((a, b) =>
      b.initiated_at.localeCompare(a.initiated_at)
    );
    if (deploymentId) {
      return all.filter((e) => e.deployment_id === deploymentId).slice(0, limit);
    }
    return all.slice(0, limit);
  }

  get_rollback_event(eventId: string): RollbackEvent | undefined {
    return ROLLBACK_EVENT_STORE.get(eventId);
  }

  get_health_status(deploymentId: string): {
    status: 'healthy' | 'unhealthy' | 'degraded';
    last_check: string;
    consecutive_failures: number;
  } {
    return (
      HEALTH_STATE.get(deploymentId) || {
        status: 'healthy',
        last_check: now(),
        consecutive_failures: 0,
      }
    );
  }

  start_health_monitoring(deploymentId: string, intervalMs: number = 10000): () => void {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
    }

    healthCheckTimer = setInterval(async () => {
      if (!autoRollbackEnabled) return;

      const result = await this.check_health(deploymentId);
      if (!result.healthy && result.triggered_conditions.length > 0) {
        const state = HEALTH_STATE.get(deploymentId);
        if (state && state.consecutive_failures >= 3) {
          await this.trigger_rollback({
            deployment_id: deploymentId,
            reason: `Auto-rollback triggered: ${result.triggered_conditions.length} condition(s) breached`,
            condition: result.triggered_conditions[0],
          });
        }
      }
    }, intervalMs);

    return () => {
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        healthCheckTimer = null;
      }
    };
  }

  stop_health_monitoring(): void {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
  }

  set_metric_value(metric: RollbackMetric, value: number, labels?: Record<string, string>): void {
    this.record_metric({
      metric,
      value,
      timestamp: now(),
      labels: labels || {},
    });
  }

  clear_all(): void {
    ROLLBACK_EVENT_STORE.clear();
    CONDITION_STORE.clear();
    METRIC_STORE.clear();
    HEALTH_STATE.clear();
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
    logger.info('[AutoRollback] All data cleared');
  }
}

export const autoRollback = AutoRollback.getInstance();
