/**
 * V48.0 零代码平台 — 统一导出
 *
 * 统一导出 API 可视化对接、数据流编排、自动化文档生成三个模块的全部类、接口、枚举与单例实例。
 *
 * @example
 * import {
 *   apiVisualIntegration,
 *   dataflowOrchestrator,
 *   autoDocGenerator,
 *   HttpMethod,
 *   FlowNodeType,
 *   DocFormat,
 * } from '@/utils/zerocode';
 */

// ==================== API 可视化对接 ====================

export { apiVisualIntegration } from './apiVisualIntegration';

export type {
  SchemaField,
  ApiSchema,
  FieldMapping,
  ApiEndpoint,
  DebugRequest,
  DebugResponse,
  DebugSession,
  ConnectionHealth,
} from './apiVisualIntegration';

export { HttpMethod, FieldType, ConnectionStatus } from './apiVisualIntegration';

// ==================== 数据流编排 ====================

export { dataflowOrchestrator } from './dataflowOrchestrator';

export type {
  FlowNode,
  FlowConnection,
  DataPacket,
  ExecutionContext,
  FlowExecution,
  TransformRule,
  FlowValidation,
} from './dataflowOrchestrator';

export { FlowNodeType, NodeStatus } from './dataflowOrchestrator';

// ==================== 自动化文档生成 ====================

export { autoDocGenerator } from './autoDocGenerator';

export type {
  DocSection,
  DocMetadata,
  GeneratedDoc,
  EndpointDocConfig,
  FlowDocConfig,
  ComponentDoc,
} from './autoDocGenerator';

export { DocFormat, ComponentType } from './autoDocGenerator';

// ==================== 默认导出 ====================

export { default as defaultApiVisualIntegration } from './apiVisualIntegration';
export { default as defaultDataflowOrchestrator } from './dataflowOrchestrator';
export { default as defaultAutoDocGenerator } from './autoDocGenerator';
