import i18n from '@/i18n';
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

type EventListener = (event: AgentEvent) => void;

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_STEP_DELAY = 100;

class ToolRegistryImpl implements ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }
}

export class AutonomousAgent {
  private static instance: AutonomousAgent;
  private tasks = new Map<string, Task>();
  private listeners = new Set<EventListener>();
  private toolRegistry: ToolRegistry;
  private taskCounter = 0;

  private constructor() {
    this.toolRegistry = new ToolRegistryImpl();
    this.registerDefaultTools();
  }

  static getInstance(): AutonomousAgent {
    if (!AutonomousAgent.instance) {
      AutonomousAgent.instance = new AutonomousAgent();
    }
    return AutonomousAgent.instance;
  }

  on(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: AgentEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  getTools(): ToolRegistry {
    return this.toolRegistry;
  }

  private registerDefaultTools(): void {
    this.toolRegistry.register({
      name: 'browser_navigate',
      description: i18n.t('ai.autonomous-agent.url_0'),
      execute: async (input) => {
        const url = (input as { url: string })?.url;
        if (url) {
          window.open(url, '_blank');
          return { success: true, url };
        }
        throw new Error(i18n.t('ai.autonomous-agent.url_1'));
      },
    });

    this.toolRegistry.register({
      name: 'file_read',
      description: i18n.t('ai.autonomous-agent.k2'),
      execute: async (input) => {
        const path = (input as { path: string })?.path;
        return { success: true, path, content: `${i18n.t('ai.autonomous-agent.k0')}${path}]` };
      },
    });

    this.toolRegistry.register({
      name: 'api_call',
      description: i18n.t('ai.autonomous-agent.api_3'),
      execute: async (input, _context) => {
        const {
          endpoint,
          method = 'GET',
          data,
        } = input as {
          endpoint: string;
          method?: string;
          data?: unknown;
        };
        try {
          const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: data ? JSON.stringify(data) : undefined,
          });
          const result = await response.json().catch(() => ({}));
          return { success: response.ok, status: response.status, data: result };
        } catch (error) {
          throw new Error(`${i18n.t('ai.autonomous-agent.api_1')}${(error as Error).message}`);
        }
      },
    });

    this.toolRegistry.register({
      name: 'code_execute',
      description: i18n.t('ai.autonomous-agent.javascript_4'),
      execute: async (input, context) => {
        const code = (input as { code: string })?.code;
        if (!code) throw new Error(i18n.t('ai.autonomous-agent.k5'));
        try {
          const result = await new Function(`
            const context = arguments[0];
            return (async () => { ${code} })();
          `)(context);
          return { success: true, result };
        } catch (error) {
          throw new Error(`${i18n.t('ai.autonomous-agent.k2')}${(error as Error).message}`);
        }
      },
    });

    this.toolRegistry.register({
      name: 'data_transform',
      description: i18n.t('ai.autonomous-agent.k6'),
      execute: async (input) => {
        const { data, operation } = input as {
          data: unknown;
          operation: string;
          params?: Record<string, unknown>;
        };
        switch (operation) {
          case 'sort':
            return { success: true, result: data };
          case 'filter':
            return { success: true, result: data };
          case 'aggregate':
            return { success: true, result: data };
          default:
            return { success: true, result: data };
        }
      },
    });

