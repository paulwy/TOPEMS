/**
 * V48.0 零代码平台 — 数据流编排
 *
 * 提供数据流编排能力，支持:
 * - 数据流节点与连接管理
 * - 数据流执行与调度
 * - 数据转换与过滤管道
 * - 并行与串行执行策略
 * - 执行日志与状态追踪
 *
 * @example
 * import { dataflowOrchestrator } from '@/utils/zerocode';
 *
 * dataflowOrchestrator.addNode({
 *   id: 'transform-1',
 *   type: 'transform',
 *   config: { expression: 'data.value * 2' },
 * });
 * dataflowOrchestrator.addConnection({
 *   sourceId: 'api-1',
 *   targetId: 'transform-1',
 * });
 */

// ==================== 枚举 ====================

export enum FlowNodeType {
  SOURCE = 'source',
  TRANSFORM = 'transform',
  FILTER = 'filter',
  MERGE = 'merge',
  SPLIT = 'split',
  AGGREGATE = 'aggregate',
  SINK = 'sink',
}

export enum NodeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  HYBRID = 'hybrid',
}

export enum DataFormat {
  JSON = 'json',
  XML = 'xml',
  CSV = 'csv',
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
}

// ==================== 接口 ====================

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  name: string;
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
  status: NodeStatus;
  executedAt?: number;
  duration?: number;
  error?: string;
}

export interface FlowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  transform?: string;
  condition?: string;
}

export interface DataPacket {
  id: string;
  source: string;
  target: string;
  data: unknown;
  format: DataFormat;
  timestamp: number;
}

export interface ExecutionContext {
  flowId: string;
  inputs: Map<string, unknown>;
  outputs: Map<string, unknown>;
  packets: DataPacket[];
  variables: Map<string, unknown>;
}

export interface FlowExecution {
  id: string;
  flowId: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt: number;
  finishedAt?: number;
  context: ExecutionContext;
  nodeStatuses: Map<string, NodeStatus>;
  error?: string;
}

export interface TransformRule {
  id: string;
  field: string;
  operation: 'map' | 'filter' | 'aggregate' | 'sort' | 'merge';
  expression: string;
  targetField?: string;
}

export interface FlowValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ==================== 数据流编排器 ====================

export class DataflowOrchestrator {
  private flows: Map<
    string,
    { nodes: Map<string, FlowNode>; connections: FlowConnection[]; executionMode: ExecutionMode }
  > = new Map();
  private executions: Map<string, FlowExecution> = new Map();
  private transformRules: Map<string, TransformRule[]> = new Map();
  private globalVariables: Map<string, unknown> = new Map();

  // ==================== 流程管理 ====================

  createFlow(flowId: string, mode: ExecutionMode = ExecutionMode.SEQUENTIAL): boolean {
    if (this.flows.has(flowId)) return false;
    this.flows.set(flowId, {
      nodes: new Map(),
      connections: [],
      executionMode: mode,
    });
    return true;
  }

  removeFlow(flowId: string): boolean {
    return this.flows.delete(flowId);
  }

