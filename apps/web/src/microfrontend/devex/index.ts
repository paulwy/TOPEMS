export {
  smartDebugger,
  SmartDebugger,
  type ComponentTreeNode,
  type ComponentNodeType,
  type StateStoreInfo,
  type StateStoreType,
  type NetworkRequest,
  type PerformanceTimelineEvent,
  type DebugSession,
  type DebugSessionStep,
  type ErrorBoundaryTestResult,
  type HotReloadState,
  type HotReloadStatus,
} from './smart-debugger';

export {
  performanceAnalyzer,
  PerformanceAnalyzer,
  type CoreWebVital,
  type CoreWebVitalName,
  type ModuleLoadMetric,
  type RenderMetric,
  type MemoryMetric,
  type BundleAnalysis,
  type LazyLoadEffectiveness,
  type PerformanceBudget,
  type PerformanceReport,
  type BudgetCheckResult,
  type BudgetCheckStatus,
} from './performance-analyzer';

export {
  codeCompletion,
  CodeCompletion,
  type CompletionItem,
  type CompletionKind,
  type CompletionContext,
  type Snippet,
} from './code-completion';

export { V51DevExPanel } from './devtools-panel';