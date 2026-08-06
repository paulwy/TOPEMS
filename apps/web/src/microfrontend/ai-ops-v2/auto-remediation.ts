/**
 * V50.0 微前端 AI 运维 - 自动修复模块
 * 提供智能故障自愈、自动化修复、工作流编排能力
 */

export interface RemediationAction {
  id: string;
  type: 'restart' | 'scale' | 'rollback' | 'config' | 'script' | 'notification' | 'custom';
  name: string;
  description: string;
  parameters: Record<string, string | number | boolean>;
  timeout: number;
  retryPolicy: RetryPolicy;
  status: 'pending' | 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  startTime?: number;
  endTime?: number;
  result?: string;
  error?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'fixed' | 'linear' | 'exponential';
  initialDelay: number;
  maxDelay: number;
  retryOn: string[];
}

export interface RemediationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: RemediationAction[];
  conditions: WorkflowCondition[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'inactive' | 'active' | 'paused';
  executionHistory: RemediationExecution[];
  metadata: Record<string, unknown>;
}

export interface WorkflowTrigger {
  type: 'alert' | 'anomaly' | 'metric' | 'schedule' | 'manual';
  conditions: TriggerCondition[];
  cooldown: number;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'contains' | 'matches';
  value: unknown;
}

export interface WorkflowCondition {
  type: 'pre' | 'post';
  checks: ConditionCheck[];
  onFailure: 'abort' | 'continue' | 'notify';
}

export interface ConditionCheck {
  type: 'metric' | 'health' | 'dependency' | 'custom';
  target: string;
  operator: string;
  expectedValue: unknown;
}

export interface RemediationExecution {
  id: string;
  workflowId: string;
  trigger: WorkflowTrigger;
  startTime: number;
  endTime?: number;
  status: 'running' | 'success' | 'failed' | 'partial';
  actions: RemediationAction[];
  summary: string;
}

export interface RemediationReport {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  mostTriggeredWorkflow: string;
  automationRate: number;
  period: {
    start: number;
    end: number;
  };
}

export interface AutoRemediationConfig {
  enabled: boolean;
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  approvalRequired: boolean;
  approvalTimeout: number;
  safetyModeEnabled: boolean;
  maxActionsPerWorkflow: number;
  auditLogEnabled: boolean;
  notificationEnabled: boolean;
}

const DEFAULT_CONFIG: AutoRemediationConfig = {
  enabled: true,
  maxConcurrentExecutions: 10,
  defaultTimeout: 300000,
  approvalRequired: false,
  approvalTimeout: 60000,
  safetyModeEnabled: true,
  maxActionsPerWorkflow: 20,
  auditLogEnabled: true,
  notificationEnabled: true,
};

export class AutoRemediation {
  private config: AutoRemediationConfig;
  private workflows: Map<string, RemediationWorkflow> = new Map();
  private executions: RemediationExecution[] = [];
  private activeExecutions: Map<string, RemediationExecution> = new Map();
  private approvalCallbacks: Map<string, (approved: boolean) => void> = new Map();
  private executionListeners: Set<(execution: RemediationExecution) => void> = new Set();

