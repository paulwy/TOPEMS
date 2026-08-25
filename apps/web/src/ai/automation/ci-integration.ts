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

export type CIEvent =
  | { type: 'pipeline_triggered'; run_id: string; pipeline: string; trigger: TriggerType }
  | { type: 'stage_started'; run_id: string; stage: string }
  | { type: 'stage_completed'; run_id: string; stage: string; duration_ms: number }
  | { type: 'stage_failed'; run_id: string; stage: string; error: string }
  | { type: 'pipeline_completed'; run_id: string; status: CIStatus; duration_ms: number }
  | { type: 'pipeline_cancelled'; run_id: string }
  | { type: 'pipeline_configured'; pipeline: string };
