import { logger } from '@/utils/logger';
import type { Environment } from './ci-cd-pipeline';

export type DeploymentStrategyType = 'blue-green' | 'canary' | 'rolling';
export type DeploymentStatus =
  'idle' | 'deploying' | 'verifying' | 'promoting' | 'rolling_back' | 'completed' | 'failed';
export type HealthCheckStatus = 'healthy' | 'unhealthy' | 'degraded' | 'unknown';

export interface HealthCheck {
  endpoint: string;
  interval_ms: number;
  timeout_ms: number;
  healthy_threshold: number;
  unhealthy_threshold: number;
}

export interface DeploymentStrategy {
  type: DeploymentStrategyType;
  config: Record<string, unknown>;
  health_check: HealthCheck;
  rollback_enabled: boolean;
}

export interface DeploymentUnit {
  name: string;
  version: string;
  replicas: number;
  status: 'running' | 'idle' | 'deploying';
  traffic_percentage: number;
  health_status: HealthCheckStatus;
}

export interface DeploymentRecord {
  id: string;
  name: string;
  version: string;
  strategy: DeploymentStrategyType;
  environment: Environment;
  status: DeploymentStatus;
  started_at: string;
  ended_at?: string;
  units: DeploymentUnit[];
  logs: string[];
  rollback_count: number;
  promoted: boolean;
  health_check_results: Array<{
    unit: string;
    status: HealthCheckStatus;
    checked_at: string;
    response_time_ms: number;
  }>;
}

const DEPLOYMENT_STORE = new Map<string, DeploymentRecord>();
const STRATEGY_STORE = new Map<string, DeploymentStrategy>();
const HISTORY_STORE = new Map<string, DeploymentRecord[]>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultHealthCheck(): HealthCheck {
  return {
    endpoint: '/health',
    interval_ms: 5000,
    timeout_ms: 3000,
    healthy_threshold: 2,
    unhealthy_threshold: 3,
  };
}

class IntelligentDeployer {
  private static instance: IntelligentDeployer;

  static getInstance(): IntelligentDeployer {
    if (!IntelligentDeployer.instance) {
      IntelligentDeployer.instance = new IntelligentDeployer();
    }
    return IntelligentDeployer.instance;
  }

  setStrategy(strategy: DeploymentStrategy): void {
    STRATEGY_STORE.set(strategy.type, strategy);
    logger.info('[IntelligentDeployer] Strategy set:', strategy.type);
  }

  getStrategy(type: DeploymentStrategyType): DeploymentStrategy | undefined {
    return STRATEGY_STORE.get(type);
  }

  listStrategies(): DeploymentStrategy[] {
    return Array.from(STRATEGY_STORE.values());
  }

  selectStrategy(
    environment: Environment,
    changeRisk: 'low' | 'medium' | 'high'
  ): DeploymentStrategyType {
    if (environment === 'prod') {
      return changeRisk === 'low' ? 'canary' : 'blue-green';
    }
    if (environment === 'staging') {
      return 'canary';
    }
    return 'rolling';
  }

  async deploy(params: {
    name: string;
    version: string;
    environment: Environment;
    strategy?: DeploymentStrategyType;
    replicas?: number;
  }): Promise<DeploymentRecord> {
    const strategyType = params.strategy || this.selectStrategy(params.environment, 'medium');
    const strategy = STRATEGY_STORE.get(strategyType) || this.createDefaultStrategy(strategyType);

    const now = new Date().toISOString();
    const record: DeploymentRecord = {
      id: generateId('deploy'),
      name: params.name,
      version: params.version,
      strategy: strategyType,
      environment: params.environment,
      status: 'deploying',
      started_at: now,
      units: this.buildInitialUnits(
        params.name,
        params.version,
        strategyType,
        params.replicas || 3
      ),
      logs: [`[${now}] Starting ${strategyType} deployment of ${params.name} v${params.version}`],
      rollback_count: 0,
      promoted: false,
      health_check_results: [],
    };

    DEPLOYMENT_STORE.set(record.id, record);

    const history = HISTORY_STORE.get(params.name) || [];
    history.unshift(record);
    HISTORY_STORE.set(params.name, history);

    logger.info('[IntelligentDeployer] Deployment started:', {
      name: params.name,
      version: params.version,
      strategy: strategyType,
    });

    void this.executeDeployment(record, strategy);

    return record;
  }

