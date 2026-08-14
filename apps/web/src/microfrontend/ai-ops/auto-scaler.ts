import i18n from '@/i18n';
export type ScalingDirection = 'up' | 'down' | 'none';
export type ScalingStatus = 'pending' | 'scaling' | 'completed' | 'failed' | 'cancelled';

export interface ScalingMetric {
  name: string;
  value: number;
  targetValue?: number;
  threshold?: {
    scaleUp: number;
    scaleDown: number;
  };
  weight: number;
}

export interface ModuleInstanceInfo {
  id: string;
  moduleId: string;
  instanceNumber: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  createdAt: number;
  startedAt?: number;
  stoppedAt?: number;
  metrics?: Record<string, number>;
  containerId?: string;
  region?: string;
}

export interface ModuleMetrics {
  moduleId: string;
  currentInstances: number;
  targetInstances: number;
  cpuUsage: number;
  memoryUsage: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  queueSize?: number;
  activeConnections?: number;
  timestamp: number;
}

export interface ScalingDecision {
  moduleId: string;
  direction: ScalingDirection;
  currentInstances: number;
  targetInstances: number;
  reason: string;
  metrics: ScalingMetric[];
  confidence: number;
  timestamp: number;
}

export interface ScalingPolicy {
  id: string;
  moduleId: string;
  name: string;
  description?: string;
  enabled: boolean;
  minInstances: number;
  maxInstances: number;
  scaleUpIncrement: number;
  scaleDownIncrement: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  metrics: {
    name: string;
    targetValue?: number;
    scaleUpThreshold?: number;
    scaleDownThreshold?: number;
    weight: number;
  }[];
  scaleUpStrategy: 'average' | 'any' | 'weighted';
  scaleDownStrategy: 'average' | 'all' | 'weighted';
  preWarmInstances?: number;
  predictiveScaling?: boolean;
  createdAt: number;
  lastModified: number;
}

export interface ScalingEvent {
  id: string;
  moduleId: string;
  policyId: string;
  direction: ScalingDirection;
  fromInstances: number;
  toInstances: number;
  status: ScalingStatus;
  reason: string;
  triggeredBy: 'manual' | 'auto' | 'prewarm' | 'scheduled';
  startedAt: number;
  completedAt?: number;
  failedReason?: string;
  metricsSnapshot?: ModuleMetrics;
}

export interface AutoScalerConfig {
  defaultMinInstances: number;
  defaultMaxInstances: number;
  defaultScaleUpCooldown: number;
  defaultScaleDownCooldown: number;
  maxScalingHistory: number;
  defaultScaleUpIncrement: number;
  defaultScaleDownIncrement: number;
  enablePredictiveScaling: boolean;
}

const DEFAULT_CONFIG: AutoScalerConfig = {
  defaultMinInstances: 1,
  defaultMaxInstances: 10,
  defaultScaleUpCooldown: 60000,
  defaultScaleDownCooldown: 300000,
  maxScalingHistory: 500,
  defaultScaleUpIncrement: 1,
  defaultScaleDownIncrement: 1,
  enablePredictiveScaling: false,
};

export class AutoScaler {
  private config: AutoScalerConfig;
  private policies: Map<string, ScalingPolicy> = new Map();
  private instances: Map<string, ModuleInstanceInfo[]> = new Map();
  private moduleMetrics: Map<string, ModuleMetrics> = new Map();
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingTime: Map<string, { up: number; down: number }> = new Map();
  private listeners: Set<(event: ScalingEvent) => void> = new Set();

