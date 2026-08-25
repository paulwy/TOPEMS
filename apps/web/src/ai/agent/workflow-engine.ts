export type WorkflowStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepType = 'action' | 'condition' | 'loop' | 'parallel';
export type TriggerType = 'event' | 'schedule' | 'manual';

export interface WorkflowStep {
  id: string;
  type: StepType;
  config: Record<string, unknown>;
  depends_on?: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  retry_count?: number;
}

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: Map<string, unknown>;
  status: WorkflowStatus;
  createdAt: number;
  updatedAt: number;
  completedSteps: number;
  totalSteps: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: Omit<WorkflowStep, 'status' | 'result' | 'error'>[];
  triggers: WorkflowTrigger[];
  variables?: Record<string, unknown>;
}

export interface WorkflowEvent {
  type:
    | 'workflow_started'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'workflow_completed'
    | 'workflow_failed'
    | 'workflow_paused'
    | 'workflow_resumed'
    | 'workflow_cancelled';
  workflowId: string;
  stepId?: string;
  message: string;
  timestamp: number;
  progress?: number;
}