  getFlow(
    flowId: string
  ): { nodes: FlowNode[]; connections: FlowConnection[]; executionMode: ExecutionMode } | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;
    return {
      nodes: Array.from(flow.nodes.values()).map((n) => ({ ...n })),
      connections: flow.connections.map((c) => ({ ...c })),
      executionMode: flow.executionMode,
    };
  }

  listFlows(): string[] {
    return Array.from(this.flows.keys());
  }

  setExecutionMode(flowId: string, mode: ExecutionMode): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;
    flow.executionMode = mode;
    return true;
  }

  // ==================== 节点管理 ====================

  addNode(
    flowId: string,
    node: Omit<FlowNode, 'status' | 'executedAt' | 'duration' | 'error'> & { status?: NodeStatus }
  ): FlowNode | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;
    const fullNode: FlowNode = {
      ...node,
      status: node.status ?? NodeStatus.PENDING,
    };
    flow.nodes.set(fullNode.id, fullNode);
    return { ...fullNode };
  }

  updateNode(
    flowId: string,
    nodeId: string,
    patch: Partial<Omit<FlowNode, 'id' | 'status' | 'executedAt' | 'duration' | 'error'>>
  ): FlowNode | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;
    const node = flow.nodes.get(nodeId);
    if (!node) return null;
    const updated: FlowNode = { ...node, ...patch };
    flow.nodes.set(nodeId, updated);
    return { ...updated };
  }

  removeNode(flowId: string, nodeId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;
    const node = flow.nodes.get(nodeId);
    if (!node) return false;
    flow.nodes.delete(nodeId);
    flow.connections = flow.connections.filter(
      (c) => c.sourceId !== nodeId && c.targetId !== nodeId
    );
    return true;
  }

  getNode(flowId: string, nodeId: string): FlowNode | undefined {
    const flow = this.flows.get(flowId);
    if (!flow) return undefined;
    const node = flow.nodes.get(nodeId);
    return node ? { ...node } : undefined;
  }

  listNodes(flowId: string): FlowNode[] {
    const flow = this.flows.get(flowId);
    if (!flow) return [];
    return Array.from(flow.nodes.values()).map((n) => ({ ...n }));
  }

  // ==================== 连接管理 ====================

  addConnection(flowId: string, connection: Omit<FlowConnection, 'id'>): FlowConnection | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;
    if (!flow.nodes.has(connection.sourceId) || !flow.nodes.has(connection.targetId)) return null;
    const fullConnection: FlowConnection = {
      ...connection,
      id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    flow.connections.push(fullConnection);
    return { ...fullConnection };
  }

  removeConnection(flowId: string, connectionId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;
    const before = flow.connections.length;
    flow.connections = flow.connections.filter((c) => c.id !== connectionId);
    return flow.connections.length < before;
  }

  listConnections(flowId: string): FlowConnection[] {
    const flow = this.flows.get(flowId);
    if (!flow) return [];
    return flow.connections.map((c) => ({ ...c }));
  }

  // ==================== 转换规则 ====================

  addTransformRule(flowId: string, rule: Omit<TransformRule, 'id'>): TransformRule {
    const fullRule: TransformRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const rules = this.transformRules.get(flowId) ?? [];
    rules.push(fullRule);
    this.transformRules.set(flowId, rules);
    return { ...fullRule };
  }

  removeTransformRule(flowId: string, ruleId: string): boolean {
    const rules = this.transformRules.get(flowId);
    if (!rules) return false;
    const before = rules.length;
    this.transformRules.set(
      flowId,
      rules.filter((r) => r.id !== ruleId)
    );
    return (this.transformRules.get(flowId)?.length ?? 0) < before;
  }

  listTransformRules(flowId: string): TransformRule[] {
    return (this.transformRules.get(flowId) ?? []).map((r) => ({ ...r }));
  }

  // ==================== 全局变量 ====================

  setGlobalVariable(key: string, value: unknown): void {
    this.globalVariables.set(key, value);
  }

  getGlobalVariable(key: string): unknown {
    return this.globalVariables.get(key);
  }

  removeGlobalVariable(key: string): boolean {
    return this.globalVariables.delete(key);
  }

  // ==================== 执行引擎 ====================

  async executeFlow(flowId: string, initialData?: Record<string, unknown>): Promise<FlowExecution> {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow ${flowId} not found`);

    const validation = this.validateFlow(flowId);
    if (!validation.valid) {
      throw new Error(`Flow validation failed: ${validation.errors.join('; ')}`);
    }

    const nodes = Array.from(flow.nodes.values());
    const context: ExecutionContext = {
      flowId,
      inputs: new Map(),
      outputs: new Map(),
      packets: [],
      variables: new Map(this.globalVariables),
    };

    if (initialData) {
      for (const [key, value] of Object.entries(initialData)) {
        context.inputs.set(key, value);
      }
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nodeStatuses = new Map<string, NodeStatus>();
    for (const node of nodes) {
      nodeStatuses.set(node.id, NodeStatus.PENDING);
    }

    const execution: FlowExecution = {
      id: executionId,
      flowId,
      status: 'running',
      startedAt: Date.now(),
      context,
      nodeStatuses,
    };
    this.executions.set(executionId, execution);

    try {
      const topologicalOrder = this.computeTopologicalOrder(flowId);

      if (flow.executionMode === ExecutionMode.PARALLEL) {
        await this.executeInParallel(flow, topologicalOrder, context, nodeStatuses);
      } else if (flow.executionMode === ExecutionMode.HYBRID) {
        await this.executeInHybrid(flow, topologicalOrder, context, nodeStatuses);
      } else {
        await this.executeInSequence(flow, topologicalOrder, context, nodeStatuses);
      }

      execution.status = 'success';
    } catch (err) {
      execution.status = 'failed';
      execution.error = err instanceof Error ? err.message : String(err);
      for (const node of nodes) {
        if (nodeStatuses.get(node.id) === NodeStatus.RUNNING) {
          nodeStatuses.set(node.id, NodeStatus.FAILED);
        }
      }
    }

    execution.finishedAt = Date.now();
    this.executions.set(executionId, execution);

    for (const node of nodes) {
      const n = flow.nodes.get(node.id);
      if (n) {
        n.status = nodeStatuses.get(node.id) ?? NodeStatus.PENDING;
      }
    }

    return this.serializeExecution(execution);
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return false;
    execution.status = 'cancelled';
    execution.finishedAt = Date.now();
    return true;
  }

  getExecution(executionId: string): FlowExecution | undefined {
    const execution = this.executions.get(executionId);
    return execution ? this.serializeExecution(execution) : undefined;
  }

  listExecutions(flowId?: string, limit: number = 20): FlowExecution[] {
    let executions = Array.from(this.executions.values());
    if (flowId) executions = executions.filter((e) => e.flowId === flowId);
    return executions
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
      .map((e) => this.serializeExecution(e));
  }

  // ==================== 验证 ====================

  validateFlow(flowId: string): FlowValidation {
    const flow = this.flows.get(flowId);
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!flow) {
      return { valid: false, errors: ['Flow not found'], warnings };
    }
    const nodes = Array.from(flow.nodes.values());
    if (nodes.length === 0) {
      errors.push('Flow has no nodes');
    }
    const sourceNodes = nodes.filter((n) => n.type === FlowNodeType.SOURCE);
    if (sourceNodes.length === 0 && nodes.length > 0) {
      warnings.push('No source node found');
    }
    const sinkNodes = nodes.filter((n) => n.type === FlowNodeType.SINK);
    if (sinkNodes.length === 0 && nodes.length > 0) {
      warnings.push('No sink node found');
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const conn of flow.connections) {
      if (!nodeIds.has(conn.sourceId)) {
        errors.push(`Connection ${conn.id}: source node ${conn.sourceId} not found`);
      }
      if (!nodeIds.has(conn.targetId)) {
        errors.push(`Connection ${conn.id}: target node ${conn.targetId} not found`);
      }
    }
    try {
      this.computeTopologicalOrder(flowId);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Cycle detected');
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  // ==================== 内部方法 ====================

  private computeTopologicalOrder(flowId: string): string[] {
    const flow = this.flows.get(flowId);
    if (!flow) return [];
    const nodes = Array.from(flow.nodes.keys());
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const id of nodes) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }
    for (const conn of flow.connections) {
      adjacency.get(conn.sourceId)?.push(conn.targetId);
      inDegree.set(conn.targetId, (inDegree.get(conn.targetId) ?? 0) + 1);
    }
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }
    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const neighbor of adjacency.get(id) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
    if (order.length !== nodes.length) {
      throw new Error('Cycle detected in flow');
    }
    return order;
  }

  private async executeInSequence(
    flow: { nodes: Map<string, FlowNode>; connections: FlowConnection[] },
    order: string[],
    context: ExecutionContext,
    statuses: Map<string, NodeStatus>
  ): Promise<void> {
    for (const nodeId of order) {
      await this.executeNode(flow, nodeId, context, statuses);
    }
  }

  private async executeInParallel(
    flow: { nodes: Map<string, FlowNode>; connections: FlowConnection[] },
    order: string[],
    context: ExecutionContext,
    statuses: Map<string, NodeStatus>
  ): Promise<void> {
    const levels: string[][] = [];
    const nodeLevel = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    for (const id of order) adjacency.set(id, []);
    for (const conn of flow.connections) {
      adjacency.get(conn.sourceId)?.push(conn.targetId);
    }
    for (const id of order) {
      const parents = flow.connections.filter((c) => c.targetId === id).map((c) => c.sourceId);
      const maxParentLevel =
        parents.length > 0 ? Math.max(...parents.map((p) => nodeLevel.get(p) ?? 0)) : 0;
      const level = maxParentLevel + 1;
      nodeLevel.set(id, level);
      if (!levels[level]) levels[level] = [];
      levels[level].push(id);
    }
    for (const level of levels) {
      if (!level) continue;
      await Promise.all(level.map((id) => this.executeNode(flow, id, context, statuses)));
    }
  }

  private async executeInHybrid(
    flow: { nodes: Map<string, FlowNode>; connections: FlowConnection[] },
    order: string[],
    context: ExecutionContext,
    statuses: Map<string, NodeStatus>
  ): Promise<void> {
    const groups: string[][] = [];
    let currentGroup: string[] = [];
    const parallelTypes = new Set([FlowNodeType.FILTER, FlowNodeType.TRANSFORM]);
    for (const nodeId of order) {
      const node = flow.nodes.get(nodeId);
      if (node && parallelTypes.has(node.type)) {
        currentGroup.push(nodeId);
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [];
        }
        groups.push([nodeId]);
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);
    for (const group of groups) {
      if (group.length > 1) {
        await Promise.all(group.map((id) => this.executeNode(flow, id, context, statuses)));
      } else if (group.length === 1) {
        await this.executeNode(flow, group[0], context, statuses);
      }
    }
  }

  private async executeNode(
    flow: { nodes: Map<string, FlowNode>; connections: FlowConnection[] },
    nodeId: string,
    context: ExecutionContext,
    statuses: Map<string, NodeStatus>
  ): Promise<void> {
    const node = flow.nodes.get(nodeId);
    if (!node) return;
    statuses.set(nodeId, NodeStatus.RUNNING);
    const start = performance.now();
    try {
      const inputs = this.collectInputs(flow, nodeId, context);
      let output: unknown = inputs;
      switch (node.type) {
        case FlowNodeType.TRANSFORM:
          output = this.applyTransform(node.config, inputs, context.variables);
          break;
        case FlowNodeType.FILTER:
          output = this.applyFilter(node.config, inputs, context.variables);
          break;
        case FlowNodeType.AGGREGATE:
          output = this.applyAggregate(node.config, inputs);
          break;
        case FlowNodeType.MERGE:
          output = this.applyMerge(inputs);
          break;
        case FlowNodeType.SPLIT:
          output = this.applySplit(node.config, inputs);
          break;
        case FlowNodeType.SOURCE:
          output = context.inputs.get(nodeId) ?? node.config.data ?? {};
          break;
        case FlowNodeType.SINK:
          context.outputs.set(nodeId, inputs);
          output = inputs;
          break;
      }
      context.outputs.set(nodeId, output);
      const end = performance.now();
      node.status = NodeStatus.SUCCESS;
      node.executedAt = Date.now();
      node.duration = Math.round(end - start);
      statuses.set(nodeId, NodeStatus.SUCCESS);
    } catch (err) {
      const end = performance.now();
      node.status = NodeStatus.FAILED;
      node.executedAt = Date.now();
      node.duration = Math.round(end - start);
      node.error = err instanceof Error ? err.message : String(err);
      statuses.set(nodeId, NodeStatus.FAILED);
      throw err;
    }
  }

  private collectInputs(
    flow: { connections: FlowConnection[] },
    nodeId: string,
    context: ExecutionContext
  ): unknown {
    const incoming = flow.connections.filter((c) => c.targetId === nodeId);
    if (incoming.length === 0) {
      return context.inputs.get(nodeId) ?? {};
    }
    const inputs: Record<string, unknown> = {};
    for (const conn of incoming) {
      inputs[conn.sourceId] = context.outputs.get(conn.sourceId);
    }
    return inputs;
  }

  private applyTransform(
    config: Record<string, unknown>,
    inputs: unknown,
    _variables: Map<string, unknown>
  ): unknown {
    const expression = config.expression as string | undefined;
    if (!expression) return inputs;
    try {
      const fn = new Function('data', `"use strict"; return (${expression});`);
      return fn(inputs);
    } catch {
      return inputs;
    }
  }

  private applyFilter(
    config: Record<string, unknown>,
    inputs: unknown,
    _variables: Map<string, unknown>
  ): unknown {
    const condition = config.condition as string | undefined;
    if (!condition) return inputs;
    try {
      const fn = new Function('data', `"use strict"; return Boolean(${condition});`);
      if (Array.isArray(inputs)) {
        return inputs.filter((item) => fn(item));
      }
      return fn(inputs) ? inputs : null;
    } catch {
      return inputs;
    }
  }

  private applyAggregate(config: Record<string, unknown>, inputs: unknown): unknown {
    const aggregation = config.aggregation as string | undefined;
    if (!aggregation || !Array.isArray(inputs)) return inputs;
    switch (aggregation) {
      case 'count':
        return inputs.length;
      case 'sum': {
        const field = config.field as string;
        return inputs.reduce(
          (sum, item) =>
            sum + (field ? Number((item as Record<string, unknown>)[field]) : Number(item)),
          0
        );
      }
      case 'avg': {
        const field = config.field as string;
        if (inputs.length === 0) return 0;
        const sum = inputs.reduce(
          (s, item) =>
            s + (field ? Number((item as Record<string, unknown>)[field]) : Number(item)),
          0
        );
        return sum / inputs.length;
      }
      default:
        return inputs;
    }
  }

  private applyMerge(inputs: unknown): unknown {
    if (typeof inputs === 'object' && inputs !== null) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(inputs as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, value);
          } else {
            result[key] = value;
          }
        }
      }
      return result;
    }
    return inputs;
  }

  private applySplit(config: Record<string, unknown>, inputs: unknown): unknown {
    const field = config.field as string | undefined;
    if (!field || typeof inputs !== 'object' || inputs === null) return inputs;
    const value = (inputs as Record<string, unknown>)[field];
    if (Array.isArray(value)) {
      return value.map((item) => ({ ...(inputs as Record<string, unknown>), [field]: item }));
    }
    return inputs;
  }

  private serializeExecution(exec: FlowExecution): FlowExecution {
    return {
      ...exec,
      context: {
        ...exec.context,
        inputs: new Map(exec.context.inputs),
        outputs: new Map(exec.context.outputs),
        packets: exec.context.packets.map((p) => ({ ...p })),
      },
      nodeStatuses: new Map(exec.nodeStatuses),
    };
  }
}

export const dataflowOrchestrator = new DataflowOrchestrator();
export default dataflowOrchestrator;