  constructor(config: Partial<AutoRemediationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  createWorkflow(
    workflow: Omit<RemediationWorkflow, 'id' | 'executionHistory'>
  ): RemediationWorkflow {
    const id = `workflow-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const fullWorkflow: RemediationWorkflow = {
      ...workflow,
      id,
      executionHistory: [],
      status: workflow.status || 'inactive',
    };

    this.workflows.set(id, fullWorkflow);
    return fullWorkflow;
  }

  updateWorkflow(id: string, updates: Partial<RemediationWorkflow>): RemediationWorkflow | null {
    const workflow = this.workflows.get(id);
    if (!workflow) return null;

    const updated = { ...workflow, ...updates };
    this.workflows.set(id, updated);
    return updated;
  }

  deleteWorkflow(id: string): boolean {
    return this.workflows.delete(id);
  }

  getWorkflow(id: string): RemediationWorkflow | undefined {
    return this.workflows.get(id);
  }

  getAllWorkflows(): RemediationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  activateWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;
    workflow.status = 'active';
    return true;
  }

  deactivateWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow) return false;
    workflow.status = 'inactive';
    return true;
  }

  execute(
    workflowId: string,
    trigger: WorkflowTrigger,
    context?: Record<string, unknown>
  ): Promise<RemediationExecution> {
    return new Promise((resolve, reject) => {
      if (!this.config.enabled) {
        reject(new Error('自动修复功能已禁用'));
        return;
      }

      if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
        reject(new Error('已达到最大并发执行数限制'));
        return;
      }

      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        reject(new Error(`工作流 ${workflowId} 不存在`));
        return;
      }

      if (workflow.status !== 'active') {
        reject(new Error(`工作流 ${workflowId} 未激活`));
        return;
      }

      // 检查冷却时间
      const lastExecution = workflow.executionHistory[0];
      if (lastExecution && trigger.cooldown > 0) {
        const timeSinceLastExecution = Date.now() - lastExecution.startTime;
        if (timeSinceLastExecution < trigger.cooldown) {
          reject(new Error('工作流处于冷却期'));
          return;
        }
      }

      // 如果需要审批
      if (this.config.approvalRequired) {
        this.requestApproval(workflow, trigger, context)
          .then((approved) => {
            if (approved) {
              this.performExecution(workflow, trigger, context).then(resolve).catch(reject);
            } else {
              reject(new Error('审批未通过'));
            }
          })
          .catch(reject);
        return;
      }

      this.performExecution(workflow, trigger, context).then(resolve).catch(reject);
    });
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return false;

    execution.status = 'failed';
    execution.endTime = Date.now();
    execution.summary = '执行已被取消';

    this.activeExecutions.delete(executionId);
    this.notifyListeners(execution);

    return true;
  }

  getExecution(executionId: string): RemediationExecution | undefined {
    return this.executions.find((e) => e.id === executionId);
  }

  getActiveExecutions(): RemediationExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  getExecutionHistory(options?: {
    workflowId?: string;
    status?: RemediationExecution['status'];
    since?: number;
    limit?: number;
  }): RemediationExecution[] {
    let history = [...this.executions];

    if (options?.workflowId) {
      history = history.filter((e) => e.workflowId === options.workflowId);
    }
    if (options?.status) {
      history = history.filter((e) => e.status === options.status);
    }
    if (options?.since) {
      history = history.filter((e) => e.startTime >= options.since!);
    }

    history.sort((a, b) => b.startTime - a.startTime);

    if (options?.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  generateReport(options?: {
    workflowId?: string;
    periodStart?: number;
    periodEnd?: number;
  }): RemediationReport {
    const periodStart = options?.periodStart || Date.now() - 7 * 24 * 60 * 60 * 1000;
    const periodEnd = options?.periodEnd || Date.now();

    const periodExecutions = this.executions.filter(
      (e) => e.startTime >= periodStart && e.startTime <= periodEnd
    );

    const successfulExecutions = periodExecutions.filter((e) => e.status === 'success').length;
    const failedExecutions = periodExecutions.filter((e) => e.status === 'failed').length;

    const workflowCounts = new Map<string, number>();
    periodExecutions.forEach((e) => {
      workflowCounts.set(e.workflowId, (workflowCounts.get(e.workflowId) || 0) + 1);
    });

    const mostTriggeredWorkflow = Array.from(workflowCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const totalExecutionsWithManual = periodExecutions.length;
    const automaticExecutions = periodExecutions.filter((e) => e.trigger.type !== 'manual').length;
    const automationRate =
      totalExecutionsWithManual > 0 ? automaticExecutions / totalExecutionsWithManual : 0;

    const avgExecutionTime =
      periodExecutions.length > 0
        ? periodExecutions.reduce((sum, e) => {
            if (e.endTime) {
              return sum + (e.endTime - e.startTime);
            }
            return sum;
          }, 0) / periodExecutions.filter((e) => e.endTime).length
        : 0;

    return {
      totalExecutions: periodExecutions.length,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: avgExecutionTime,
      mostTriggeredWorkflow: mostTriggeredWorkflow ? mostTriggeredWorkflow[0] : '',
      automationRate,
      period: {
        start: periodStart,
        end: periodEnd,
      },
    };
  }

  subscribeToExecutions(callback: (execution: RemediationExecution) => void): () => void {
    this.executionListeners.add(callback);
    return () => this.executionListeners.delete(callback);
  }

  approveExecution(executionId: string): void {
    const callback = this.approvalCallbacks.get(executionId);
    if (callback) {
      callback(true);
      this.approvalCallbacks.delete(executionId);
    }
  }

  rejectExecution(executionId: string): void {
    const callback = this.approvalCallbacks.get(executionId);
    if (callback) {
      callback(false);
      this.approvalCallbacks.delete(executionId);
    }
  }

  getConfig(): AutoRemediationConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AutoRemediationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.workflows.clear();
    this.executions = [];
    this.activeExecutions.clear();
    this.approvalCallbacks.clear();
  }

  private async performExecution(
    workflow: RemediationWorkflow,
    trigger: WorkflowTrigger,
    context?: Record<string, unknown>
  ): Promise<RemediationExecution> {
    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    const execution: RemediationExecution = {
      id: executionId,
      workflowId: workflow.id,
      trigger,
      startTime: Date.now(),
      status: 'running',
      actions: workflow.actions.map((a) => ({ ...a, status: 'pending' })),
      summary: '',
    };

    this.activeExecutions.set(executionId, execution);
    this.executions.unshift(execution);
    this.notifyListeners(execution);

    try {
      // 执行前置条件检查
      const preConditions = workflow.conditions.filter((c) => c.type === 'pre');
      for (const condition of preConditions) {
        const passed = await this.evaluateCondition(condition, context);
        if (!passed) {
          execution.status = 'failed';
          execution.summary = '前置条件检查失败';
          execution.endTime = Date.now();
          this.activeExecutions.delete(executionId);
          this.notifyListeners(execution);
          return execution;
        }
      }

      // 执行动作
      for (const action of execution.actions) {
        action.status = 'running';
        action.startTime = Date.now();
        this.notifyListeners(execution);

        try {
          await this.executeAction(action, context);
          action.status = 'success';
          action.endTime = Date.now();
        } catch (error) {
          action.status = 'failed';
          action.endTime = Date.now();
          action.error = error instanceof Error ? error.message : String(error);

          // 重试逻辑
          if (action.retryPolicy.maxRetries > 0) {
            let retries = 0;
            while (retries < action.retryPolicy.maxRetries) {
              try {
                await this.delay(this.calculateDelay(action.retryPolicy, retries));
                await this.executeAction(action, context);
                action.status = 'success';
                action.error = undefined;
                break;
              } catch (retryError) {
                retries++;
                action.error =
                  retryError instanceof Error ? retryError.message : String(retryError);
              }
            }
          }
        }

        this.notifyListeners(execution);
      }

      // 执行后置条件检查
      const postConditions = workflow.conditions.filter((c) => c.type === 'post');
      for (const condition of postConditions) {
        const passed = await this.evaluateCondition(condition, context);
        if (!passed && condition.onFailure === 'abort') {
          execution.status = 'partial';
          execution.summary = '后置条件检查失败，部分操作成功';
          execution.endTime = Date.now();
          this.activeExecutions.delete(executionId);
          this.notifyListeners(execution);
          return execution;
        }
      }

      // 更新工作流历史
      workflow.executionHistory.unshift(execution);

      execution.status = 'success';
      execution.summary = '工作流执行成功';
      execution.endTime = Date.now();
    } catch (error) {
      execution.status = 'failed';
      execution.summary = `执行失败: ${error instanceof Error ? error.message : String(error)}`;
      execution.endTime = Date.now();
    }

    this.activeExecutions.delete(executionId);
    this.notifyListeners(execution);

    return execution;
  }

  private async executeAction(
    action: RemediationAction,
    _context?: Record<string, unknown>
  ): Promise<void> {
    // 模拟动作执行
    const timeout = action.timeout || this.config.defaultTimeout;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('动作执行超时'));
      }, timeout);

      // 模拟不同类型的动作
      setTimeout(
        () => {
          clearTimeout(timer);

          switch (action.type) {
            case 'restart':
              action.result = `成功重启 ${action.parameters.target || '服务'}`;
              resolve();
              break;
            case 'scale':
              action.result = `成功扩展到 ${action.parameters.replicas || 2} 个实例`;
              resolve();
              break;
            case 'rollback':
              action.result = `成功回滚到版本 ${action.parameters.version || '上一个版本'}`;
              resolve();
              break;
            case 'config':
              action.result = `成功更新配置: ${action.parameters.key || '未知配置'}`;
              resolve();
              break;
            case 'script':
              action.result = `脚本执行完成: ${action.parameters.script || '默认脚本'}`;
              resolve();
              break;
            case 'notification':
              action.result = `通知已发送给 ${action.parameters.recipients || '相关人员'}`;
              resolve();
              break;
            case 'custom':
              action.result = `自定义动作执行完成`;
              resolve();
              break;
            default:
              reject(new Error(`未知的动作类型: ${action.type}`));
          }
        },
        Math.random() * 1000 + 500
      ); // 模拟 0.5-1.5 秒的执行时间
    });
  }

  private async evaluateCondition(
    _condition: WorkflowCondition,
    _context?: Record<string, unknown>
  ): Promise<boolean> {
    // 简化实现：随机返回检查结果
    // 在实际应用中，这里应该检查真实的条件
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.random() > 0.2); // 80% 的通过率
      }, 100);
    });
  }

  private async requestApproval(
    workflow: RemediationWorkflow,
    _trigger: WorkflowTrigger,
    _context?: Record<string, unknown>
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const executionId = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      this.approvalCallbacks.set(executionId, resolve);

      // 设置超时
      setTimeout(() => {
        if (this.approvalCallbacks.has(executionId)) {
          this.approvalCallbacks.delete(executionId);
          resolve(false); // 超时自动拒绝
        }
      }, this.config.approvalTimeout);

      // 在实际应用中，这里应该发送审批请求到审批系统
      console.info(`[AutoRemediation] 需要审批工作流: ${workflow.name} (${executionId})`);
    });
  }

  private calculateDelay(retryPolicy: RetryPolicy, attempt: number): number {
    switch (retryPolicy.backoffStrategy) {
      case 'fixed':
        return retryPolicy.initialDelay;
      case 'linear':
        return retryPolicy.initialDelay * (attempt + 1);
      case 'exponential':
        return Math.min(retryPolicy.initialDelay * Math.pow(2, attempt), retryPolicy.maxDelay);
      default:
        return retryPolicy.initialDelay;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private notifyListeners(execution: RemediationExecution): void {
    this.executionListeners.forEach((listener) => listener(execution));
  }
}

export const autoRemediation = new AutoRemediation();
export default autoRemediation;
