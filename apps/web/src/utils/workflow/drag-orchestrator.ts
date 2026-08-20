/**
 * V48.0 前端智能编排 — 拖拽编排引擎
 *
 * 提供工作流编辑器中节点的拖拽与智能编排能力，支持:
 * - 拖拽上下文管理与放置目标注册
 * - 基于节点类型的连接智能建议
 * - 网格对齐、节点对齐与自动排列
 * - 节点分组、复制/粘贴
 * - 撤销/重做操作历史
 *
 * @example
 * import { dragOrchestrator } from '@/utils/workflow';
 *
 * dragOrchestrator.registerDropTarget({
 *   target_id: 'canvas',
 *   target_type: 'canvas',
 *   accepted_types: ['task', 'decision'],
 *   position: { x: 0, y: 0 },
 *   highlight: false,
 * });
 * dragOrchestrator.startDrag({ source_type: 'node', source_data: { type: 'task' } });
 */

import { NodeType, type WorkflowNode, type NodePosition } from './workflow-editor';
import i18n from '@/i18n';

// ==================== 枚举 ====================

enum DragState {
  IDLE = 'idle',
  DRAGGING = 'dragging',
  HOVERING = 'hovering',
  DROPPING = 'dropping',
  CANCELLED = 'cancelled',
}

enum AlignType {
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
  CENTERH = 'center-h',
  CENTERV = 'center-v',
  DISTRIBUTEH = 'distribute-h',
  DISTRIBUTEV = 'distribute-v',
}

// ==================== 接口 ====================

export interface DragContext {
  source_type: 'node' | 'palette-item' | 'group';
  source_data: Record<string, unknown>;
  drag_offset: NodePosition;
  drop_targets: string[];
  current_position?: NodePosition;
}

export interface DropTarget {
  target_id: string;
  target_type: 'canvas' | 'node' | 'group';
  accepted_types: string[];
  position: NodePosition;
  highlight: boolean;
}

export interface ConnectionSuggestion {
  source_node_id: string;
  target_node_id: string;
  confidence: number;
  reason: string;
}

export interface NodeGroup {
  group_id: string;
  name: string;
  node_ids: string[];
  color?: string;
}

export interface HistoryEntry {
  action: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

// ==================== 常量 ====================

const DEFAULT_GRID_SIZE = 8;
const NODE_TYPE_COMPATIBILITY: Record<string, string[]> = {
  [NodeType.START]: [NodeType.TASK, NodeType.DECISION, NodeType.PARALLEL, NodeType.DELAY],
  [NodeType.TASK]: [
    NodeType.TASK,
    NodeType.DECISION,
    NodeType.PARALLEL,
    NodeType.TRANSFORM,
    NodeType.NOTIFY,
    NodeType.END,
  ],
  [NodeType.DECISION]: [NodeType.TASK, NodeType.PARALLEL, NodeType.END],
  [NodeType.PARALLEL]: [NodeType.TASK, NodeType.TRANSFORM, NodeType.AGGREGATE],
  [NodeType.HTTPREQUEST]: [NodeType.TRANSFORM, NodeType.FILTER, NodeType.END],
  [NodeType.GRAPHQLQUERY]: [NodeType.TRANSFORM, NodeType.FILTER, NodeType.END],
  [NodeType.DATABASEQUERY]: [NodeType.TRANSFORM, NodeType.FILTER, NodeType.AGGREGATE, NodeType.END],
  [NodeType.TRANSFORM]: [
    NodeType.TASK,
    NodeType.FILTER,
    NodeType.AGGREGATE,
    NodeType.NOTIFY,
    NodeType.END,
  ],
  [NodeType.FILTER]: [NodeType.TASK, NodeType.TRANSFORM, NodeType.END],
  [NodeType.AGGREGATE]: [NodeType.TRANSFORM, NodeType.NOTIFY, NodeType.END],
  [NodeType.LOOP]: [NodeType.TASK, NodeType.TRANSFORM],
  [NodeType.DELAY]: [NodeType.TASK, NodeType.DECISION, NodeType.END],
  [NodeType.SUBWORKFLOW]: [NodeType.TASK, NodeType.NOTIFY, NodeType.END],
  [NodeType.NOTIFY]: [NodeType.END],
  [NodeType.AI]: [NodeType.TRANSFORM, NodeType.FILTER, NodeType.NOTIFY, NodeType.END],
};

// ==================== 拖拽编排器 ====================

class DragOrchestrator {
  private state: DragState = DragState.IDLE;
  private context: DragContext | null = null;
  private dropTargets: Map<string, DropTarget> = new Map();
  private clipboard: WorkflowNode[] = [];
  private groups: Map<string, NodeGroup> = new Map();
  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private gridSize: number = DEFAULT_GRID_SIZE;
  private snapEnabled: boolean = true;

