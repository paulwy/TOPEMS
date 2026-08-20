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


export type CIEvent =
  | { type: 'pipeline_triggered'; run_id: string; pipeline: string; trigger: TriggerType }
  | { type: 'stage_started'; run_id: string; stage: string }
  | { type: 'stage_completed'; run_id: string; stage: string; duration_ms: number }
  | { type: 'stage_failed'; run_id: string; stage: string; error: string }
  | { type: 'pipeline_completed'; run_id: string; status: CIStatus; duration_ms: number }
  | { type: 'pipeline_cancelled'; run_id: string }
  | { type: 'pipeline_configured'; pipeline: string };
