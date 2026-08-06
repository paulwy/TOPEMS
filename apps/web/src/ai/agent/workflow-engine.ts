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

type WorkflowListener = (event: WorkflowEvent) => void;

const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_PARALLEL_LIMIT = 5;

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflows = new Map<string, Workflow>();
  private listeners = new Set<WorkflowListener>();
  private templates: WorkflowTemplate[] = [];
  private workflowCounter = 0;

  private constructor() {
    this.registerDefaultTemplates();
  }

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  on(listener: WorkflowListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: WorkflowEvent): void {
    this.listeners.forEach((l) => l(event));
  }

  createWorkflow(
    name: string,
    steps: Omit<WorkflowStep, 'status' | 'result' | 'error'>[],
    triggers?: WorkflowTrigger[],
    variables?: Record<string, unknown>
  ): Workflow {
    const id = this.generateWorkflowId();
    const workflow: Workflow = {
      id,
      name,
      steps: steps.map((s) => ({ ...s, status: 'pending' })),
      triggers: triggers ?? [{ type: 'manual', config: {} }],
      variables: new Map(Object.entries(variables ?? {})),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedSteps: 0,
      totalSteps: steps.length,
    };
    this.workflows.set(id, workflow);
    return workflow;
  }

  async executeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`工作流不存在: ${workflowId}`);

    workflow.status = 'running';
    workflow.updatedAt = Date.now();

    this.emit({
      type: 'workflow_started',
      workflowId,
      message: `工作流已启动: ${workflow.name}`,
      timestamp: Date.now(),
    });

    try {
      const executionOrder = this.resolveExecutionOrder(workflow);

      for (const stepGroup of executionOrder) {
        if ((workflow.status as WorkflowStatus) === 'paused') {
          this.emit({
            type: 'workflow_paused',
            workflowId,
            message: '工作流已暂停',
            timestamp: Date.now(),
          });
          return workflow;
        }

        if (stepGroup.length > 1) {
          await this.executeParallelSteps(workflow, stepGroup);
        } else {
          await this.executeStep(workflow, stepGroup[0]);
        }

        this.emit({
          type: 'workflow_completed',
          workflowId,
          message: `进度: ${workflow.completedSteps}/${workflow.totalSteps}`,
          timestamp: Date.now(),
          progress: (workflow.completedSteps / workflow.totalSteps) * 100,
        });
      }

      workflow.status = 'completed';
      workflow.updatedAt = Date.now();

      this.emit({
        type: 'workflow_completed',
        workflowId,
        message: `工作流已完成: ${workflow.name}`,
        timestamp: Date.now(),
        progress: 100,
      });
    } catch (error) {
      workflow.status = 'failed';
      workflow.updatedAt = Date.now();

      this.emit({
        type: 'workflow_failed',
        workflowId,
        message: `工作流失败: ${(error as Error).message}`,
        timestamp: Date.now(),
      });
    }

    return workflow;
  }

  getWorkflowStatus(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  pauseWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'running') return false;

    workflow.status = 'paused';
    workflow.updatedAt = Date.now();

    this.emit({
      type: 'workflow_paused',
      workflowId,
      message: `工作流已暂停: ${workflow.name}`,
      timestamp: Date.now(),
    });
    return true;
  }

  resumeWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'paused') return false;

    workflow.status = 'running';
    workflow.updatedAt = Date.now();

    this.emit({
      type: 'workflow_resumed',
      workflowId,
      message: `工作流已恢复: ${workflow.name}`,
      timestamp: Date.now(),
    });

    this.executeWorkflow(workflowId).catch(() => {});
    return true;
  }

  cancelWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    workflow.status = 'cancelled';
    workflow.updatedAt = Date.now();

    this.emit({
      type: 'workflow_cancelled',
      workflowId,
      message: `工作流已取消: ${workflow.name}`,
      timestamp: Date.now(),
    });
    return true;
  }

  listTemplates(): WorkflowTemplate[] {
    return [...this.templates];
  }

  createFromTemplate(
    templateId: string,
    name?: string,
    variables?: Record<string, unknown>
  ): Workflow {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) throw new Error(`模板不存在: ${templateId}`);

    return this.createWorkflow(
      name ?? template.name,
      template.steps.map((s) => ({ ...s })),
      template.triggers.map((t) => ({ ...t })),
      { ...template.variables, ...variables }
    );
  }

  deleteWorkflow(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  private resolveExecutionOrder(workflow: Workflow): WorkflowStep[][] {
    const completedIds = new Set(
      workflow.steps.filter((s) => s.status === 'completed').map((s) => s.id)
    );

    const order: WorkflowStep[][] = [];
    const remaining = [...workflow.steps];

    while (remaining.length > 0) {
      const group = remaining.filter(
        (step) => !step.depends_on || step.depends_on.every((dep) => completedIds.has(dep))
      );

      if (group.length === 0) {
        const next = remaining[0];
        group.push(next);
      }

      order.push(group);
      for (const step of group) {
        const idx = remaining.findIndex((s) => s.id === step.id);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }

    return order;
  }

  private async executeStep(workflow: Workflow, step: WorkflowStep): Promise<void> {
    if (step.status === 'completed') return;

    step.status = 'running';
    workflow.updatedAt = Date.now();

    this.emit({
      type: 'step_started',
      workflowId: workflow.id,
      stepId: step.id,
      message: `执行步骤: ${step.config.description ?? step.id}`,
      timestamp: Date.now(),
    });

    try {
      switch (step.type) {
        case 'action':
          step.result = await this.executeAction(workflow, step);
          break;
        case 'condition':
          step.result = await this.evaluateCondition(workflow, step);
          break;
        case 'loop':
          step.result = await this.executeLoop(workflow, step);
          break;
        case 'parallel':
          step.result = await this.executeParallelBlock(workflow, step);
          break;
      }

      step.status = 'completed';
      workflow.completedSteps++;
      workflow.updatedAt = Date.now();

      this.emit({
        type: 'step_completed',
        workflowId: workflow.id,
        stepId: step.id,
        message: `步骤完成: ${step.config.description ?? step.id}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      step.status = 'failed';
      step.error = (error as Error).message;
      workflow.updatedAt = Date.now();

      const retryCount = (step.config.retry_count as number) ?? 0;
      if (retryCount < DEFAULT_RETRY_COUNT) {
        step.config.retry_count = retryCount + 1;
        this.emit({
          type: 'step_started',
          workflowId: workflow.id,
          stepId: step.id,
          message: `重试步骤 (${retryCount + 1}/${DEFAULT_RETRY_COUNT}): ${step.config.description ?? step.id}`,
          timestamp: Date.now(),
        });
        await this.delay(100);
        await this.executeStep(workflow, step);
      } else {
        this.emit({
          type: 'step_failed',
          workflowId: workflow.id,
          stepId: step.id,
          message: `步骤失败: ${step.error}`,
          timestamp: Date.now(),
        });
        throw error;
      }
    }
  }

  private async executeAction(workflow: Workflow, step: WorkflowStep): Promise<unknown> {
    const { action, params } = step.config as {
      action: string;
      params?: Record<string, unknown>;
    };

    await this.delay(50);

    return {
      action,
      params,
      status: 'executed',
      workflowId: workflow.id,
      timestamp: Date.now(),
    };
  }

  private async evaluateCondition(workflow: Workflow, step: WorkflowStep): Promise<unknown> {
    const { expression, trueStep, falseStep } = step.config as {
      expression: string;
      trueStep?: string;
      falseStep?: string;
    };

    const result = await this.evaluateExpression(expression, workflow.variables);

    if (result && trueStep) {
      const targetStep = workflow.steps.find((s) => s.id === trueStep);
      if (targetStep) await this.executeStep(workflow, targetStep);
    } else if (!result && falseStep) {
      const targetStep = workflow.steps.find((s) => s.id === falseStep);
      if (targetStep) await this.executeStep(workflow, targetStep);
    }

    return { condition: expression, result, branch: result ? 'true' : 'false' };
  }

  private async executeLoop(workflow: Workflow, step: WorkflowStep): Promise<unknown> {
    const { items, itemStep } = step.config as {
      items: unknown[];
      itemStep: string;
    };

    const results: unknown[] = [];
    const targetStep = workflow.steps.find((s) => s.id === itemStep);

    if (targetStep) {
      for (const item of items) {
        workflow.variables.set('loop_item', item);
        await this.executeStep(workflow, targetStep);
        results.push(targetStep.result);
      }
    }

    return { loopItemCount: items.length, results };
  }

  private async executeParallelBlock(workflow: Workflow, step: WorkflowStep): Promise<unknown> {
    const { parallelSteps } = step.config as { parallelSteps: string[] };

    const results = await Promise.all(
      parallelSteps
        .map((id) => workflow.steps.find((s) => s.id === id))
        .filter((s): s is WorkflowStep => !!s)
        .map(async (s) => {
          try {
            await this.executeStep(workflow, s);
            return { stepId: s.id, success: true, result: s.result };
          } catch (error) {
            return { stepId: s.id, success: false, error: (error as Error).message };
          }
        })
    );

    return { parallelCount: parallelSteps.length, results };
  }

  private async executeParallelSteps(workflow: Workflow, steps: WorkflowStep[]): Promise<void> {
    const limit = DEFAULT_PARALLEL_LIMIT;
    const chunks: WorkflowStep[][] = [];
    for (let i = 0; i < steps.length; i += limit) {
      chunks.push(steps.slice(i, i + limit));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map((s) => this.executeStep(workflow, s)));
    }
  }

  private async evaluateExpression(
    expression: string,
    variables: Map<string, unknown>
  ): Promise<boolean> {
    try {
      const varObj: Record<string, unknown> = {};
      variables.forEach((value, key) => {
        varObj[key] = value;
      });

      const fn = new Function('variables', `with(variables) { return Boolean(${expression}); }`);
      return Boolean(fn(varObj));
    } catch {
      return false;
    }
  }

  private registerDefaultTemplates(): void {
    this.templates = [
      {
        id: 'tpl_data_processing',
        name: '数据处理流程',
        description: '从数据源获取数据，进行清洗、转换和存储',
        steps: [
          { id: 's1', type: 'action', config: { description: '获取数据', action: 'fetch_data' } },
          {
            id: 's2',
            type: 'action',
            config: { description: '数据清洗', action: 'clean_data' },
            depends_on: ['s1'],
          },
          {
            id: 's3',
            type: 'condition',
            config: {
              description: '数据质量检查',
              expression: 'quality_score > 0.8',
              trueStep: 's4',
              falseStep: 's5',
            },
            depends_on: ['s2'],
          },
          {
            id: 's4',
            type: 'action',
            config: { description: '数据转换', action: 'transform_data' },
            depends_on: ['s3'],
          },
          {
            id: 's5',
            type: 'action',
            config: { description: '数据修复', action: 'repair_data' },
            depends_on: ['s3'],
          },
          {
            id: 's6',
            type: 'action',
            config: { description: '存储数据', action: 'store_data' },
            depends_on: ['s4', 's5'],
          },
        ],
        triggers: [{ type: 'schedule', config: { cron: '0 0 * * *' } }],
        variables: { quality_score: 0.9 },
      },
      {
        id: 'tpl_approval_flow',
        name: '审批流程',
        description: '多级审批工作流，支持条件分支和会签',
        steps: [
          {
            id: 's1',
            type: 'action',
            config: { description: '提交申请', action: 'submit_request' },
          },
          {
            id: 's2',
            type: 'action',
            config: { description: '一级审批', action: 'level1_approval' },
            depends_on: ['s1'],
          },
          {
            id: 's3',
            type: 'condition',
            config: {
              description: '金额大于10000?',
              expression: 'amount > 10000',
              trueStep: 's4',
              falseStep: 's6',
            },
            depends_on: ['s2'],
          },
          {
            id: 's4',
            type: 'action',
            config: { description: '二级审批', action: 'level2_approval' },
            depends_on: ['s3'],
          },
          {
            id: 's5',
            type: 'action',
            config: { description: '总经理审批', action: 'gm_approval' },
            depends_on: ['s4'],
          },
          {
            id: 's6',
            type: 'action',
            config: { description: '完成审批', action: 'complete_approval' },
            depends_on: ['s3', 's5'],
          },
        ],
        triggers: [{ type: 'manual', config: {} }],
        variables: { amount: 5000 },
      },
      {
        id: 'tpl_notification_flow',
        name: '通知推送流程',
        description: '多渠道通知推送，支持并行和重试',
        steps: [
          {
            id: 's1',
            type: 'action',
            config: { description: '获取通知内容', action: 'get_content' },
          },
          {
            id: 's2',
            type: 'parallel',
            config: { description: '多渠道推送', parallelSteps: ['s2a', 's2b', 's2c'] },
            depends_on: ['s1'],
          },
          {
            id: 's2a',
            type: 'action',
            config: { description: '邮件通知', action: 'send_email' },
            retry_count: 0,
          },
          {
            id: 's2b',
            type: 'action',
            config: { description: '短信通知', action: 'send_sms' },
            retry_count: 0,
          },
          {
            id: 's2c',
            type: 'action',
            config: { description: '站内通知', action: 'send_inapp' },
            retry_count: 0,
          },
          {
            id: 's3',
            type: 'action',
            config: { description: '确认送达', action: 'confirm_delivery' },
            depends_on: ['s2'],
          },
        ],
        triggers: [{ type: 'event', config: { event: 'new_notification' } }],
      },
      {
        id: 'tpl_report_generation',
        name: '报告生成流程',
        description: '自动生成和分发报告',
        steps: [
          { id: 's1', type: 'action', config: { description: '收集数据', action: 'collect_data' } },
          {
            id: 's2',
            type: 'action',
            config: { description: '数据分析', action: 'analyze_data' },
            depends_on: ['s1'],
          },
          {
            id: 's3',
            type: 'loop',
            config: {
              description: '生成图表',
              items: ['chart1', 'chart2', 'chart3'],
              itemStep: 's3a',
            },
            depends_on: ['s2'],
          },
          {
            id: 's3a',
            type: 'action',
            config: { description: '创建图表', action: 'create_chart' },
          },
          {
            id: 's4',
            type: 'action',
            config: { description: '生成报告', action: 'generateReport' },
            depends_on: ['s3'],
          },
          {
            id: 's5',
            type: 'action',
            config: { description: '分发报告', action: 'distribute_report' },
            depends_on: ['s4'],
          },
        ],
        triggers: [{ type: 'schedule', config: { cron: '0 9 * * 1' } }],
      },
    ];
  }

  private generateWorkflowId(): string {
    this.workflowCounter++;
    return `wf-${Date.now()}-${this.workflowCounter}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const workflowEngine = WorkflowEngine.getInstance();