  // ==================== 拖拽生命周期 ====================

  startDrag(context: Omit<DragContext, 'drop_targets'>): boolean {
    if (this.state !== DragState.IDLE) return false;
    this.context = {
      ...context,
      drop_targets: Array.from(this.dropTargets.keys()),
    };
    this.state = DragState.DRAGGING;
    this.recordHistory('startDrag', { context: this.context });
    return true;
  }

  updateDrag(position: NodePosition): DragState {
    if (!this.context || this.state === DragState.IDLE) return this.state;
    this.context.current_position = position;
    const target = this.getDropTargetAt(position);
    // 取消所有高亮
    for (const target of this.dropTargets.values()) {
      target.highlight = false;
    }
    if (target) {
      target.highlight = true;
      this.state = DragState.HOVERING;
    } else {
      this.state = DragState.DRAGGING;
    }
    return this.state;
  }

  endDrag(position: NodePosition): DropTarget | null {
    if (!this.context) return null;
    const target = this.getDropTargetAt(position);
    if (target) {
      this.state = DragState.DROPPING;
      this.recordHistory('endDrag', {
        context: this.context,
        target_id: target.target_id,
      });
    } else {
      this.state = DragState.IDLE;
    }
    this.context = null;
    // 清理高亮
    for (const t of this.dropTargets.values()) t.highlight = false;
    return target;
  }

  cancelDrag(): void {
    if (this.state === DragState.IDLE) return;
    this.state = DragState.CANCELLED;
    this.context = null;
    for (const target of this.dropTargets.values()) target.highlight = false;
    this.recordHistory('cancelDrag', {});
    this.state = DragState.IDLE;
  }

  getState(): DragState {
    return this.state;
  }

  getContext(): DragContext | null {
    return this.context ? { ...this.context } : null;
  }

  // ==================== 放置目标管理 ====================

  registerDropTarget(target: DropTarget): boolean {
    if (this.dropTargets.has(target.target_id)) return false;
    this.dropTargets.set(target.target_id, { ...target });
    return true;
  }

  unregisterDropTarget(targetId: string): boolean {
    return this.dropTargets.delete(targetId);
  }

  getDropTargetAt(position: NodePosition): DropTarget | null {
    for (const target of this.dropTargets.values()) {
      if (
        position.x >= target.position.x &&
        position.y >= target.position.y &&
        position.x <= target.position.x + 200 &&
        position.y <= target.position.y + 200
      ) {
        if (
          this.context &&
          !target.accepted_types.includes(this.context.source_data.type as string)
        ) {
          continue;
        }
        return { ...target };
      }
    }
    return null;
  }

  listDropTargets(): DropTarget[] {
    return Array.from(this.dropTargets.values()).map((t) => ({ ...t }));
  }

  // ==================== 智能编排 ====================

  suggestConnections(nodes: WorkflowNode[]): ConnectionSuggestion[] {
    const suggestions: ConnectionSuggestion[] = [];
    for (const source of nodes) {
      const compatible = NODE_TYPE_COMPATIBILITY[source.type] || [];
      for (const target of nodes) {
        if (source.node_id === target.node_id) continue;
        if (!compatible.includes(target.type)) continue;
        const confidence = this.computeConnectionConfidence(source, target);
        if (confidence > 0) {
          suggestions.push({
            source_node_id: source.node_id,
            target_node_id: target.node_id,
            confidence,
            reason: this.explainSuggestion(source.type, target.type),
          });
        }
      }
    }
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private computeConnectionConfidence(source: WorkflowNode, target: WorkflowNode): number {
    let confidence = 0.5;
    // Start 节点优先连接
    if (source.type === NodeType.START) confidence += 0.3;
    // 数据流匹配：源有输出、目标有输入
    if (source.outputs.length > 0 && target.inputs.length > 0) {
      const hasMatch = source.outputs.some((out) =>
        target.inputs.some((inp) => inp.type === out.type)
      );
      if (hasMatch) confidence += 0.15;
    }
    // 距离接近加分
    const dx = source.position.x - target.position.x;
    const dy = source.position.y - target.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 300) confidence += 0.05;
    return Math.min(1, confidence);
  }

