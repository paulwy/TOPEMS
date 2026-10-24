/**
 * BFF hooks 统一导出
 */
export { useBffCrud } from './useBffCrud';
export type { UseBffCrudOptions, UseBffCrudResult } from './useBffCrud';

export { useBffFormPage } from './useBffPage';
export type { UseBffFormPageOptions, UseBffFormPageResult, FormFieldConfig } from './useBffPage';

export { useAutoSharding } from './useAutoSharding';
export type { UseAutoShardingOptions, UseAutoShardingResult } from './useAutoSharding';

export { useBffPerformance } from './useBffPerformance';
export type { UseBffPerformanceResult, SlowQueryCallback } from './useBffPerformance';

export { useBffDashboard } from './useBffDashboard';
export type {
  UseBffDashboardOptions,
  UseBffDashboardResult,
  BffDashboardData,
} from './useBffDashboard';

export { useQueryCost } from './useQueryCost';
export type { UseQueryCostOptions, UseQueryCostResult, HighCostCallback } from './useQueryCost';

export { useSmartPrefetch } from './useSmartPrefetch';
export type { UseSmartPrefetchOptions, UseSmartPrefetchResult } from './useSmartPrefetch';

export { registerRouteShell, unregisterRouteShell } from './usePartialPreRender';
export type {
  ShellRenderer,
  RouteShellConfig,
  UsePartialPreRenderResult,
} from './usePartialPreRender';