    this.toolRegistry.register({
      name: 'notification_send',
      description: i18n.t('ai.autonomous-agent.k7'),
      execute: async (input, context) => {
        const { message, channel = 'system' } = input as {
          message: string;
          channel?: string;
        };
        return {
          success: true,
          sent: true,
          channel,
          message,
          recipient: context.user.id,
        };
      },
    });
  }

  async planTask(description: string, context: ExecutionContext): Promise<TaskPlan> {
    const taskId = this.generateTaskId();
    const steps = this.decomposeTask(description, context);
    return { taskId, steps };
  }

  private decomposeTask(
    description: string,
    _context: ExecutionContext
  ): Array<{ description: string; tool?: string }> {
    const tools = this.toolRegistry.list();
    const lower = description.toLowerCase();

    const steps: Array<{ description: string; tool?: string }> = [];

    if (lower.includes('navigate') || lower.includes(i18n.t('ai.autonomous-agent.k8')) || lower.includes('browse')) {
      steps.push({ description: i18n.t('ai.autonomous-agent.k9'), tool: 'browser_navigate' });
    }

    if (lower.includes('api') || lower.includes(i18n.t('ai.autonomous-agent.k10')) || lower.includes('call')) {
      steps.push({ description: i18n.t('ai.autonomous-agent.api_11'), tool: 'api_call' });
    }

    if (lower.includes('code') || lower.includes(i18n.t('ai.autonomous-agent.k12')) || lower.includes('execute')) {
      steps.push({ description: i18n.t('ai.autonomous-agent.k13'), tool: 'code_execute' });
    }

    if (lower.includes('data') || lower.includes(i18n.t('ai.autonomous-agent.k14')) || lower.includes('transform')) {
      steps.push({ description: i18n.t('ai.autonomous-agent.k15'), tool: 'data_transform' });
    }

    if (lower.includes('notify') || lower.includes(i18n.t('ai.autonomous-agent.k16')) || lower.includes('alert')) {
      steps.push({ description: i18n.t('ai.autonomous-agent.k17'), tool: 'notification_send' });
    }

    if (lower.includes('file') || lower.includes(i18n.t('ai.autonomous-agent.k18')) || lower.includes('read')) {
      steps.push({ description: i18n.t('ai.autonomous-agent.k19'), tool: 'file_read' });
    }

    if (steps.length === 0) {
      steps.push({ description: `${i18n.t('ai.autonomous-agent.k3')}${description}` });
      steps.push({ description: i18n.t('ai.autonomous-agent.k20'), tool: tools[0]?.name });
      steps.push({ description: i18n.t('ai.autonomous-agent.k21') });
    }

    return steps;
  }

  async executeTask(
    description: string,
    context: ExecutionContext,
    options?: { maxRetries?: number }
  ): Promise<Task> {
    const taskId = this.generateTaskId();
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

    const task: Task = {
      id: taskId,
      description,
      status: 'pending',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
      maxRetries,
    };

    this.tasks.set(taskId, task);

    const plan = await this.planTask(description, context);
    task.steps = plan.steps.map((s, idx) => ({
      id: `${taskId}-step-${idx}`,
      description: s.description,
      status: 'pending',
    }));

    task.status = 'running';
    task.updatedAt = Date.now();
    this.emit({
      type: 'task_started',
      taskId,
      message: `${i18n.t('ai.autonomous-agent.k4')}${description}`,
      timestamp: Date.now(),
    });

    try {
      for (let i = 0; i < task.steps.length; i++) {
        const step = task.steps[i];
        step.status = 'running';
        task.updatedAt = Date.now();

        this.emit({
          type: 'step_started',
          taskId,
          stepId: step.id,
          message: `${i18n.t('ai.autonomous-agent.k5')}${i + 1}/${task.steps.length}: ${step.description}`,
          timestamp: Date.now(),
          progress: (i / task.steps.length) * 100,
        });

        this.emit({
          type: 'progress_update',
          taskId,
          stepId: step.id,
          message: `${i18n.t('ai.autonomous-agent.k6')}${i}/${task.steps.length}`,
          timestamp: Date.now(),
          progress: (i / task.steps.length) * 100,
        });

        await this.delay(DEFAULT_STEP_DELAY);

        const stepPlan = plan.steps[i];
        const result = await this.executeStep(step, stepPlan?.tool, context, task);

        if (result.success) {
          step.status = 'completed';
          step.result = result.result;
          this.emit({
            type: 'step_completed',
            taskId,
            stepId: step.id,
            message: `${i18n.t('ai.autonomous-agent.k7')}${step.description}`,
            timestamp: Date.now(),
          });
        } else {
          step.status = 'failed';
          step.error = result.error;
          task.retryCount++;

          if (task.retryCount < task.maxRetries) {
            i--;
            this.emit({
              type: 'step_failed',
              taskId,
              stepId: step.id,
              message: `${i18n.t('ai.autonomous-agent.k8')}${task.retryCount}/${task.maxRetries}: ${step.error}`,
              timestamp: Date.now(),
            });
            await this.delay(DEFAULT_STEP_DELAY * 2);
          } else {
            this.emit({
              type: 'step_failed',
              taskId,
              stepId: step.id,
              message: `${i18n.t('ai.autonomous-agent.k9')}${step.error}`,
              timestamp: Date.now(),
            });
            throw new Error(`${i18n.t('ai.autonomous-agent.k10')}${step.error}`);
          }
        }

        this.emit({
          type: 'progress_update',
          taskId,
          stepId: step.id,
          message: `${i18n.t('ai.autonomous-agent.k11')}${i + 1}/${task.steps.length}`,
          timestamp: Date.now(),
          progress: ((i + 1) / task.steps.length) * 100,
        });
      }

      task.status = 'completed';
      task.result = task.steps.map((s) => s.result);
      task.updatedAt = Date.now();

      this.emit({
        type: 'task_completed',
        taskId,
        message: `${i18n.t('ai.autonomous-agent.k12')}${description}`,
        timestamp: Date.now(),
        progress: 100,
      });
    } catch (error) {
      task.status = 'failed';
      task.result = error instanceof Error ? error.message : String(error);
      task.updatedAt = Date.now();

      this.emit({
        type: 'task_failed',
        taskId,
        message: `${i18n.t('ai.autonomous-agent.k13')}${(error as Error).message}`,
        timestamp: Date.now(),
      });
    }

    return task;
  }

  async executeStep(
    step: TaskStep,
    toolName: string | undefined,
    context: ExecutionContext,
    _task?: Task
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    if (toolName) {
      const tool = this.toolRegistry.get(toolName);
      if (tool) {
        try {
          const result = await tool.execute(
            { stepId: step.id, description: step.description },
            context
          );
          return { success: true, result };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      }
    }

    return {
      success: true,
      result: { simulated: true, description: step.description },
    };
  }

  getStatus(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  listTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running' || task.status === 'pending') {
      task.status = 'failed';
      task.updatedAt = Date.now();
      this.emit({
        type: 'task_cancelled',
        taskId,
        message: `${i18n.t('ai.autonomous-agent.k14')}${task.description}`,
        timestamp: Date.now(),
      });
      return true;
    }
    return false;
  }

  clearTasks(): void {
    this.tasks.clear();
  }

  private generateTaskId(): string {
    this.taskCounter++;
    return `task-${Date.now()}-${this.taskCounter}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const autonomousAgent = AutonomousAgent.getInstance();