  private createDefaultStrategy(type: DeploymentStrategyType): DeploymentStrategy {
    const base: DeploymentStrategy = {
      type,
      config: {},
      health_check: defaultHealthCheck(),
      rollback_enabled: true,
    };

    switch (type) {
      case 'blue-green':
        base.config = {
          active_color: 'primary.main',
          standby_color: 'success.main',
          switch_delay_ms: 10000,
        };
        break;
      case 'canary':
        base.config = {
          stable_percentage: 90,
          canary_percentage: 10,
          promotion_threshold: 80,
          analysis_duration_ms: 60000,
        };
        break;
      case 'rolling':
        base.config = {
          max_unavailable: 1,
          batch_size: 1,
          update_interval_ms: 5000,
        };
        break;
    }

    STRATEGY_STORE.set(type, base);
    return base;
  }

  private buildInitialUnits(
    name: string,
    version: string,
    strategy: DeploymentStrategyType,
    replicas: number
  ): DeploymentUnit[] {
    const units: DeploymentUnit[] = [];

    switch (strategy) {
      case 'blue-green':
        units.push({
          name: `${name}-blue`,
          version,
          replicas,
          status: 'running',
          traffic_percentage: 100,
          health_status: 'unknown',
        });
        units.push({
          name: `${name}-green`,
          version,
          replicas,
          status: 'idle',
          traffic_percentage: 0,
          health_status: 'unknown',
        });
        break;
      case 'canary':
        for (let i = 0; i < replicas; i++) {
          units.push({
            name: `${name}-stable-${i}`,
            version,
            replicas: 1,
            status: 'running',
            traffic_percentage: i === 0 ? 10 : 0,
            health_status: 'unknown',
          });
        }
        break;
      case 'rolling':
        for (let i = 0; i < replicas; i++) {
          units.push({
            name: `${name}-${i}`,
            version,
            replicas: 1,
            status: i === 0 ? 'deploying' : 'running',
            traffic_percentage: Math.round((1 / replicas) * 100),
            health_status: 'unknown',
          });
        }
        break;
    }

    return units;
  }

  private async executeDeployment(
    record: DeploymentRecord,
    strategy: DeploymentStrategy
  ): Promise<void> {
    try {
      await this.runHealthChecks(record, strategy);

      if (record.status === 'rolling_back') {
        return;
      }

      switch (strategy.type) {
        case 'blue-green':
          await this.executeBlueGreen(record, strategy);
          break;
        case 'canary':
          await this.executeCanary(record, strategy);
          break;
        case 'rolling':
          await this.executeRolling(record, strategy);
          break;
      }

      record.status = 'completed';
      record.ended_at = new Date().toISOString();
      record.logs.push(`[${record.ended_at}] Deployment completed successfully`);
      logger.info('[IntelligentDeployer] Deployment completed:', record.name);
    } catch (err) {
      record.status = 'failed';
      record.ended_at = new Date().toISOString();
      record.logs.push(`[${record.ended_at}] Deployment failed: ${(err as Error).message}`);
      logger.error('[IntelligentDeployer] Deployment failed:', err);
    }
  }

  private async runHealthChecks(
    record: DeploymentRecord,
    strategy: DeploymentStrategy
  ): Promise<void> {
    record.status = 'verifying';
    record.logs.push(
      `[${new Date().toISOString()}] Running health checks on ${record.units.length} units`
    );

    for (const unit of record.units) {
      const result = {
        unit: unit.name,
        status:
          Math.random() > 0.1
            ? ('healthy' as HealthCheckStatus)
            : ('unhealthy' as HealthCheckStatus),
        checked_at: new Date().toISOString(),
        response_time_ms: Math.floor(Math.random() * 200) + 20,
      };
      unit.health_status = result.status;
      record.health_check_results.push(result);
    }

    const allHealthy = record.units.every((u) => u.health_status === 'healthy');
    if (!allHealthy && strategy.rollback_enabled) {
      record.logs.push(`[${new Date().toISOString()}] Health check failed, initiating rollback`);
      await this.rollback(record.id);
      throw new Error('Health check failed, rolled back');
    }
  }

  private async executeBlueGreen(
    record: DeploymentRecord,
    strategy: DeploymentStrategy
  ): Promise<void> {
    const switchDelay = (strategy.config.switch_delay_ms as number) || 10000;
    record.logs.push(
      `[${new Date().toISOString()}] Blue-Green: switching traffic in ${switchDelay}ms`
    );
    await sleep(switchDelay);

    for (const unit of record.units) {
      if (unit.name.includes('green')) {
        unit.traffic_percentage = 100;
        unit.status = 'running';
      } else {
        unit.traffic_percentage = 0;
        unit.status = 'idle';
      }
    }
    record.promoted = true;
    record.logs.push(`[${new Date().toISOString()}] Blue-Green: traffic switched to green`);
  }