  private explainSuggestion(sourceType: string, targetType: string): string {
    if (sourceType === NodeType.START) return i18n.t('shared.drag-orchestrator.k0');
    if (targetType === NodeType.END) return i18n.t('shared.drag-orchestrator.k1');
    if (sourceType === NodeType.DECISION) return i18n.t('shared.drag-orchestrator.k2');
    if (sourceType === NodeType.HTTPREQUEST && targetType === NodeType.TRANSFORM)
      return i18n.t('shared.drag-orchestrator.http_0');
    if (sourceType === NodeType.DATABASEQUERY && targetType === NodeType.AGGREGATE)
      return i18n.t('shared.drag-orchestrator.k3');
    return i18n.t('shared.drag-orchestrator.k4');
  }

  autoArrange(nodes: WorkflowNode[]): WorkflowNode[] {
    if (nodes.length === 0) return nodes;
    const arranged = nodes.map((n) => ({ ...n, position: { ...n.position } }));
    // 按类型排序：Start -> 任务 -> 转换 -> End
    const order: Record<string, number> = {
      [NodeType.START]: 0,
      [NodeType.HTTPREQUEST]: 1,
      [NodeType.GRAPHQLQUERY]: 1,
      [NodeType.DATABASEQUERY]: 1,
      [NodeType.AI]: 1,
      [NodeType.TASK]: 2,
      [NodeType.TRANSFORM]: 3,
      [NodeType.FILTER]: 3,
      [NodeType.AGGREGATE]: 3,
      [NodeType.DECISION]: 4,
      [NodeType.PARALLEL]: 4,
      [NodeType.LOOP]: 4,
      [NodeType.DELAY]: 5,
      [NodeType.NOTIFY]: 6,
      [NodeType.SUBWORKFLOW]: 2,
      [NodeType.END]: 7,
    };
    arranged.sort((a, b) => (order[a.type] ?? 99) - (order[b.type] ?? 99));
    arranged.forEach((node, idx) => {
      node.position = {
        x: (idx % 4) * 200,
        y: Math.floor(idx / 4) * 150,
      };
    });
    return arranged;
  }

  snapToGrid(position: NodePosition, gridSize?: number): NodePosition {
    if (!this.snapEnabled) return { ...position };
    const size = gridSize || this.gridSize;
    return {
      x: Math.round(position.x / size) * size,
      y: Math.round(position.y / size) * size,
    };
  }

  alignNodes(nodes: WorkflowNode[], type: AlignType): WorkflowNode[] {
    if (nodes.length < 2) return nodes;
    const aligned = nodes.map((n) => ({ ...n, position: { ...n.position } }));
    switch (type) {
      case AlignType.LEFT: {
        const minX = Math.min(...aligned.map((n) => n.position.x));
        aligned.forEach((n) => (n.position.x = minX));
        break;
      }
      case AlignType.RIGHT: {
        const maxX = Math.max(...aligned.map((n) => n.position.x));
        aligned.forEach((n) => (n.position.x = maxX));
        break;
      }
      case AlignType.TOP: {
        const minY = Math.min(...aligned.map((n) => n.position.y));
        aligned.forEach((n) => (n.position.y = minY));
        break;
      }
      case AlignType.BOTTOM: {
        const maxY = Math.max(...aligned.map((n) => n.position.y));
        aligned.forEach((n) => (n.position.y = maxY));
        break;
      }
      case AlignType.CENTERH: {
        const avgX = aligned.reduce((sum, n) => sum + n.position.x, 0) / aligned.length;
        aligned.forEach((n) => (n.position.x = Math.round(avgX)));
        break;
      }
      case AlignType.CENTERV: {
        const avgY = aligned.reduce((sum, n) => sum + n.position.y, 0) / aligned.length;
        aligned.forEach((n) => (n.position.y = Math.round(avgY)));
        break;
      }
      case AlignType.DISTRIBUTEH: {
        const sorted = [...aligned].sort((a, b) => a.position.x - b.position.x);
        const first = sorted[0].position.x;
        const last = sorted[sorted.length - 1].position.x;
        const step = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
        sorted.forEach((n, idx) => (n.position.x = first + step * idx));
        break;
      }
      case AlignType.DISTRIBUTEV: {
        const sorted = [...aligned].sort((a, b) => a.position.y - b.position.y);
        const first = sorted[0].position.y;
        const last = sorted[sorted.length - 1].position.y;
        const step = sorted.length > 1 ? (last - first) / (sorted.length - 1) : 0;
        sorted.forEach((n, idx) => (n.position.y = first + step * idx));
        break;
      }
    }
    this.recordHistory('alignNodes', { type, node_ids: aligned.map((n) => n.node_id) });
    return aligned;
  }