  constructor(config: Partial<AutoScalerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerPolicy(
    policy: Omit<ScalingPolicy, 'id' | 'createdAt' | 'lastModified'> & { id?: string }
  ): ScalingPolicy {
    const id = policy.id || `policy-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const now = Date.now();
    const newPolicy: ScalingPolicy = {
      ...policy,
      id,
      createdAt: now,
      lastModified: now,
    };
    this.policies.set(id, newPolicy);

    if (!this.instances.has(policy.moduleId)) {
      this.instances.set(policy.moduleId, []);
    }

    if (policy.minInstances > 0) {
      this.ensureMinInstances(policy.moduleId, policy.minInstances);
    }

    return newPolicy;
  }

  removePolicy(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;
    this.policies.delete(policyId);
    return true;
  }

  getPolicy(policyId: string): ScalingPolicy | undefined {
    return this.policies.get(policyId);
  }

  getAllPolicies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  getPoliciesByModule(moduleId: string): ScalingPolicy[] {
    return Array.from(this.policies.values()).filter((p) => p.moduleId === moduleId);
  }

  updatePolicy(policyId: string, updates: Partial<ScalingPolicy>): ScalingPolicy | undefined {
    const policy = this.policies.get(policyId);
    if (!policy) return undefined;
    const updated = { ...policy, ...updates, lastModified: Date.now() };
    this.policies.set(policyId, updated);
    return updated;
  }

  getInstanceCount(moduleId: string): {
    current: number;
    target: number;
    min: number;
    max: number;
  } {
    const instances = this.instances.get(moduleId) || [];
    const runningInstances = instances.filter((i) => i.status === 'running').length;
    const policies = this.getPoliciesByModule(moduleId);
    const minInstances =
      policies.length > 0
        ? Math.max(...policies.map((p) => p.minInstances))
        : this.config.defaultMinInstances;
    const maxInstances =
      policies.length > 0
        ? Math.min(...policies.map((p) => p.maxInstances))
        : this.config.defaultMaxInstances;

    const metrics = this.moduleMetrics.get(moduleId);

    return {
      current: runningInstances,
      target: metrics?.targetInstances || runningInstances,
      min: minInstances,
      max: maxInstances,
    };
  }

  getInstances(moduleId: string): ModuleInstanceInfo[] {
    return this.instances.get(moduleId) || [];
  }

  getAllInstances(): Record<string, ModuleInstanceInfo[]> {
    const result: Record<string, ModuleInstanceInfo[]> = {};
    for (const [moduleId, instances] of this.instances.entries()) {
      result[moduleId] = [...instances];
    }
    return result;
  }

  scale(moduleId: string, targetInstances: number, reason: string = 'manual'): ScalingEvent | null {
    const instances = this.instances.get(moduleId) || [];
    const currentRunning = instances.filter((i) => i.status === 'running').length;

    const policies = this.getPoliciesByModule(moduleId);
    const minInstances =
      policies.length > 0
        ? Math.max(...policies.map((p) => p.minInstances))
        : this.config.defaultMinInstances;
    const maxInstances =
      policies.length > 0
        ? Math.min(...policies.map((p) => p.maxInstances))
        : this.config.defaultMaxInstances;

    const clampedTarget = Math.max(minInstances, Math.min(maxInstances, targetInstances));

    if (clampedTarget === currentRunning) {
      return null;
    }

    const direction: ScalingDirection = clampedTarget > currentRunning ? 'up' : 'down';
    const policy = policies.find((p) => p.enabled) || policies[0];

    const event: ScalingEvent = {
      id: `scale-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      moduleId,
      policyId: policy?.id || 'manual',
      direction,
      fromInstances: currentRunning,
      toInstances: clampedTarget,
      status: 'scaling',
      reason,
      triggeredBy: 'manual',
      startedAt: Date.now(),
      metricsSnapshot: this.moduleMetrics.get(moduleId),
    };

    this.performScaling(moduleId, clampedTarget, direction, event);
    return event;
  }

  autoScale(moduleId: string, metrics: ModuleMetrics): ScalingDecision | null {
    this.moduleMetrics.set(moduleId, metrics);

    const policies = this.getPoliciesByModule(moduleId).filter((p) => p.enabled);
    if (policies.length === 0) return null;

    const policy = policies[0];
    const now = Date.now();
    const lastScaling = this.lastScalingTime.get(moduleId) || { up: 0, down: 0 };

    const scalingMetrics: ScalingMetric[] = policy.metrics.map((m) => {
      const value = this.getMetricValue(metrics, m.name);
      return {
        name: m.name,
        value,
        targetValue: m.targetValue,
        threshold:
          m.scaleUpThreshold !== undefined && m.scaleDownThreshold !== undefined
            ? { scaleUp: m.scaleUpThreshold, scaleDown: m.scaleDownThreshold }
            : undefined,
        weight: m.weight,
      };
    });

    const { shouldScaleUp, shouldScaleDown, confidence } = this.evaluateScalingNeed(
      scalingMetrics,
      policy
    );

    let direction: ScalingDirection = 'none';
    let targetInstances = metrics.currentInstances;

    if (shouldScaleUp && now - lastScaling.up >= policy.scaleUpCooldown) {
      direction = 'up';
      targetInstances = Math.min(
        policy.maxInstances,
        metrics.currentInstances + policy.scaleUpIncrement
      );
    } else if (shouldScaleDown && now - lastScaling.down >= policy.scaleDownCooldown) {
      direction = 'down';
      targetInstances = Math.max(
        policy.minInstances,
        metrics.currentInstances - policy.scaleDownIncrement
      );
    }

    if (direction === 'none' || targetInstances === metrics.currentInstances) {
      return {
        moduleId,
        direction: 'none',
        currentInstances: metrics.currentInstances,
        targetInstances: metrics.currentInstances,
        reason: i18n.t('microfrontend.auto-scaler.k0'),
        metrics: scalingMetrics,
        confidence: 0,
        timestamp: now,
      };
    }

    const decision: ScalingDecision = {
      moduleId,
      direction,
      currentInstances: metrics.currentInstances,
      targetInstances,
      reason: direction === 'up' ? i18n.t('microfrontend.auto-scaler.k2') : i18n.t('microfrontend.auto-scaler.k1'),
      metrics: scalingMetrics,
      confidence,
      timestamp: now,
    };

    const event: ScalingEvent = {
      id: `scale-${now}-${Math.random().toString(36).slice(2, 11)}`,
      moduleId,
      policyId: policy.id,
      direction,
      fromInstances: metrics.currentInstances,
      toInstances: targetInstances,
      status: 'scaling',
      reason: decision.reason,
      triggeredBy: 'auto',
      startedAt: now,
      metricsSnapshot: metrics,
    };

    this.performScaling(moduleId, targetInstances, direction, event);
    return decision;
  }

