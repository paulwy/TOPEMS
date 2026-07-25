export type CIProvider = 'github' | 'gitlab' | 'jenkins';
export type CIStatus = 'idle' | 'running' | 'success' | 'failed' | 'cancelled' | 'pending';
export type TriggerType = 'push' | 'pull_request' | 'schedule' | 'manual' | 'tag';

export interface CIStage {
  name: string;
  type: 'build' | 'test' | 'lint' | 'deploy' | 'security' | 'notify';
  status: CIStatus;
  duration_ms?: number;
  steps: Array<{
    name: string;
    command: string;
    status: CIStatus;
  }>;
}

export interface CIConfig {
  pipeline: string;
  provider: CIProvider;
  triggers: TriggerType[];
  branches: string[];
  stages: CIStage[];
  notifications: {
    slack?: string;
    email?: string[];
    webhook?: string;
  };
  environment?: string;
  variables?: Record<string, string>;
}

export interface CIResult {
  run_id: string;
  pipeline: string;
  status: CIStatus;
  stages_completed: number;
  total_stages: number;
  duration_ms: number;
  started_at: string;
  finished_at?: string;
  artifacts: Array<{
    name: string;
    url: string;
    size: number;
    type: 'coverage' | 'bundle' | 'test-report' | 'build';
  }>;
  logs: string[];
}

export interface RunArtifact {
  name: string;
  url: string;
  size: number;
  type: 'coverage' | 'bundle' | 'test-report' | 'build';
}

