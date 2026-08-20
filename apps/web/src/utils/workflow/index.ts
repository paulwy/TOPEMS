/**
 * V48.0 前端智能编排 — 工作流可视化编辑器 + 拖拽编排 + 自动化触发
 *
 * 统一导出工作流编辑、拖拽编排、自动化触发三个模块的全部类、接口、枚举与单例实例。
 *
 * @example
 * import {
 *   workflowEditor,
 *   dragOrchestrator,
 *   autoTriggerEngine,
 *   NodeType,
 *   TriggerType,
 * } from '@/utils/workflow';
 */

// ==================== 工作流编辑器 ====================

export type {
  Workflow,
  WorkflowNode,
  NodePort,
  NodePosition,
  WorkflowEdge,
  EdgeCondition,
  WorkflowVariable,
  WorkflowTriggerRef,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  LayoutConfig,
  Viewport,
  LayoutSuggestion,
} from './workflow-editor';

export { NodeType, WorkflowStatus } from './workflow-editor';

// ==================== 拖拽编排引擎 ====================

export type {
  DragContext,
  DropTarget,
  ConnectionSuggestion,
  NodeGroup,
  HistoryEntry,
} from './drag-orchestrator';

// ==================== 自动化触发引擎 ====================

export type {
  Trigger,
  TriggerHistory,
  TriggerStats,
  TriggerSuggestion,
  AnomalyDetection,
  ScheduleConfig,
  EventConfig,
  WebhookConfig,
  DataChangeConfig,
  ThresholdConfig,
  CompoundConfig,
  TriggerConfig,
} from './auto-trigger';

export { TriggerType } from './auto-trigger';

// ==================== 默认导出 ====================

export { default as defaultWorkflowEditor } from './workflow-editor';
export { default as defaultDragOrchestrator } from './drag-orchestrator';
export { default as defaultAutoTriggerEngine } from './auto-trigger';
