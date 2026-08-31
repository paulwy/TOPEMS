/**
 * BFF hooks 统一导出
 */
export { useBffCrud } from './useBffCrud';
export type { UseBffCrudOptions, UseBffCrudResult } from './useBffCrud';

export { useBffListPage, useBffDetailPage, useBffFormPage } from './useBffPage';
export type {
  UseBffListPageOptions,
  UseBffListPageResult,
  UseBffDetailPageOptions,
  UseBffDetailPageResult,
  UseBffFormPageOptions,
  UseBffFormPageResult,
} from './useBffPage';

export { useAutoSharding } from './useAutoSharding';
export type { UseAutoShardingOptions, UseAutoShardingResult } from './useAutoSharding';

export { useBffPerformance } from './useBffPerformance';
export type { UseBffPerformanceResult, SlowQueryCallback } from './useBffPerformance';

export { useBffDashboard } from './useBffDashboard';
export type { UseBffDashboardOptions, UseBffDashboardResult, BffDashboardData } from './useBffDashboard';

export { useBffError, useBffRetry } from './useBffErrorHandling';
export type { UseBffErrorResult, UseBffRetryOptions, UseBffRetryResult } from './useBffErrorHandling';

export { useBffSubscription } from './useBffSubscription';
export type { UseBffSubscriptionOptions, UseBffSubscriptionResult, SubscriptionStatus } from './useBffSubscription';

export { useEdgeCompute, useEdgeCache } from './useEdgeCompute';
export type { UseEdgeComputeOptions, UseEdgeComputeResult, UseEdgeCacheOptions, UseEdgeCacheResult } from './useEdgeCompute';

export { useQueryCost } from './useQueryCost';
export type { UseQueryCostOptions, UseQueryCostResult, HighCostCallback } from './useQueryCost';

export { useSlowQueryAlert } from './useSlowQueryAlert';
export type { SlowQueryAlertOptions, UseSlowQueryAlertResult, AlertLevel } from './useSlowQueryAlert';

export { useSmartPrefetch } from './useSmartPrefetch';
export type { UseSmartPrefetchOptions, UseSmartPrefetchResult } from './useSmartPrefetch';

export { useExperiment, useTrackConversion } from './useABTest';
export type { UseExperimentOptions, UseExperimentResult, UseTrackConversionResult } from './useABTest';

export { useIsrCache, useRevalidate } from './useIsr';
export type { UseIsrCacheOptions, UseIsrCacheResult, UseRevalidateResult } from './useIsr';

export { useBffSuspenseQuery, useBffSuspenseInfinite } from './useBffSuspense';
export type { UseBffSuspenseQueryOptions, UseBffSuspenseQueryResult, BffInfiniteCursor, UseBffSuspenseInfiniteOptions } from './useBffSuspense';

export { registerRouteShell, unregisterRouteShell } from './usePartialPreRender';
export type { ShellRenderer, RouteShellConfig, UsePartialPreRenderResult } from './usePartialPreRender';

export { DeferredData, createDeferred } from './useRouteDataLoader';
export type { RouteParams, RouteLoaderConfig, RouteDeferredLoaderConfig } from './useRouteDataLoader';
