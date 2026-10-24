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
