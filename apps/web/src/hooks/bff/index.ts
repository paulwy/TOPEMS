/**
 * BFF Hooks 入口
 *
 * 统一导出实际被使用的 BFF hooks：
 * - useBffCrud: 通用 CRUD（list/get/create/update/delete）
 * - useBffDashboard: 仪表盘聚合查询
 * - useBffPerformance: GraphQL 查询性能监控
 * - useAutoSharding: 自动分片查询
 * - useBffPage (useBffListPage): 列表页完整逻辑（搜索/过滤/分页/批量操作）
 * - useBffSuspense: BffErrorFallback / BffLoadingFallback / Suspense 边界组件 + 统计
 * - usePartialPreRender: 部分预渲染（PPR）统计
 * - useABTest: A/B 实验（useExperimentResult / useActiveExperiments / useExperimentAdmin）
 */

export { useBffCrud } from './useBffCrud';
export type { UseBffCrudOptions, UseBffCrudResult } from './useBffCrud';

export type { SubscriptionStatus } from './useBffSubscription';

export { useBffDashboard } from './useBffDashboard';
export type {
  UseBffDashboardOptions,
  UseBffDashboardResult,
  BffDashboardData,
} from './useBffDashboard';

export { useBffPerformance } from './useBffPerformance';

export { useAutoSharding } from './useAutoSharding';

export {
  usePrefetchBffSuspenseQuery,
  BffErrorFallback,
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

export { usePartialPreRender, getPPRStats, onPPRStatsChange } from './usePartialPreRender';
export type {
  RouteShellConfig,
  ShellRenderer,
  UsePartialPreRenderResult,
  StreamingSlotProps,
  StaticShellProps,
  PPRSlotRecord,
} from './usePartialPreRender';

export { useBffListPage } from './useBffPage';
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

export { useExperimentResult, useActiveExperiments, useExperimentAdmin } from './useABTest';
export type {
  UseExperimentOptions,
  UseExperimentResult,
  UseTrackConversionResult,
  UseExperimentResultResult,
  UseActiveExperimentsResult,
  CreateExperimentInput,
  UseExperimentAdminResult,
} from './useABTest';
