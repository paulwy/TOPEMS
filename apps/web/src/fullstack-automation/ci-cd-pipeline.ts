import { logger } from '@/utils/logger';

export type PipelineStageType = 'build' | 'test' | 'deploy' | 'notify';
export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type Environment = 'dev' | 'staging' | 'prod';

export interface PipelineStage {
  name: string;
  type: PipelineStageType;
  config: Record<string, unknown>;
  depends_on: string[];
  status: PipelineStatus;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  triggers: string[];
  status: PipelineStatus;
  environment: Environment;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface StageRun {
  stage_name: string;
  status: RunStatus;
  started_at?: string;
  ended_at?: string;
  logs: string[];
  duration_ms?: number;
}

export interface PipelineRun {
  id: string;
  pipeline_id: string;
  pipeline_name: string;
  environment: Environment;
  started_at: string;
  ended_at?: string;
  stages_run: StageRun[];
  status: RunStatus;
  logs: string[];
  triggered_by?: string;
}

const PIPELINE_STORE = new Map<string, Pipeline>();
const RUN_STORE = new Map<string, PipelineRun[]>();
const EVENT_LISTENERS = new Map<string, Set<(event: PipelineEvent) => void>>();

export interface PipelineEvent {
  type:
    | 'pipeline_created'
    | 'pipeline_started'
    | 'stage_started'
    | 'stage_completed'
    | 'stage_failed'
    | 'pipeline_completed'
    | 'pipeline_failed'
    | 'run_cancelled';
  pipeline_id: string;
  run_id?: string;
  stage_name?: string;
  timestamp: string;
  message?: string;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emitEvent(event: PipelineEvent): void {
  const listeners = EVENT_LISTENERS.get(event.type);
  if (listeners) {
    listeners.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        logger.error('[CICDPipeline] Event listener error', err);
      }
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CICDPipeline {
  private static instance: CICDPipeline;

  static getInstance(): CICDPipeline {
    if (!CICDPipeline.instance) {
      CICDPipeline.instance = new CICDPipeline();
    }
    return CICDPipeline.instance;
  }

  on(event: PipelineEvent['type'], fn: (event: PipelineEvent) => void): () => void {
    if (!EVENT_LISTENERS.has(event)) {
      EVENT_LISTENERS.set(event, new Set());
    }
    EVENT_LISTENERS.get(event)!.add(fn);
    return () => {
      EVENT_LISTENERS.get(event)?.delete(fn);
    };
  }

  createPipeline(params: {
    name: string;
    stages: Omit<PipelineStage, 'status'>[];
    triggers?: string[];
    environment?: Environment;
    description?: string;
  }): Pipeline {
    const now = new Date().toISOString();
    const pipeline: Pipeline = {
      id: generateId('pipe'),
      name: params.name,
      stages: params.stages.map((s) => ({ ...s, status: 'idle' })),
      triggers: params.triggers || ['manual'],
      status: 'idle',
      environment: params.environment || 'dev',
      description: params.description,
      created_at: now,
      updated_at: now,
    };
    PIPELINE_STORE.set(pipeline.id, pipeline);
    logger.info('[CICDPipeline] Pipeline created:', pipeline.name);
    emitEvent({ type: 'pipeline_created', pipeline_id: pipeline.id, timestamp: now });
    return pipeline;
  }

  listPipelines(environment?: Environment): Pipeline[] {
    const pipelines = Array.from(PIPELINE_STORE.values());
    if (environment) {
      return pipelines.filter((p) => p.environment === environment);
    }
    return pipelines;
  }

  getPipeline(id: string): Pipeline | undefined {
    return PIPELINE_STORE.get(id);
  }

  async runPipeline(pipelineId: string, triggeredBy?: string): Promise<PipelineRun> {
    const pipeline = PIPELINE_STORE.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }
    if (pipeline.status === 'running') {
      throw new Error(`Pipeline is already running: ${pipelineId}`);
    }

    const runId = generateId('run');
    const now = new Date().toISOString();
    const pipelineRun: PipelineRun = {
      id: runId,
      pipeline_id: pipeline.id,
      pipeline_name: pipeline.name,
      environment: pipeline.environment,
      started_at: now,
      stages_run: pipeline.stages.map((s) => ({
        stage_name: s.name,
        status: 'pending',
        logs: [],
      })),
      status: 'running',
      logs: [`[${now}] Pipeline "${pipeline.name}" started`],
      triggered_by: triggeredBy || 'manual',
    };

    pipeline.status = 'running';
    pipeline.updated_at = now;
    RUN_STORE.set(runId, [pipelineRun]);

    emitEvent({
      type: 'pipeline_started',
      pipeline_id: pipeline.id,
      run_id: runId,
      timestamp: now,
    });

    void this.executeStages(pipeline, pipelineRun);

    return pipelineRun;
  }

  private async executeStages(pipeline: Pipeline, run: PipelineRun): Promise<void> {
    const completedStages = new Set<string>();
    const failedStages = new Set<string>();
    const stageMap = new Map(run.stages_run.map((s) => [s.stage_name, s]));

    for (const stage of pipeline.stages) {
      const stageRun = stageMap.get(stage.name)!;

      const depsMet = stage.depends_on.every((dep) => completedStages.has(dep));
      const depsFailed = stage.depends_on.some((dep) => failedStages.has(dep));

      if (depsFailed || !depsMet) {
        stageRun.status = depsFailed ? 'cancelled' : 'pending';
        stageRun.logs.push(`Stage "${stage.name}" skipped due to dependency failure`);
        if (depsFailed) {
          failedStages.add(stage.name);
        }
        continue;
      }

      stageRun.status = 'running';
      stageRun.started_at = new Date().toISOString();
      stage.status = 'running';
      run.logs.push(`[${stageRun.started_at}] Stage "${stage.name}" (${stage.type}) started`);

      emitEvent({
        type: 'stage_started',
        pipeline_id: pipeline.id,
        run_id: run.id,
        stage_name: stage.name,
        timestamp: stageRun.started_at,
      });

      const startTime = Date.now();

      try {
        await this.simulateStageExecution(stage, run);
        const endTime = new Date().toISOString();
        stageRun.status = 'completed';
        stageRun.ended_at = endTime;
        stageRun.duration_ms = Date.now() - startTime;
        stage.status = 'completed';
        stageRun.logs.push(`Stage "${stage.name}" completed in ${stageRun.duration_ms}ms`);
        run.logs.push(`[${endTime}] Stage "${stage.name}" completed successfully`);
        completedStages.add(stage.name);

        emitEvent({
          type: 'stage_completed',
          pipeline_id: pipeline.id,
          run_id: run.id,
          stage_name: stage.name,
          timestamp: endTime,
        });
      } catch (err) {
        const endTime = new Date().toISOString();
        stageRun.status = 'failed';
        stageRun.ended_at = endTime;
        stageRun.duration_ms = Date.now() - startTime;
        stage.status = 'failed';
        stageRun.logs.push(`Stage "${stage.name}" failed: ${(err as Error).message}`);
        run.logs.push(`[${endTime}] Stage "${stage.name}" failed: ${(err as Error).message}`);
        failedStages.add(stage.name);

        emitEvent({
          type: 'stage_failed',
          pipeline_id: pipeline.id,
          run_id: run.id,
          stage_name: stage.name,
          timestamp: endTime,
          message: (err as Error).message,
        });

        break;
      }
    }

    const finalStatus: RunStatus =
      failedStages.size > 0
        ? 'failed'
        : completedStages.size === pipeline.stages.length
          ? 'completed'
          : 'cancelled';

    run.status = finalStatus;
    run.ended_at = new Date().toISOString();
    pipeline.status = finalStatus === 'completed' ? 'completed' : 'idle';
    pipeline.updated_at = run.ended_at;

    run.logs.push(`[${run.ended_at}] Pipeline "${pipeline.name}" ${finalStatus}`);

    emitEvent({
      type: finalStatus === 'completed' ? 'pipeline_completed' : 'pipeline_failed',
      pipeline_id: pipeline.id,
      run_id: run.id,
      timestamp: run.ended_at,
    });
  }

  private async simulateStageExecution(stage: PipelineStage, run: PipelineRun): Promise<void> {
    const duration = (stage.config.duration as number) || 1000;
    const failRate = (stage.config.failRate as number) || 0;

    run.stages_run
      .find((s) => s.stage_name === stage.name)!
      .logs.push(`Executing ${stage.type} stage: ${stage.name}`);

    await sleep(duration);

    if (Math.random() < failRate) {
      throw new Error(`Simulated failure in stage "${stage.name}"`);
    }
  }

  cancelRun(runId: string): boolean {
    const runs = RUN_STORE.get(runId);
    if (!runs || runs.length === 0) return false;

    const run = runs[0];
    if (run.status !== 'running') return false;

    run.status = 'cancelled';
    run.ended_at = new Date().toISOString();
    run.logs.push(`[${run.ended_at}] Run cancelled by user`);

    const pipeline = PIPELINE_STORE.get(run.pipeline_id);
    if (pipeline) {
      pipeline.status = 'idle';
      pipeline.updated_at = run.ended_at;
    }

    emitEvent({
      type: 'run_cancelled',
      pipeline_id: run.pipeline_id,
      run_id: run.id,
      timestamp: run.ended_at,
    });

    logger.info('[CICDPipeline] Run cancelled:', runId);
    return true;
  }

  getPipelineStatus(pipelineId: string): Pipeline | undefined {
    return PIPELINE_STORE.get(pipelineId);
  }

  getRunHistory(pipelineId?: string, limit: number = 20): PipelineRun[] {
    const allRuns = Array.from(RUN_STORE.values()).flat();
    const filtered = pipelineId ? allRuns.filter((r) => r.pipeline_id === pipelineId) : allRuns;
    return filtered.slice(0, limit);
  }

  getRun(runId: string): PipelineRun | undefined {
    const runs = RUN_STORE.get(runId);
    return runs?.[0];
  }

  deletePipeline(pipelineId: string): boolean {
    return PIPELINE_STORE.delete(pipelineId);
  }

  clearAll(): void {
    PIPELINE_STORE.clear();
    RUN_STORE.clear();
    EVENT_LISTENERS.clear();
    logger.info('[CICDPipeline] All data cleared');
  }
}

export const ciPipeline = CICDPipeline.getInstance();
