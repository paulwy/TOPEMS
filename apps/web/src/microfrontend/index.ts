/**
 * V47.0 微前端平台终局 — 统一开发平台 + 低代码搭建 + 插件市场
 *
 * 统一导出微前端模块的所有功能:
 * - config: 模块配置中心
 * - version-manager: 版本管理 + 热更新
 * - canary-release: 灰度发布
 * - performance: 性能监控
 * - observability: 可观测性体系（性能/错误/行为）
 * - RemoteLoader: 远程模块加载器
 * - registry: 模块注册表（旧版）
 * - registry/module-registry: 模块注册中心（V41.0新版）
 * - registry/registry-api: 注册中心 API 封装
 * - version-platform/version-platform: 版本管理平台
 * - version-platform/rollout-manager: 发布管理器
 * - observability/dashboard: 可观测性仪表盘
 * - ai-ops: V43.0 AI 运维（异常检测 + 智能告警 + 趋势预测 + 自动扩缩容）
 * - marketplace: V44.0 模块市场（模块发现 + 分类浏览 + 评分 + 安装/卸载）
 * - governance: V44.0 依赖治理（依赖图 + 循环检测 + 版本冲突 + 升级建议）
 * - security: V44.0 安全扫描（漏洞检测 + 权限审计 + 沙箱合规 + 安全评分）
 * - runtime: V45.0 运行时终极形态（动态加载 + 跨框架兼容 + 统一设计系统 + 生命周期管理）
 * - marketplace/plugin-market: V47.0 插件市场（插件全生命周期 + 依赖解析 + 评分评价）
 * - serverless: V48.0 无服务器架构（边缘渲染 + 函数即模块 + 按需加载）
 *
 * @example
 * import {
 *   versionManager,
 *   canaryRelease,
 *   microFrontendPerf,
 *   REMOTE_MODULES,
 *   RemoteLoader,
 *   moduleRegistry,
 *   versionPlatform,
 *   rolloutManager,
 *   moduleMarket,
 *   dependencyGovernor,
 *   securityScanner,
 *   dynamicLoader,
 *   crossFrameworkBridge,
 *   designSystemManager,
 *   lifecycleManager,
 *   ModuleMarketplace,
 *   DependencyGovernance,
 *   SecurityCenter,
 *   RuntimeDashboard,
 *   pluginMarket,
 * } from '@/microfrontend';
 */

// ==================== 配置中心 ====================
export { REMOTE_MODULES, getEnabledModules, getModulesByPreloadStrategy } from './config';
export type { RemoteModuleConfig } from './config';

// ==================== 版本管理 + 热更新 ====================
export {
  versionManager,
  type ModuleVersionInfo,
  type VersionUpdateEvent,
  type VersionCheckResult,
  type VersionUpdateCallback,
  type UpdateStrategy,
} from './version-manager';

// ==================== 灰度发布 ====================
export {
  canaryRelease,
  type CanaryConfig,
  type CanaryContext,
  type CanaryConfigCallback,
} from './canary-release';

// ==================== 性能监控 ====================
export { microFrontendPerf } from './performance';

// ==================== 可观测性体系（V40.0 + V217 MF 运行时埋点） ====================
export {
  modulePerformanceMetrics,
  errorTracker,
  userBehaviorAnalytics,
  ObservabilityPanel,
  initMFObservability,
  classifyMFError,
  getUserMessage,
  shouldShowToast,
  shouldSuppressToast,
  type ModulePerformanceMetrics,
  type ResourceLoadDetail,
  type TrackedError,
  type ErrorContext,
  type ErrorStats,
  type ModuleVisit,
  type ModuleAction,
  type ModuleVisitStats,
  type NavigationPath,
  type MFErrorType,
  type MFErrorSeverity,
  type MFErrorEvent,
} from './observability';

// ==================== 远程模块加载器 ====================
export {
  RemoteLoader,
  preloadRemoteModules,
  prefetchRemoteEntry,
  prefetchOnIdle,
  prefetchOnHover,
} from './RemoteLoader';

