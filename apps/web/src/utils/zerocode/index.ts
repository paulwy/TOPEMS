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

export { ApiVisualIntegration, apiVisualIntegration } from './api-visual-integration';

export type {
  SchemaField,
  ApiSchema,
  FieldMapping,
  ApiEndpoint,
  DebugRequest,
  DebugResponse,
  DebugSession,
  ConnectionHealth,
} from './api-visual-integration';

export {
  HttpMethod,
  EndpointStatus,
  FieldType,
  MappingDirection,
  ConnectionStatus,
} from './api-visual-integration';

// ==================== 数据流编排 ====================

export { DataflowOrchestrator, dataflowOrchestrator } from './dataflow-orchestrator';

export type {
  FlowNode,
  FlowConnection,
  DataPacket,
  ExecutionContext,
  FlowExecution,
  TransformRule,
  FlowValidation,
} from './dataflow-orchestrator';

export { FlowNodeType, NodeStatus, ExecutionMode, DataFormat } from './dataflow-orchestrator';

// ==================== 自动化文档生成 ====================

export { AutoDocGenerator, autoDocGenerator } from './auto-doc-generator';

export type {
  DocSection,
  DocMetadata,
  GeneratedDoc,
  EndpointDocConfig,
  FlowDocConfig,
  ComponentDoc,
} from './auto-doc-generator';

export { DocFormat, DocSectionType, ComponentType } from './auto-doc-generator';

// ==================== 默认导出 ====================

export { default as defaultApiVisualIntegration } from './api-visual-integration';
export { default as defaultDataflowOrchestrator } from './dataflow-orchestrator';
export { default as defaultAutoDocGenerator } from './auto-doc-generator';