const generateRunId = () => `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_CONFIGS: CIConfig[] = [
  {
    pipeline: 'TOPEMS Frontend CI',
    provider: 'github',
    triggers: ['push', 'pull_request'],
    branches: ['main', 'develop'],
    stages: [
      {
        name: 'lint',
        type: 'lint',
        status: 'idle',
        steps: [
          { name: 'ESLint', command: 'npm run lint', status: 'idle' },
          { name: 'Prettier', command: 'npm run format:check', status: 'idle' },
        ],
      },
      {
        name: 'test',
        type: 'test',
        status: 'idle',
        steps: [
          { name: 'Unit Tests', command: 'npm run test:unit', status: 'idle' },
          { name: 'Integration Tests', command: 'npm run test:integration', status: 'idle' },
          { name: 'E2E Tests', command: 'npm run test:e2e', status: 'idle' },
        ],
      },
      {
        name: 'build',
        type: 'build',
        status: 'idle',
        steps: [
          { name: 'Install', command: 'npm ci', status: 'idle' },
          { name: 'Build', command: 'npm run build', status: 'idle' },
        ],
      },
      {
        name: 'security',
        type: 'security',
        status: 'idle',
        steps: [
          { name: 'SAST Scan', command: 'npm run security:scan', status: 'idle' },
          { name: 'Dependency Audit', command: 'npm audit', status: 'idle' },
        ],
      },
      {
        name: 'deploy',
        type: 'deploy',
        status: 'idle',
        steps: [
          { name: 'Deploy to Staging', command: 'npm run deploy:staging', status: 'idle' },
          { name: 'Deploy to Production', command: 'npm run deploy:prod', status: 'idle' },
        ],
      },
    ],
    notifications: {
      slack: '#ci-notifications',
      email: ['dev-team@topems.com'],
    },
    environment: 'production',
    variables: {
      NODE_ENV: 'production',
      CI: 'true',
    },
  },
  {
    pipeline: 'TOPEMS Backend CI',
    provider: 'gitlab',
    triggers: ['push', 'schedule'],
    branches: ['main', 'release/*'],
    stages: [
      {
        name: 'build',
        type: 'build',
        status: 'idle',
        steps: [{ name: 'Maven Build', command: 'mvn clean compile', status: 'idle' }],
      },
      {
        name: 'test',
        type: 'test',
        status: 'idle',
        steps: [
          { name: 'Unit Tests', command: 'mvn test', status: 'idle' },
          { name: 'Integration Tests', command: 'mvn verify', status: 'idle' },
        ],
      },
      {
        name: 'deploy',
        type: 'deploy',
        status: 'idle',
        steps: [
          { name: 'Docker Build', command: 'docker build -t topems .', status: 'idle' },
          { name: 'K8s Deploy', command: 'kubectl apply -f k8s/', status: 'idle' },
        ],
      },
    ],
    notifications: {
      webhook: 'https://hooks.gitlab.com/ci',
    },
    environment: 'staging',
  },
];

class CIIntegratorImpl {
  private configs: Map<string, CIConfig> = new Map();
  private runs: Map<string, CIResult[]> = new Map();
  private listeners: Set<(event: CIEvent) => void> = new Set();

  constructor() {
    for (const config of DEFAULT_CONFIGS) {
      this.configs.set(config.pipeline, {
        ...config,
        stages: config.stages.map((s) => ({
          ...s,
          status: 'idle',
          steps: s.steps.map((step) => ({ ...step, status: 'idle' })),
        })),
      });
    }
  }

  on(listener: (event: CIEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: CIEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignore
      }
    }
  }

  list_configs(): CIConfig[] {
    return Array.from(this.configs.values());
  }

  trigger_pipeline(pipelineName: string, trigger: TriggerType = 'manual'): CIResult {
    const config = this.configs.get(pipelineName);
    if (!config) {
      throw new Error(`Pipeline "${pipelineName}" not found`);
    }

    const runId = generateRunId();
    const result: CIResult = {
      run_id: runId,
      pipeline: pipelineName,
      status: 'running',
      stages_completed: 0,
      total_stages: config.stages.length,
      duration_ms: 0,
      started_at: new Date().toISOString(),
      artifacts: [],
      logs: [`[${new Date().toISOString()}] Pipeline "${pipelineName}" triggered by ${trigger}`],
    };

    const pipelineRuns = this.runs.get(pipelineName) || [];
    pipelineRuns.unshift(result);
    this.runs.set(pipelineName, pipelineRuns);

    this.emit({ type: 'pipeline_triggered', run_id: runId, pipeline: pipelineName, trigger });

    this.simulatePipelineRun(result, config);

    return result;
  }

  private async simulatePipelineRun(result: CIResult, config: CIConfig): Promise<void> {
    const start = Date.now();
    const logs: string[] = result.logs;

    for (let i = 0; i < config.stages.length; i++) {
      const stage = config.stages[i];
      logs.push(`[${this.timestamp()}] Stage "${stage.name}" (${stage.type}) started`);
      this.emit({ type: 'stage_started', run_id: result.run_id, stage: stage.name });

      await this.delay(200 + Math.random() * 400);

      const stagePassed = Math.random() > 0.1;
      const stageDuration = 200 + Math.random() * 400;

      for (const step of stage.steps) {
        await this.delay(50 + Math.random() * 100);
      }

      if (stagePassed) {
        logs.push(
          `[${this.timestamp()}] Stage "${stage.name}" completed successfully (${Math.round(stageDuration)}ms)`
        );
        result.stages_completed++;
        this.emit({
          type: 'stage_completed',
          run_id: result.run_id,
          stage: stage.name,
          duration_ms: stageDuration,
        });
      } else {
        logs.push(
          `[${this.timestamp()}] Stage "${stage.name}" FAILED - Error in step "${stage.steps[0]?.name}"`
        );
        result.status = 'failed';
        this.emit({
          type: 'stage_failed',
          run_id: result.run_id,
          stage: stage.name,
          error: 'Step execution failed',
        });
        break;
      }

      if (stage.type === 'test' && stagePassed) {
        result.artifacts.push({
          name: 'coverage-report',
          url: `/artifacts/${result.run_id}/coverage.html`,
          size: 245760,
          type: 'coverage',
        });
      }
      if (stage.type === 'build' && stagePassed) {
        result.artifacts.push({
          name: 'build-output',
          url: `/artifacts/${result.run_id}/build.tar.gz`,
          size: 10485760,
          type: 'build',
        });
        result.artifacts.push({
          name: 'bundle-analysis',
          url: `/artifacts/${result.run_id}/bundle.json`,
          size: 40960,
          type: 'bundle',
        });
      }
    }

    result.duration_ms = Date.now() - start;
    result.finished_at = new Date().toISOString();

    if (result.status === 'running') {
      result.status = result.stages_completed === result.total_stages ? 'success' : 'failed';
    }

    logs.push(
      `[${this.timestamp()}] Pipeline ${result.status.toUpperCase()} - ${result.stages_completed}/${result.total_stages} stages (${Math.round(result.duration_ms)}ms)`
    );

    this.emit({
      type: 'pipeline_completed',
      run_id: result.run_id,
      status: result.status,
      duration_ms: result.duration_ms,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  get_pipeline_status(runId: string): CIResult | null {
    for (const runs of this.runs.values()) {
      const found = runs.find((r) => r.run_id === runId);
      if (found) return found;
    }
    return null;
  }

  cancel_pipeline(runId: string): boolean {
    for (const runs of this.runs.values()) {
      const run = runs.find((r) => r.run_id === runId);
      if (run && run.status === 'running') {
        run.status = 'cancelled';
        run.finished_at = new Date().toISOString();
        run.logs.push(`[${this.timestamp()}] Pipeline cancelled by user`);
        this.emit({ type: 'pipeline_cancelled', run_id: runId });
        return true;
      }
    }
    return false;
  }

  get_run_history(pipelineName?: string, limit: number = 20): CIResult[] {
    if (pipelineName) {
      return (this.runs.get(pipelineName) || []).slice(0, limit);
    }
    const all: CIResult[] = [];
    for (const runs of this.runs.values()) {
      all.push(...runs);
    }
    return all.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, limit);
  }

  configure_pipeline(config: CIConfig): void {
    const existing = this.configs.get(config.pipeline);
    if (existing) {
      Object.assign(existing, config);
      existing.stages = config.stages.map((s) => ({
        ...s,
        status: 'idle',
        steps: s.steps.map((step) => ({ ...step, status: 'idle' })),
      }));
    } else {
      this.configs.set(config.pipeline, {
        ...config,
        stages: config.stages.map((s) => ({
          ...s,
          status: 'idle',
          steps: s.steps.map((step) => ({ ...step, status: 'idle' })),
        })),
      });
    }
    this.emit({ type: 'pipeline_configured', pipeline: config.pipeline });
  }

  get_build_logs(runId: string): string[] {
    const run = this.get_pipeline_status(runId);
    return run?.logs || [];
  }

  get_stats(): {
    total_runs: number;
    success_rate: number;
    avg_duration_ms: number;
    by_provider: Record<CIProvider, number>;
  } {
    const all = this.get_run_history(undefined, 100);
    if (all.length === 0) {
      return {
        total_runs: 0,
        success_rate: 0,
        avg_duration_ms: 0,
        by_provider: { github: 0, gitlab: 0, jenkins: 0 },
      };
    }
    const successful = all.filter((r) => r.status === 'success').length;
    const totalDuration = all.reduce((sum, r) => sum + r.duration_ms, 0);
    const by_provider: Record<CIProvider, number> = { github: 0, gitlab: 0, jenkins: 0 };
    for (const config of this.configs.values()) {
      const runs = this.runs.get(config.pipeline) || [];
      by_provider[config.provider] += runs.length;
    }
    return {
      total_runs: all.length,
      success_rate: (successful / all.length) * 100,
      avg_duration_ms: totalDuration / all.length,
      by_provider,
    };
  }
}

export type CIEvent =
  | { type: 'pipeline_triggered'; run_id: string; pipeline: string; trigger: TriggerType }
  | { type: 'stage_started'; run_id: string; stage: string }
  | { type: 'stage_completed'; run_id: string; stage: string; duration_ms: number }
  | { type: 'stage_failed'; run_id: string; stage: string; error: string }
  | { type: 'pipeline_completed'; run_id: string; status: CIStatus; duration_ms: number }
  | { type: 'pipeline_cancelled'; run_id: string }
  | { type: 'pipeline_configured'; pipeline: string };

export const ciIntegrator = new CIIntegratorImpl();
export { CIIntegratorImpl as CIIntegrator };