// ==================== 模块注册表 ====================
export { type RegisteredModule, type ModuleStatus } from './registry';

// ==================== 模块注册中心（V41.0新版）====================
export {
  moduleRegistry,
  type ModuleRegistration,
  type ModuleType,
  type ModuleFilter,
} from './registry/module-registry';
export { default as RegistryPanel } from './registry/RegistryPanel';

// ==================== 版本管理平台（V41.0）====================
export {
  type ModuleVersion,
  type VersionStatus,
  type VersioningStrategy,
  type VersionComparison,
} from './version-platform/version-platform';
export {
  type Rollout,
  type RolloutStrategy,
  type RolloutType,
  type RolloutStatus,
  type CanaryContext as RolloutCanaryContext,
} from './version-platform/rollout-manager';
export { default as VersionPanel } from './version-platform/VersionPanel';

// ==================== 可观测性仪表盘（V41.0）====================
export { default as ObservabilityDashboard } from './observability/dashboard/ObservabilityDashboard';

// ==================== 微前端路由 ====================
export { MicroAppRouter } from './MicroAppRouter';

// ==================== V43.0 AI 运维体系 ====================
// 异常检测
export {
  anomalyDetector,
  AnomalyDetector,
  StatisticalAnalyzer,
  type MetricBaseline,
  type AnomalyResult,
  type AnomalyEvent,
  type AnomalyDetectorConfig,
} from './ai-ops/anomaly-detector';

// 智能告警
export {
  smartAlertManager,
  SmartAlertManager,
  type Alert,
  type AlertRule,
  type AlertCondition,
  type AlertStats,
  type CorrelationRule,
  type SuppressionRule,
  type AlertSeverity,
  type AlertStatus,
  type AlertConditionOperator,
} from './ai-ops/smart-alerting';

// 趋势预测
export {
  metricPredictor,
  MetricPredictor,
  SimplePredictor,
  type PredictionResult,
  type PredictionWithConfidence,
  type PredictedAnomaly,
  type PredictorConfig,
} from './ai-ops/predictor';

// 自动扩缩容
export {
  autoScaler,
  AutoScaler,
  type ScalingPolicy,
  type ScalingMetric,
  type ScalingDecision,
  type ModuleInstanceInfo,
  type ModuleMetrics,
  type ScalingEvent,
  type AutoScalerConfig,
  type ScalingDirection,
  type ScalingStatus,
} from './ai-ops/auto-scaler';

// AI 运维面板
export { default as AIOpsPanel } from './ai-ops/AIOpsPanel';

// AI 运维模块整体导出
export * as aiOps from './ai-ops';

// ==================== V44.0 模块市场 ====================
export {
  moduleMarket,
  type MarketplaceModule,
  type ModuleDependencyRef,
  type ModuleReview,
  type Category,
  type ModuleSortType,
} from './marketplace';

export { default as ModuleMarketplace } from './marketplace/ModuleMarketplace';

export * as marketplace from './marketplace';

// ==================== V44.0 依赖治理 ====================
export {
  DependencyGovernor,
  dependencyGovernor,
  type ModuleDependency,
  type DependencyGraphNode,
  type DependencyGraphEdge,
  type DependencyGraph,
  type DependencyConflict,
  type VersionUpgradeSuggestion,
  type LicenseInfo,
  type DependencyStats,
  type ConflictSeverity as DependencyConflictSeverity,
} from './governance';

export { default as DependencyGovernance } from './governance/DependencyGovernance';

export * as governance from './governance';

// ==================== V44.0 安全扫描 ====================
export {
  securityScanner,
  SecurityIssueSeverity,
  SecurityCategory,
  type SecurityScanResult,
  type SecurityIssue,
  type PermissionAudit,
  type ScanHistoryEntry,
} from './security';

export { default as SecurityCenter } from './security/SecurityCenter';

export * as security from './security';

// ==================== V45.0 运行时终极形态 ====================
// 运行时动态加载（import + 并发控制 + 重试 + 缓存）
export {
  dynamicLoader,
  ModuleLoadStatus,
  type DynamicLoaderConfig,
  type RuntimeModule,
} from './runtime/dynamic-loader';

