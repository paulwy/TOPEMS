/**
 * V44.0 Track D: BFF 组件统一导出
 *
 * 组件级 GraphQL + 全页面 BFF 改造模板组件:
 * - BffDataTable: BFF 驱动的数据表格（自动生成查询/分页/搜索/过滤/排序/分片）
 * - BffDetailPage: BFF 详情页模板（自动渲染字段/关联数据/编辑模式）
 * - BffFormPage: BFF 表单页模板（自动渲染字段/验证/提交/乐观更新）
 *
 * 与 BFF hooks 配合使用，实现全链路 BFF 化开发。
 */

export { BffDataTable } from './BffDataTable';
export type { BffDataTableProps, BffColumn } from './BffDataTable';

export { BffDetailPage } from './BffDetailPage';
export type {
  BffDetailPageProps,
  DetailFieldConfig,
  FieldGroup,
  RelatedQuery,
} from './BffDetailPage';

export { BffFormPage } from './BffFormPage';
export type { BffFormPageProps, BffFormField, BffFormSection } from './BffFormPage';

// 重新导出 hooks 方便组件同目录引入
export { useBffListPage, useBffCrud, useAutoSharding } from '@/hooks/bff';
export type {
  UseBffListPageOptions,
  UseBffListPageResult,
  UseBffDetailPageOptions,
  UseBffDetailPageResult,
  UseBffFormPageOptions,
  UseBffFormPageResult,
  UseBffCrudOptions,
  UseBffCrudResult,
} from '@/hooks/bff';

// 重新导出工具函数
export { QueryBuilder, MutationBuilder, queryTemplates } from '@/utils/bff/query-builder';
export type {
  FieldType,
  FieldSelection,
  SortField,
  FilterCondition,
  PaginationParams,
  IncludeRelation,
  BuiltQuery,
} from '@/utils/bff/query-builder';

export {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  pluralize,
  singularize,
  buildQueryName,
  buildMutationName,
  generateEntityQueries,
  generateTypeScriptTypes,
  generateReactQueryHooks,
  generateListPageTemplate,
} from '@/utils/bff/codegen';
export type { FieldDefinition, EntitySchema } from '@/utils/bff/codegen';

export {
  SmartShardingDecider,
  ProgressiveLoader,
  executeParallelShards,
} from '@/utils/bff/auto-sharding-v2';
export type {
  ShardStrategyV2,
  ShardInfoV2,
  ShardMetrics,
  ShardPlanV2,
  ShardDeciderOptions,
  ProgressiveLoadOptions,
  RetryConfig,
  ShardExecuteResultV2,
} from '@/utils/bff/auto-sharding-v2';

// ==================== V45.0 Track D: BFF 生产化（错误边界 + 降级 UI + A/B 测试面板） ====================

// 错误边界（类组件）：错误分类 + 恢复策略 + 错误上报
export {
  BffErrorBoundary,
  DefaultBffErrorFallback,
  classifyError,
  reportError,
  getErrorReports,
  clearErrorReports,
  onErrorReport,
  BffErrorType,
  ErrorRecoveryStrategy,
} from './BffErrorBoundary';
export type {
  BffErrorBoundaryProps,
  BffErrorBoundaryFallbackProps,
  ClassifiedError,
  ErrorReportRecord,
} from './BffErrorBoundary';

// 降级 UI 组件：加载/错误/离线/缓存兜底 + 统一容器
// 注意：与 hooks/bff/useBffSuspense 中的同名组件不同，这里是面向降级策略的生产级 UI
// （含重试计数、缓存预览、离线提示等），通过 '@/components/bff' 引用。
export {
  BffLoadingFallback,
  BffErrorFallback,
  BffOfflineFallback,
  BffCacheFallback,
  BffFallbackContainer,
} from './BffFallback';
export type {
  BffFallbackBaseProps,
  BffLoadingFallbackProps,
  BffErrorFallbackProps as BffFallbackErrorFallbackProps,
  BffOfflineFallbackProps,
  BffCacheFallbackProps,
  BffFallbackContainerProps,
} from './BffFallback';

// A/B 测试管理面板：实验列表 + 创建表单 + 结果可视化
export { ABTestPanel } from './ABTestPanel';
export type { ABTestPanelProps } from './ABTestPanel';

// 降级策略引擎 + A/B 测试引擎（工具单例）
export {
  FallbackLevel,
  FallbackManager,
  GraphqlToRestFallback,
  CacheFallback,
  UIFallback,
  OfflineFallback,
  fallbackManager,
} from '@/utils/bff/fallback-strategy';
export type {
  FallbackContext,
  FallbackResult,
  FallbackStrategy,
  FallbackRecord,
  FallbackStats,
} from '@/utils/bff/fallback-strategy';

export { ABTestEngine, ExperimentStatus, fnv1aHash, abTestEngine } from '@/utils/bff/ab-testing';
export type {
  TargetingOperator,
  TargetingRule,
  Variant,
  ExperimentMetric,
  Experiment,
  VariantResult,
  ExperimentResult,
  AssignmentRecord,
  ConversionEvent,
} from '@/utils/bff/ab-testing';