  preWarm(moduleId: string, instances: number): ScalingEvent | null {
    const count = this.getInstanceCount(moduleId);
    const target = Math.min(count.max, count.current + instances);

    if (target <= count.current) return null;

    const policies = this.getPoliciesByModule(moduleId);
    const policy = policies[0];

    const event: ScalingEvent = {
      id: `scale-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      moduleId,
      policyId: policy?.id || 'prewarm',
      direction: 'up',
      fromInstances: count.current,
      toInstances: target,
      status: 'scaling',
      reason: i18n.t('microfrontend.auto-scaler.k3'),
      triggeredBy: 'prewarm',
      startedAt: Date.now(),
    };

    this.performScaling(moduleId, target, 'up', event);
    return event;
  }

  scaleDownToMin(moduleId: string): ScalingEvent | null {
    const count = this.getInstanceCount(moduleId);

    if (count.current <= count.min) return null;

    const policies = this.getPoliciesByModule(moduleId);
    const policy = policies[0];

    const event: ScalingEvent = {
      id: `scale-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      moduleId,
      policyId: policy?.id || 'manual',
      direction: 'down',
      fromInstances: count.current,
      toInstances: count.min,
      status: 'scaling',
      reason: i18n.t('microfrontend.auto-scaler.k4'),
      triggeredBy: 'manual',
      startedAt: Date.now(),
    };

    this.performScaling(moduleId, count.min, 'down', event);
    return event;
  }

