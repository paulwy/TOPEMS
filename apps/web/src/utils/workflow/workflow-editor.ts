/**
 * V48.0 前端智能编排 — 工作流可视化编辑器
 *
 * 提供工作流的可视化编辑能力，支持:
 * - 节点/边增删改与位置管理
 * - 层次布局自动排列
 * - 连通性 / 必填字段 / 循环检测
 * - 缩放与平移导航
 * - 工作流导入导出
 *
 * @example
 * import { workflowEditor } from '@/utils/workflow';
 *
 * const wf = workflowEditor.createWorkflow('wf-1', '告警处置');
 * workflowEditor.addNode(wf.workflow_id, {
 *   node_id: 'n-1',
 *   type: NodeType.Start,
 *   name: '开始',
 *   position: { x: 0, y: 0 },
 *   config: {},
 *   inputs: [],
 *   outputs: [],
 *   status: 'idle',
 * });
 */

// ==================== 枚举 ====================

export enum NodeType {
  Start = 'start',
  End = 'end',
  Task = 'task',
  Decision = 'decision',
  Parallel = 'parallel',
  Delay = 'delay',
  Loop = 'loop',
  SubWorkflow = 'sub-workflow',
  HTTPRequest = 'http-request',
  GraphQLQuery = 'graphql-query',
  DatabaseQuery = 'database-query',
  Transform = 'transform',
  Filter = 'filter',
  Aggregate = 'aggregate',
  Notify = 'notify',
  AI = 'ai',
}

export enum WorkflowStatus {
  Draft = 'draft',
  Published = 'published',
  Active = 'active',
  Paused = 'paused',
  Archived = 'archived',
}

export enum NodeStatus {
  Idle = 'idle',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  Skipped = 'skipped',
}

// ==================== 接口 ====================

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  node_id: string;
  type: NodeType;
  name: string;
  position: NodePosition;
  config: Record<string, unknown>;
  inputs: NodePort[];
  outputs: NodePort[];
  status: NodeStatus;
}

export interface NodePort {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
}

export interface EdgeCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: unknown;
}

export interface WorkflowEdge {
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  condition?: EdgeCondition;
  label?: string;
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  default_value: unknown;
  description?: string;
}

export interface WorkflowTriggerRef {
  trigger_id: string;
  type: string;
}

export interface Workflow {
  workflow_id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  triggers: WorkflowTriggerRef[];
  variables: WorkflowVariable[];
  version: string;
  status: WorkflowStatus;
  created_at: number;
  updated_at: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  node_id?: string;
  edge_id?: string;
  code: string;
  message: string;
}

export interface ValidationWarning {
  node_id?: string;
  code: string;
  message: string;
}

export interface LayoutConfig {
  direction: 'TB' | 'LR';
  node_spacing: number;
  rank_spacing: number;
}

export interface Viewport {
  zoom: number;
  pan_x: number;
  pan_y: number;
}

export interface LayoutSuggestion {
  node_id: string;
  position: NodePosition;
  reason: string;
}

// ==================== 常量 ====================

const DEFAULT_LAYOUT: LayoutConfig = {
  direction: 'TB',
  node_spacing: 80,
  rank_spacing: 120,
};