// 跨框架兼容（React/Vue/Angular/Svelte 适配器 + 统一生命周期）
export {
  crossFrameworkBridge,
  FrameworkType,
  type FrameworkAdapter,
  type UnifiedProps,
  type UnifiedEvents,
  type UnifiedLifecycle,
  type LifecycleHook,
  type MountedComponent,
} from './runtime/cross-framework';

// 统一设计系统（设计令牌 + 主题 + CSS 变量同步）
export {
  designSystemManager,
  TokenType,
  type DesignToken,
  type ThemeConfig,
  type ThemeMode,
} from './runtime/design-system';

// 统一生命周期管理（状态机 + 钩子 + 事件时间线）
export {
  lifecycleManager,
  LifecycleState,
  LifecycleEventType,
  type LifecycleEvent,
  type LifecycleHooks,
  type ModuleLifecycleRecord,
} from './runtime/module-lifecycle';

// 运行时控制台
export { default as RuntimeDashboard } from './runtime/RuntimeDashboard';

// 运行时模块整体导出
export * as runtime from './runtime';

// ==================== V47.0 插件市场 ====================
// 插件全生命周期：注册/发现/安装/卸载/版本/依赖解析/评分评价/搜索分类
// 注意：与 marketplace（模块市场）独立，模块面向业务，插件面向平台扩展
export {
  PluginMarket,
  PluginCategory,
  type Plugin,
  type PluginVersion,
  type PluginInstallRequest,
  type PluginInstallation,
  type PluginReview,
  type PluginDependency,
  type PluginStats,
  type PluginSortType,
  type InstallationStatus,
  type DependencyCheckResult as PluginDependencyCheckResult,
  type DependencyConflict as PluginDependencyConflict,
} from './marketplace/plugin-index';

// ==================== V48.0 无服务器架构 ====================
// 边缘渲染引擎（SSR/SSG/ISR + 多级缓存 + 地理感知路由）
export {
  edgeRenderer,
  type RenderMode,
  type CacheTier,
  type RenderStatus,
  type RenderRequest,
  type RenderResult,
  type RenderedPage,
  type RenderStats,
  type RendererConfig,
  type RenderCallback,
} from './serverless/edge-renderer';

// 函数即模块（函数注册 + 依赖编排 + 结果缓存 + 可观测性）
export {
  faas,
  type FunctionStatus,
  type ExecStatus,
  type FunctionDefinition,
  type InvokeContext,
  type InvokeOptions,
  type InvokeResult,
  type ExecutionTrace,
  type FaasStats,
  type FaasConfig,
  type FunctionMiddleware,
  type FaasCallback,
} from './serverless/function-as-module';

// 按需加载引擎（智能预加载 + 懒加载 + 条件加载 + 优先级调度）
export {
  onDemandLoader,
  type LoadPriority,
  type PreloadStrategy,
  type LoadStatus,
  type LoadCondition,
  type OnDemandModule,
  type LoadRequest,
  type LoadResult,
  type AccessRecord,
  type LoadPredictionResult,
  type LoaderStats,
  type LoaderConfig,
  type OnDemandCallback,
} from './serverless/on-demand-loader';

export * as serverless from './serverless';

// ==================== V51.0 DevEx 开发体验 ====================
// 智能调试器（组件树 + 状态检查 + 网络拦截 + 会话录制回放）
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
} from './devex/smart-debugger';

// 性能分析器（Core Web Vitals + 模块加载 + 渲染性能 + 预算检查）
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
} from './devex/performance-analyzer';

// 智能代码补全（模块 API + Props 提示 + 自动导入 + 代码片段）
export {
  codeCompletion,
  CodeCompletion,
  type CompletionItem,
  type CompletionKind,
  type CompletionContext,
  type Snippet,
} from './devex/code-completion';

// DevTools 集成面板
export { V51DevExPanel } from './devex/devtools-panel';

export * as devex from './devex';