  private async executeCanary(
    record: DeploymentRecord,
    strategy: DeploymentStrategy
  ): Promise<void> {
    const analysisDuration = (strategy.config.analysis_duration_ms as number) || 60000;
    const stablePercentage = (strategy.config.stable_percentage as number) || 90;

    record.logs.push(
      `[${new Date().toISOString()}] Canary: running analysis for ${analysisDuration}ms`
    );
    await sleep(Math.min(analysisDuration, 5000));

    const canaryUnit = record.units[0];
    if (canaryUnit) {
      canaryUnit.traffic_percentage = stablePercentage < 100 ? 100 - stablePercentage : 100;
    }

    for (const unit of record.units) {
      if (unit !== canaryUnit) {
        unit.traffic_percentage = Math.round(
          stablePercentage / Math.max(1, record.units.length - 1)
        );
      }
    }
    record.promoted = true;
    record.logs.push(`[${new Date().toISOString()}] Canary: promotion complete`);
  }

  private async executeRolling(
    record: DeploymentRecord,
    strategy: DeploymentStrategy
  ): Promise<void> {
    const batchSize = (strategy.config.batch_size as number) || 1;
    const interval = (strategy.config.update_interval_ms as number) || 5000;

    record.logs.push(`[${new Date().toISOString()}] Rolling: updating in batches of ${batchSize}`);

    for (let i = 0; i < record.units.length; i += batchSize) {
      const batch = record.units.slice(i, i + batchSize);
      for (const unit of batch) {
        unit.status = 'deploying';
      }
      record.logs.push(
        `[${new Date().toISOString()}] Rolling: batch ${Math.floor(i / batchSize) + 1} updating`
      );
      await sleep(Math.min(interval, 3000));
      for (const unit of batch) {
        unit.status = 'running';
      }
    }
    record.promoted = true;
    record.logs.push(`[${new Date().toISOString()}] Rolling: all units updated`);
  }

  async promoteCandidate(deploymentId: string): Promise<DeploymentRecord | undefined> {
    const record = DEPLOYMENT_STORE.get(deploymentId);
    if (!record || record.status !== 'verifying') {
      return record;
    }

    record.status = 'promoting';
    record.logs.push(`[${new Date().toISOString()}] Manual promotion triggered`);
    await sleep(1000);

    for (const unit of record.units) {
      unit.traffic_percentage = Math.round(100 / record.units.length);
      unit.status = 'running';
    }

    record.promoted = true;
    record.status = 'completed';
    record.ended_at = new Date().toISOString();
    record.logs.push(`[${record.ended_at}] Promotion completed`);

    return record;
  }

  async rollback(deploymentId: string): Promise<DeploymentRecord | undefined> {
    const record = DEPLOYMENT_STORE.get(deploymentId);
    if (!record) return undefined;

    record.status = 'rolling_back';
    record.rollback_count += 1;
    record.logs.push(
      `[${new Date().toISOString()}] Rollback initiated (count: ${record.rollback_count})`
    );

    await sleep(1500);

    for (const unit of record.units) {
      unit.traffic_percentage = Math.round(100 / record.units.length);
      unit.status = unit.status === 'deploying' ? 'running' : unit.status;
    }

    record.status = 'failed';
    record.ended_at = new Date().toISOString();
    record.logs.push(`[${record.ended_at}] Rollback completed`);

    logger.warn('[IntelligentDeployer] Rollback completed:', deploymentId);
    return record;
  }

  getDeploymentStatus(deploymentId: string): DeploymentRecord | undefined {
    return DEPLOYMENT_STORE.get(deploymentId);
  }

  getDeploymentHistory(name?: string, limit: number = 20): DeploymentRecord[] {
    if (name) {
      const history = HISTORY_STORE.get(name) || [];
      return history.slice(0, limit);
    }
    const all = Array.from(DEPLOYMENT_STORE.values());
    return all.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit);
  }

  cancelDeployment(deploymentId: string): boolean {
    const record = DEPLOYMENT_STORE.get(deploymentId);
    if (!record || record.status !== 'deploying') return false;

    record.status = 'failed';
    record.ended_at = new Date().toISOString();
    record.logs.push(`[${record.ended_at}] Deployment cancelled`);
    return true;
  }

  clearAll(): void {
    DEPLOYMENT_STORE.clear();
    STRATEGY_STORE.clear();
    HISTORY_STORE.clear();
    logger.info('[IntelligentDeployer] All data cleared');
  }
}

export const intelligentDeployer = IntelligentDeployer.getInstance();