const DEFAULT_VIEWPORT: Viewport = {
  zoom: 1,
  pan_x: 0,
  pan_y: 0,
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

// ==================== 编辑器 ====================

export class WorkflowEditor {
  private workflows: Map<string, Workflow> = new Map();
  private viewports: Map<string, Viewport> = new Map();
  private layoutConfigs: Map<string, LayoutConfig> = new Map();

  // ==================== 工作流管理 ====================

  createWorkflow(workflowId: string, name: string, description?: string): Workflow {
    const now = Date.now();
    const workflow: Workflow = {
      workflow_id: workflowId,
      name,
      description,
      nodes: [],
      edges: [],
      triggers: [],
      variables: [],
      version: '1.0.0',
      status: WorkflowStatus.Draft,
      created_at: now,
      updated_at: now,
    };
    this.workflows.set(workflowId, workflow);
    this.viewports.set(workflowId, { ...DEFAULT_VIEWPORT });
    this.layoutConfigs.set(workflowId, { ...DEFAULT_LAYOUT });
    return this.cloneWorkflow(workflow);
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    const workflow = this.workflows.get(workflowId);
    return workflow ? this.cloneWorkflow(workflow) : undefined;
  }

  listWorkflows(): Workflow[] {
    return Array.from(this.workflows.values())
      .map((w) => this.cloneWorkflow(w))
      .sort((a, b) => b.updated_at - a.updated_at);
  }

  deleteWorkflow(workflowId: string): boolean {
    const deleted = this.workflows.delete(workflowId);
    this.viewports.delete(workflowId);
    this.layoutConfigs.delete(workflowId);
    return deleted;
  }

  saveWorkflow(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    workflow.updated_at = Date.now();
    return true;
  }

  // ==================== 节点管理 ====================

  addNode(workflowId: string, node: WorkflowNode): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    if (workflow.nodes.some((n) => n.node_id === node.node_id)) return false;
    workflow.nodes.push(this.cloneNode(node));
    workflow.updated_at = Date.now();
    return true;
  }

  removeNode(workflowId: string, nodeId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    const before = workflow.nodes.length;
    workflow.nodes = workflow.nodes.filter((n) => n.node_id !== nodeId);
    if (workflow.nodes.length === before) return false;
    // 同时清理关联边
    workflow.edges = workflow.edges.filter(
      (e) => e.source_node_id !== nodeId && e.target_node_id !== nodeId
    );
    workflow.updated_at = Date.now();
    return true;
  }

  moveNode(workflowId: string, nodeId: string, position: NodePosition): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    const node = workflow.nodes.find((n) => n.node_id === nodeId);
    if (!node) return false;
    node.position = { ...position };
    workflow.updated_at = Date.now();
    return true;
  }

  updateNodeConfig(workflowId: string, nodeId: string, config: Record<string, unknown>): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    const node = workflow.nodes.find((n) => n.node_id === nodeId);
    if (!node) return false;
    node.config = { ...node.config, ...config };
    workflow.updated_at = Date.now();
    return true;
  }

  getNode(workflowId: string, nodeId: string): WorkflowNode | undefined {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return undefined;
    const node = workflow.nodes.find((n) => n.node_id === nodeId);
    return node ? this.cloneNode(node) : undefined;
  }

  // ==================== 边管理 ====================

  connectNodes(
    workflowId: string,
    sourceNodeId: string,
    targetNodeId: string,
    edge?: Partial<WorkflowEdge>
  ): string | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;
    if (sourceNodeId === targetNodeId) return null;
    const sourceExists = workflow.nodes.some((n) => n.node_id === sourceNodeId);
    const targetExists = workflow.nodes.some((n) => n.node_id === targetNodeId);
    if (!sourceExists || !targetExists) return null;
    // 禁止重复连接
    const duplicate = workflow.edges.some(
      (e) => e.source_node_id === sourceNodeId && e.target_node_id === targetNodeId
    );
    if (duplicate) return null;
    const edgeId = edge?.edge_id || `e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newEdge: WorkflowEdge = {
      edge_id: edgeId,
      source_node_id: sourceNodeId,
      target_node_id: targetNodeId,
      condition: edge?.condition,
      label: edge?.label,
    };
    workflow.edges.push(newEdge);
    workflow.updated_at = Date.now();
    return edgeId;
  }

  disconnectNodes(workflowId: string, sourceNodeId: string, targetNodeId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    const before = workflow.edges.length;
    workflow.edges = workflow.edges.filter(
      (e) => !(e.source_node_id === sourceNodeId && e.target_node_id === targetNodeId)
    );
    if (workflow.edges.length === before) return false;
    workflow.updated_at = Date.now();
    return true;
  }

  removeEdge(workflowId: string, edgeId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;
    const before = workflow.edges.length;
    workflow.edges = workflow.edges.filter((e) => e.edge_id !== edgeId);
    if (workflow.edges.length === before) return false;
    workflow.updated_at = Date.now();
    return true;
  }

  // ==================== 验证 ====================

  validateWorkflow(workflowId: string): ValidationResult {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return {
        valid: false,
        errors: [{ code: 'WORKFLOW_NOT_FOUND', message: `工作流 ${workflowId} 不存在` }],
        warnings: [],
      };
    }
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 必填字段
    if (!workflow.name) {
      errors.push({ code: 'NAME_REQUIRED', message: '工作流名称不能为空' });
    }
    if (workflow.nodes.length === 0) {
      errors.push({ code: 'NO_NODES', message: '工作流必须包含至少一个节点' });
      return { valid: false, errors, warnings };
    }

    // 起止节点
    const startNodes = workflow.nodes.filter((n) => n.type === NodeType.Start);
    const endNodes = workflow.nodes.filter((n) => n.type === NodeType.End);
    if (startNodes.length === 0) {
      errors.push({ code: 'NO_START', message: '工作流必须包含一个开始节点' });
    }
    if (startNodes.length > 1) {
      errors.push({
        code: 'MULTIPLE_START',
        message: '工作流只能包含一个开始节点',
      });
    }
    if (endNodes.length === 0) {
      warnings.push({
        code: 'NO_END',
        message: '建议添加结束节点以明确工作流终止',
      });
    }

    // 节点必填字段
    for (const node of workflow.nodes) {
      if (!node.name) {
        errors.push({
          node_id: node.node_id,
          code: 'NODE_NAME_REQUIRED',
          message: `节点 ${node.node_id} 缺少名称`,
        });
      }
      // 非起止节点应有输入
      if (node.type !== NodeType.Start && node.type !== NodeType.End && node.inputs.length === 0) {
        warnings.push({
          node_id: node.node_id,
          code: 'NO_INPUTS',
          message: `节点 ${node.name} 没有输入端口`,
        });
      }
    }

    // 边引用校验
    for (const edge of workflow.edges) {
      const sourceExists = workflow.nodes.some((n) => n.node_id === edge.source_node_id);
      const targetExists = workflow.nodes.some((n) => n.node_id === edge.target_node_id);
      if (!sourceExists) {
        errors.push({
          edge_id: edge.edge_id,
          code: 'INVALID_SOURCE',
          message: `边 ${edge.edge_id} 引用了不存在的源节点 ${edge.source_node_id}`,
        });
      }
      if (!targetExists) {
        errors.push({
          edge_id: edge.edge_id,
          code: 'INVALID_TARGET',
          message: `边 ${edge.edge_id} 引用了不存在的目标节点 ${edge.target_node_id}`,
        });
      }
    }

    // 连通性检测（从 Start 可达）
    if (startNodes.length === 1) {
      const reachable = this.computeReachable(workflow, startNodes[0].node_id);
      const unreachable = workflow.nodes.filter(
        (n) => n.node_id !== startNodes[0].node_id && !reachable.has(n.node_id)
      );
      for (const node of unreachable) {
        warnings.push({
          node_id: node.node_id,
          code: 'UNREACHABLE',
          message: `节点 ${node.name} 从开始节点不可达`,
        });
      }
    }

    // 循环检测
    const cycle = this.detectCycle(workflow);
    if (cycle) {
      errors.push({
        code: 'CYCLE_DETECTED',
        message: `检测到循环依赖，涉及节点: ${cycle.join(' → ')}`,
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private computeReachable(workflow: Workflow, startNodeId: string): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of workflow.edges) {
        if (edge.source_node_id === current && !visited.has(edge.target_node_id)) {
          queue.push(edge.target_node_id);
        }
      }
    }
    return visited;
  }

  private detectCycle(workflow: Workflow): string[] | null {
    const adjacency = new Map<string, string[]>();
    for (const node of workflow.nodes) {
      adjacency.set(node.node_id, []);
    }
    for (const edge of workflow.edges) {
      const list = adjacency.get(edge.source_node_id);
      if (list) list.push(edge.target_node_id);
    }

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    for (const node of workflow.nodes) color.set(node.node_id, WHITE);

    const path: string[] = [];
    let cycleResult: string[] | null = null;

    const visit = (nodeId: string): boolean => {
      color.set(nodeId, GRAY);
      path.push(nodeId);
      const neighbors = adjacency.get(nodeId) || [];
      for (const next of neighbors) {
        if (color.get(next) === GRAY) {
          const startIdx = path.indexOf(next);
          cycleResult = path.slice(startIdx).concat(next);
          return true;
        }
        if (color.get(next) === WHITE && visit(next)) return true;
      }
      path.pop();
      color.set(nodeId, BLACK);
      return false;
    };

    for (const node of workflow.nodes) {
      if (color.get(node.node_id) === WHITE && visit(node.node_id)) break;
    }
    return cycleResult;
  }

  // ==================== 布局算法 ====================

  autoLayout(workflowId: string, config?: Partial<LayoutConfig>): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.nodes.length === 0) return false;
    const mergedConfig = {
      ...this.layoutConfigs.get(workflowId),
      ...config,
    } as LayoutConfig;
    this.layoutConfigs.set(workflowId, mergedConfig);

    // 层次布局：计算每个节点所在层级
    const inDegree = new Map<string, number>();
    for (const node of workflow.nodes) inDegree.set(node.node_id, 0);
    for (const edge of workflow.edges) {
      inDegree.set(edge.target_node_id, (inDegree.get(edge.target_node_id) || 0) + 1);
    }

    const ranks = new Map<string, number>();
    const queue: string[] = [];
    for (const node of workflow.nodes) {
      if ((inDegree.get(node.node_id) || 0) === 0) {
        ranks.set(node.node_id, 0);
        queue.push(node.node_id);
      }
    }

    const localInDegree = new Map(inDegree);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentRank = ranks.get(current) || 0;
      for (const edge of workflow.edges) {
        if (edge.source_node_id === current) {
          const newIn = (localInDegree.get(edge.target_node_id) || 0) - 1;
          localInDegree.set(edge.target_node_id, newIn);
          const existingRank = ranks.get(edge.target_node_id);
          if (existingRank === undefined || existingRank < currentRank + 1) {
            ranks.set(edge.target_node_id, currentRank + 1);
          }
          if (newIn === 0) queue.push(edge.target_node_id);
        }
      }
    }

    // 未分配层级的节点放到最后一层
    let maxRank = 0;
    for (const r of ranks.values()) if (r > maxRank) maxRank = r;
    for (const node of workflow.nodes) {
      if (!ranks.has(node.node_id)) ranks.set(node.node_id, maxRank + 1);
    }

    // 按层分组并分配位置
    const layers = new Map<number, string[]>();
    for (const [nodeId, rank] of ranks.entries()) {
      if (!layers.has(rank)) layers.set(rank, []);
      layers.get(rank)!.push(nodeId);
    }

    const sortedRanks = Array.from(layers.keys()).sort((a, b) => a - b);
    for (const rank of sortedRanks) {
      const nodeIds = layers.get(rank)!;
      nodeIds.forEach((nodeId, idx) => {
        const node = workflow.nodes.find((n) => n.node_id === nodeId);
        if (!node) return;
        if (mergedConfig.direction === 'TB') {
          node.position = {
            x: idx * mergedConfig.node_spacing,
            y: rank * mergedConfig.rank_spacing,
          };
        } else {
          node.position = {
            x: rank * mergedConfig.rank_spacing,
            y: idx * mergedConfig.node_spacing,
          };
        }
      });
    }

    workflow.updated_at = Date.now();
    return true;
  }

  getLayoutSuggestions(workflowId: string): LayoutSuggestion[] {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return [];
    const suggestions: LayoutSuggestion[] = [];
    // 检查重叠节点
    const positionMap = new Map<string, string[]>();
    for (const node of workflow.nodes) {
      const key = `${node.position.x},${node.position.y}`;
      if (!positionMap.has(key)) positionMap.set(key, []);
      positionMap.get(key)!.push(node.node_id);
    }
    for (const [, nodeIds] of positionMap.entries()) {
      if (nodeIds.length > 1) {
        nodeIds.slice(1).forEach((nodeId, idx) => {
          suggestions.push({
            node_id: nodeId,
            position: { x: 100 * (idx + 1), y: 100 },
            reason: '与其它节点位置重叠，建议偏移',
          });
        });
      }
    }
    // 检查孤立节点（无连接）
    for (const node of workflow.nodes) {
      const hasEdge = workflow.edges.some(
        (e) => e.source_node_id === node.node_id || e.target_node_id === node.node_id
      );
      if (!hasEdge && node.type !== NodeType.Start) {
        suggestions.push({
          node_id: node.node_id,
          position: { x: node.position.x + 200, y: node.position.y },
          reason: '节点无连接，建议靠近主流程或删除',
        });
      }
    }
    return suggestions;
  }

  // ==================== 缩放与导航 ====================

  getViewport(workflowId: string): Viewport | undefined {
    const vp = this.viewports.get(workflowId);
    return vp ? { ...vp } : undefined;
  }

  zoomIn(workflowId: string): Viewport | undefined {
    return this.adjustZoom(workflowId, ZOOM_STEP);
  }

  zoomOut(workflowId: string): Viewport | undefined {
    return this.adjustZoom(workflowId, -ZOOM_STEP);
  }

  resetZoom(workflowId: string): Viewport | undefined {
    const vp = this.viewports.get(workflowId);
    if (!vp) return undefined;
    vp.zoom = 1;
    return { ...vp };
  }

  panTo(workflowId: string, x: number, y: number): Viewport | undefined {
    const vp = this.viewports.get(workflowId);
    if (!vp) return undefined;
    vp.pan_x = x;
    vp.pan_y = y;
    return { ...vp };
  }

  fitToView(
    workflowId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ): Viewport | undefined {
    const workflow = this.workflows.get(workflowId);
    const vp = this.viewports.get(workflowId);
    if (!workflow || !vp || workflow.nodes.length === 0) return undefined;
    const padding = 40;
    const zoomX = (bounds.width - padding * 2) / Math.max(bounds.width, 1);
    const zoomY = (bounds.height - padding * 2) / Math.max(bounds.height, 1);
    vp.zoom = Math.min(zoomX, zoomY, MAX_ZOOM);
    if (vp.zoom < MIN_ZOOM) vp.zoom = MIN_ZOOM;
    vp.pan_x = -bounds.x * vp.zoom + padding;
    vp.pan_y = -bounds.y * vp.zoom + padding;
    return { ...vp };
  }

  private adjustZoom(workflowId: string, delta: number): Viewport | undefined {
    const vp = this.viewports.get(workflowId);
    if (!vp) return undefined;
    vp.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom + delta));
    return { ...vp };
  }

  // ==================== 导入导出 ====================

  exportWorkflow(workflowId: string): string | null {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;
    return JSON.stringify(this.cloneWorkflow(workflow), null, 2);
  }

  importWorkflow(json: string, newWorkflowId?: string): Workflow | null {
    try {
      const parsed = JSON.parse(json) as Workflow;
      const workflowId = newWorkflowId || parsed.workflow_id;
      if (this.workflows.has(workflowId)) return null;
      const now = Date.now();
      const workflow: Workflow = {
        ...parsed,
        workflow_id: workflowId,
        created_at: now,
        updated_at: now,
      };
      this.workflows.set(workflowId, workflow);
      this.viewports.set(workflowId, { ...DEFAULT_VIEWPORT });
      this.layoutConfigs.set(workflowId, { ...DEFAULT_LAYOUT });
      return this.cloneWorkflow(workflow);
    } catch {
      return null;
    }
  }

  // ==================== 工具方法 ====================

  private cloneWorkflow(workflow: Workflow): Workflow {
    return {
      ...workflow,
      nodes: workflow.nodes.map((n) => this.cloneNode(n)),
      edges: workflow.edges.map((e) => ({
        ...e,
        condition: e.condition ? { ...e.condition } : undefined,
      })),
      triggers: workflow.triggers.map((t) => ({ ...t })),
      variables: workflow.variables.map((v) => ({ ...v })),
    };
  }

  private cloneNode(node: WorkflowNode): WorkflowNode {
    return {
      ...node,
      position: { ...node.position },
      config: { ...node.config },
      inputs: node.inputs.map((p) => ({ ...p })),
      outputs: node.outputs.map((p) => ({ ...p })),
    };
  }
}

export const workflowEditor = new WorkflowEditor();
export default workflowEditor;