  getScalingHistory(options?: {
    moduleId?: string;
    direction?: ScalingDirection;
    status?: ScalingStatus;
    limit?: number;
    startTime?: number;
    endTime?: number;
  }): ScalingEvent[] {
    let events = [...this.scalingHistory];

    if (options?.moduleId) {
      events = events.filter((e) => e.moduleId === options.moduleId);
    }
    if (options?.direction) {
      events = events.filter((e) => e.direction === options.direction);
    }
    if (options?.status) {
      events = events.filter((e) => e.status === options.status);
    }
    if (options?.startTime) {
      events = events.filter((e) => e.startedAt >= options.startTime!);
    }
    if (options?.endTime) {
      events = events.filter((e) => e.startedAt <= options.endTime!);
    }

    events.sort((a, b) => b.startedAt - a.startedAt);

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  getModuleMetrics(moduleId: string): ModuleMetrics | undefined {
    return this.moduleMetrics.get(moduleId);
  }

  reportMetrics(metrics: ModuleMetrics): void {
    this.moduleMetrics.set(metrics.moduleId, metrics);
  }

  subscribe(callback: (event: ScalingEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getConfig(): AutoScalerConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AutoScalerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.policies.clear();
    this.instances.clear();
    this.moduleMetrics.clear();
    this.scalingHistory = [];
    this.lastScalingTime.clear();
  }

  private ensureMinInstances(moduleId: string, minInstances: number): void {
    const instances = this.instances.get(moduleId) || [];
    const currentRunning = instances.filter((i) => i.status === 'running').length;

    if (currentRunning < minInstances) {
      const toAdd = minInstances - currentRunning;
      for (let i = 0; i < toAdd; i++) {
        const instance: ModuleInstanceInfo = {
          id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          moduleId,
          instanceNumber: instances.length + i + 1,
          status: 'running',
          createdAt: Date.now(),
          startedAt: Date.now(),
        };
        instances.push(instance);
      }
      this.instances.set(moduleId, instances);
    }
  }

  private performScaling(
    moduleId: string,
    targetInstances: number,
    direction: ScalingDirection,
    event: ScalingEvent
  ): void {
    this.scalingHistory.unshift(event);
    if (this.scalingHistory.length > this.config.maxScalingHistory) {
      this.scalingHistory.pop();
    }

    const lastScaling = this.lastScalingTime.get(moduleId) || { up: 0, down: 0 };
    if (direction === 'up') {
      lastScaling.up = Date.now();
    } else {
      lastScaling.down = Date.now();
    }
    this.lastScalingTime.set(moduleId, lastScaling);

    this.simulateScaling(moduleId, targetInstances, direction, event);

    this.listeners.forEach((listener) => listener(event));
  }

  private simulateScaling(
    moduleId: string,
    targetInstances: number,
    direction: ScalingDirection,
    event: ScalingEvent
  ): void {
    const instances = this.instances.get(moduleId) || [];
    const currentRunning = instances.filter((i) => i.status === 'running').length;

    if (direction === 'up') {
      const toAdd = targetInstances - currentRunning;
      for (let i = 0; i < toAdd; i++) {
        const instance: ModuleInstanceInfo = {
          id: `inst-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          moduleId,
          instanceNumber: instances.length + i + 1,
          status: 'starting',
          createdAt: Date.now(),
        };
        instances.push(instance);

        setTimeout(
          () => {
            instance.status = 'running';
            instance.startedAt = Date.now();
          },
          100 + Math.random() * 500
        );
      }
    } else {
      const toRemove = currentRunning - targetInstances;
      const runningInstances = instances.filter((i) => i.status === 'running');
      const toStop = runningInstances.slice(-toRemove);

      for (const instance of toStop) {
        instance.status = 'stopping';
        setTimeout(
          () => {
            instance.status = 'stopped';
            instance.stoppedAt = Date.now();
          },
          100 + Math.random() * 300
        );
      }
    }

    this.instances.set(moduleId, instances);

    setTimeout(() => {
      event.status = 'completed';
      event.completedAt = Date.now();
    }, 500);
  }

  private evaluateScalingNeed(
    metrics: ScalingMetric[],
    policy: ScalingPolicy
  ): { shouldScaleUp: boolean; shouldScaleDown: boolean; confidence: number } {
    if (metrics.length === 0) {
      return { shouldScaleUp: false, shouldScaleDown: false, confidence: 0 };
    }

    const scaleUpSignals = metrics.filter(
      (m) => m.threshold && m.value > m.threshold.scaleUp
    ).length;
    const scaleDownSignals = metrics.filter(
      (m) => m.threshold && m.value < m.threshold.scaleDown
    ).length;

    let shouldScaleUp = false;
    let shouldScaleDown = false;
    let confidence = 0;

    switch (policy.scaleUpStrategy) {
      case 'any':
        shouldScaleUp = scaleUpSignals > 0;
        confidence = metrics.length > 0 ? scaleUpSignals / metrics.length : 0;
        break;
      case 'average':
      case 'weighted':
      default: {
        const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
        let weightedScore = 0;
        for (const m of metrics) {
          if (m.threshold && m.value > m.threshold.scaleUp) {
            weightedScore += m.weight;
          }
        }
        shouldScaleUp = totalWeight > 0 && weightedScore / totalWeight > 0.5;
        confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
        break;
      }
    }

    switch (policy.scaleDownStrategy) {
      case 'all':
        shouldScaleDown = scaleDownSignals === metrics.length;
        confidence = metrics.length > 0 ? scaleDownSignals / metrics.length : 0;
        break;
      case 'average':
      case 'weighted':
      default: {
        const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
        let weightedScore = 0;
        for (const m of metrics) {
          if (m.threshold && m.value < m.threshold.scaleDown) {
            weightedScore += m.weight;
          }
        }
        shouldScaleDown = totalWeight > 0 && weightedScore / totalWeight > 0.5;
        confidence = Math.max(confidence, totalWeight > 0 ? weightedScore / totalWeight : 0);
        break;
      }
    }

    return { shouldScaleUp, shouldScaleDown, confidence };
  }

  private getMetricValue(metrics: ModuleMetrics, name: string): number {
    switch (name) {
      case 'cpu':
      case 'cpuUsage':
        return metrics.cpuUsage;
      case 'memory':
      case 'memoryUsage':
        return metrics.memoryUsage;
      case 'requestRate':
      case 'requests':
        return metrics.requestRate;
      case 'responseTime':
      case 'latency':
        return metrics.responseTime;
      case 'errorRate':
      case 'errors':
        return metrics.errorRate;
      case 'queueSize':
        return metrics.queueSize || 0;
      case 'activeConnections':
        return metrics.activeConnections || 0;
      default:
        return 0;
    }
  }
}

export const autoScaler = new AutoScaler();
export default autoScaler;