  groupNodes(nodeIds: string[], name: string): NodeGroup | null {
    if (nodeIds.length === 0) return null;
    const groupId = `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const group: NodeGroup = {
      group_id: groupId,
      name,
      node_ids: [...nodeIds],
    };
    this.groups.set(groupId, group);
    this.recordHistory('groupNodes', { group_id: groupId, node_ids: nodeIds });
    return { ...group };
  }

  ungroupNodes(groupId: string): boolean {
    const deleted = this.groups.delete(groupId);
    if (deleted) this.recordHistory('ungroupNodes', { group_id: groupId });
    return deleted;
  }

  getGroup(groupId: string): NodeGroup | undefined {
    const group = this.groups.get(groupId);
    return group ? { ...group } : undefined;
  }

  listGroups(): NodeGroup[] {
    return Array.from(this.groups.values()).map((g) => ({ ...g }));
  }

  // ==================== 复制/粘贴 ====================

  copyNodes(nodes: WorkflowNode[]): void {
    this.clipboard = nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      config: { ...n.config },
      inputs: n.inputs.map((p) => ({ ...p })),
      outputs: n.outputs.map((p) => ({ ...p })),
    }));
    this.recordHistory('copyNodes', { count: nodes.length });
  }

  pasteNodes(offset: NodePosition = { x: 20, y: 20 }): WorkflowNode[] {
    const pasted: WorkflowNode[] = this.clipboard.map((n) => ({
      ...n,
      node_id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
      config: { ...n.config },
      inputs: n.inputs.map((p) => ({ ...p })),
      outputs: n.outputs.map((p) => ({ ...p })),
    }));
    this.recordHistory('pasteNodes', { count: pasted.length });
    return pasted;
  }

  hasClipboard(): boolean {
    return this.clipboard.length > 0;
  }

  // ==================== 撤销/重做 ====================

  undo(): HistoryEntry | null {
    if (this.historyIndex < 0) return null;
    const entry = this.history[this.historyIndex];
    this.historyIndex = Math.max(-1, this.historyIndex - 1);
    return entry ? { ...entry } : null;
  }

  redo(): HistoryEntry | null {
    if (this.historyIndex >= this.history.length - 1) return null;
    this.historyIndex = Math.min(this.history.length - 1, this.historyIndex + 1);
    return { ...this.history[this.historyIndex] };
  }

  getHistory(): HistoryEntry[] {
    return this.history.slice(0, this.historyIndex + 1).map((h) => ({ ...h }));
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  // ==================== 配置 ====================

  setGridSize(size: number): void {
    this.gridSize = size;
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled = enabled;
  }

  // ==================== 内部方法 ====================

  private recordHistory(action: string, payload: Record<string, unknown>): void {
    // 如果在历史中间执行新操作，截断后续历史
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push({
      action,
      timestamp: Date.now(),
      payload,
    });
    this.historyIndex = this.history.length - 1;
    // 限制历史长度
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
      this.historyIndex = this.history.length - 1;
    }
  }
}

const dragOrchestrator = new DragOrchestrator();
export default dragOrchestrator;
