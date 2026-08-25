export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface TaskStep {
  id: string;
  description: string;
  status: TaskStatus;
  result?: unknown;
  error?: string;
}

export interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  steps: TaskStep[];
  result?: unknown;
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
}

export interface ExecutionContext {
  user: { id: string; name: string; role: string };
  session: { id: string; startedAt: number };
  memory: Map<string, unknown>;
  environment: Record<string, unknown>;
  tools: ToolRegistry;
}

export interface Tool {
  name: string;
  description: string;
  execute: (input: unknown, context: ExecutionContext) => Promise<unknown>;
}

export interface ToolRegistry {
  register: (tool: Tool) => void;
  get: (name: string) => Tool | undefined;
  list: () => Tool[];
}

export interface TaskPlan {
  taskId: string;
  steps: Array<{ description: string; tool?: string }>;
}

export interface AgentEvent {
  type:
    | 'task_started'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'task_completed'
    | 'task_failed'
    | 'task_cancelled'
    | 'progress_update';
  taskId: string;
  stepId?: string;
  message: string;
  timestamp: number;
  progress?: number;
}
