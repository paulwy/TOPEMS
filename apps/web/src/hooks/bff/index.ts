/**
 * V44.0 Track D: BFF Hooks 入口
 *
 * 统一导出所有基于 BFF GraphQL 的 hooks：
 * - useBffCrud: 通用 CRUD（list/get/create/update/delete）
 * - useBffSubscription: 通用 GraphQL Subscription（WebSocket）
 * - useBffDashboard: 仪表盘聚合查询
 * - useBffPerformance: GraphQL 查询性能监控
 * - useSlowQueryAlert: 慢查询告警
 * - useQueryCost: 查询成本分析（V41.0）
 * - useAutoSharding: 自动分片查询（V41.0）
 * - useSmartPrefetch: 智能预加载（V41.0）
 *
 * V42.0 Track D 高级模式：
 * - useBffSuspenseQuery / useBffSuspenseInfinite: 基于 Suspense 的数据加载
 * - usePartialPreRender: 部分预渲染（PPR）
 * - useRouteDataLoader: 路由级数据加载器（DeferredData + Suspense）
 * - BffSuspenseBoundary / BffErrorFallback / BffLoadingFallback: Suspense 边界组件
 * - StreamingSlot / StaticShell: PPR 流式占位与静态壳组件
 *
 * V43.0 Track D 极致性能：
 * - useEdgeCompute: 边缘计算 + 边缘缓存
 * - useEdgeCache: 边缘缓存 hook
 * - useOptimalEndpoint: 最优边缘节点选择
 * - useIsrCache: 增量静态再生（ISR）
 * - useRevalidate: 按需重验证
 * - useIsrStats: ISR 缓存统计
 *
 * V44.0 Track D 全页面 BFF 改造：
 * - useBffListPage: 列表页完整逻辑（搜索/过滤/分页/批量操作）
 * - useBffDetailPage: 详情页完整逻辑（加载/编辑/删除/关联数据）
 * - useBffFormPage: 表单页完整逻辑（创建/更新/验证/提交）
 *
 * 所有 hooks 通过 BFF GraphQL 出口获取数据，替代直接 REST 调用。
 */

export { useBffCrud } from './useBffCrud';
export type { UseBffCrudOptions, UseBffCrudResult } from './useBffCrud';

export { useBffSubscription } from './useBffSubscription';
export type {
  UseBffSubscriptionOptions,
  UseBffSubscriptionResult,
  SubscriptionStatus,
} from './useBffSubscription';

export { useBffDashboard, BFF_DASHBOARD_QUERY_KEY } from './useBffDashboard';
export type {
  UseBffDashboardOptions,
  UseBffDashboardResult,
  BffDashboardData,
} from './useBffDashboard';

export { useBffPerformance } from './useBffPerformance';
export type { UseBffPerformanceResult, SlowQueryCallback } from './useBffPerformance';

export { useSlowQueryAlert } from './useSlowQueryAlert';
export type {
  SlowQueryAlertOptions,
  UseSlowQueryAlertResult,
  AlertLevel,
} from './useSlowQueryAlert';

export { useQueryCost } from './useQueryCost';
export type { UseQueryCostOptions, UseQueryCostResult, HighCostCallback } from './useQueryCost';

export { useAutoSharding } from './useAutoSharding';
export type { UseAutoShardingOptions, UseAutoShardingResult } from './useAutoSharding';

export { useSmartPrefetch } from './useSmartPrefetch';
export type { UseSmartPrefetchOptions, UseSmartPrefetchResult } from './useSmartPrefetch';

// ==================== V42.0 Track D: Suspense 数据加载 ====================

export {
  useBffSuspenseQuery,
  useBffSuspenseInfinite,
  usePrefetchBffSuspenseQuery,
  useSuspensePerfTracker,
  BffSuspenseBoundary,
  BffErrorFallback,
  BffLoadingFallback,
  recordSuspenseMount,
  getSuspenseStats,
  onSuspenseStatsChange,
} from './useBffSuspense';
export type {
  UseBffSuspenseQueryOptions,
  UseBffSuspenseQueryResult,
  UseBffSuspenseInfiniteOptions,
  UseBffSuspenseInfiniteResult,
  BffInfiniteCursor,
  BffSuspenseBoundaryProps,
  BffLoadingFallbackProps,
  BffErrorFallbackProps,
  SuspenseMountRecord,
} from './useBffSuspense';

// ==================== V42.0 Track D: 部分预渲染（PPR） ====================

export {
  usePartialPreRender,
  prefetchRouteShell,
  registerRouteShell,
  unregisterRouteShell,
  clearPrefetchedShells,
  StreamingSlot,
  StaticShell,
  recordPPRSlot,
  getPPRStats,
  onPPRStatsChange,
} from './usePartialPreRender';
export type {
  RouteShellConfig,
  ShellRenderer,
  UsePartialPreRenderResult,
  StreamingSlotProps,
  StaticShellProps,
  PPRSlotRecord,
} from './usePartialPreRender';

// ==================== V42.0 Track D: 路由级数据加载器 ====================

export {
  useRouteDataLoader,
  createDeferred,
  DeferredData,
  RouteDataBoundary,
} from './useRouteDataLoader';
export type {
  RouteParams,
  RouteLoaderConfig,
  RouteDeferredLoaderConfig,
  RouteDataLoader,
  RouteDataEntry,
  RouteLoaderState,
  UseRouteDataLoaderResult,
  RouteDataBoundaryProps,
} from './useRouteDataLoader';

// ==================== V43.0 Track D: 边缘计算（Edge Compute） ====================

export {
  useEdgeCompute,
  useEdgeCache,
  useOptimalEndpoint,
  useEdgeComputeConfig,
} from './useEdgeCompute';
export type {
  UseEdgeComputeOptions,
  UseEdgeComputeResult,
  UseEdgeCacheOptions,
  UseEdgeCacheResult,
  UseOptimalEndpointResult,
} from './useEdgeCompute';

// ==================== V43.0 Track D: 增量静态再生（ISR） ====================

export { useIsrCache, useRevalidate, useIsrStats, useIsrEntry, useIsrConfig } from './useIsr';
export type {
  UseIsrCacheOptions,
  UseIsrCacheResult,
  UseRevalidateResult,
  UseIsrStatsResult,
  UseIsrEntryResult,
  UseIsrConfigResult,
} from './useIsr';

// ==================== V44.0 Track D: 页面级 BFF Hooks ====================

export { useBffListPage, useBffDetailPage, useBffFormPage } from './useBffPage';
export type {
  UseBffListPageOptions,
  UseBffListPageResult,
  UseBffDetailPageOptions,
  UseBffDetailPageResult,
  UseBffFormPageOptions,
  UseBffFormPageResult,
  FormFieldConfig,
  RelatedQueryConfig,
} from './useBffPage';

// ==================== V45.0 Track D: BFF 生产化（错误边界 + 降级 + A/B 测试） ====================

export { useBffError, useBffRetry, useBffFallback, useErrorReport } from './useBffErrorHandling';
export type {
  UseBffErrorResult,
  UseBffRetryOptions,
  UseBffRetryResult,
  UseBffFallbackResult,
  UseErrorReportResult,
} from './useBffErrorHandling';

export {
  useExperiment,
  useTrackConversion,
  useExperimentResult,
  useActiveExperiments,
  useExperimentAdmin,
} from './useABTest';
export type {
  UseExperimentOptions,
  UseExperimentResult,
  UseTrackConversionResult,
  UseExperimentResultResult,
  UseActiveExperimentsResult,
  CreateExperimentInput,
  UseExperimentAdminResult,
} from './useABTest';
