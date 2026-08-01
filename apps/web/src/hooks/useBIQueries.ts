/**
 * BI 数据查询 hooks（基于 React Query）
 *
 * 替代原 zustand 版 `biStore.ts`，将服务端数据缓存交给 React Query 管理：
 * - 自动缓存（staleTime 默认 5 分钟）
 * - 自动重试失败请求
 * - 并行获取多个分析维度（useBIAllAnalytics）
 * - 加载/错误状态由 RQ 内置 isLoading / isError 提供
 *
 * 与原 biStore 的对应关系：
 *   useBIStore().summary        → useBISummary()
 *   useBIStore().development    → useBIDevelopment()
 *   useBIStore().quality        → useBIQuality()
 *   useBIStore().production     → useBIProduction()
 *   useBIStore().laboratory     → useBILaboratory()
 *   useBIStore().loading        → useBILoading()
 *   useBIStore().error          → useBIError()
 *   useBIStore().loadAllData()  → useBIAllAnalytics() / useBIRefresh()
 *   useBIStore().refreshData()  → useBIRefresh()
 *   useBIStore().clearError()   → useBIClearError()
 *
 * @example
 * ```tsx
 * function BIDashboard() {
 *   const { data: summary, isLoading } = useBISummary();
 *   const { data: development } = useBIDevelopment();
 *   const refresh = useBIRefresh();
 *
 *   if (isLoading) return <Spinner />;
 *   return <Dashboard data={summary} onRefresh={refresh} />;
 * }
 * ```
 */
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import {
  fetchSummaryDashboard,
  fetchDevelopmentAnalytics,
  fetchQualityAnalytics,
  fetchProductionAnalytics,
  fetchLaboratoryAnalytics,
  fetchRsProjectTimeline,
  fetchRsExperimentSuccessRate,
  fetchQmsQualityTrend,
  fetchPdmProductionTrend,
} from '@/api/bi';
import type {
  SummaryDashboard,
  DevelopmentAnalytics,
  QualityAnalytics,
  ProductionAnalytics,
  LaboratoryAnalytics,
} from '@/api/bi';

// ============ Query Keys ============

export const BI_QUERY_KEYS = {
  all: ['bi'] as const,
  analytics: ['bi', 'analytics'] as const,
  summary: ['bi', 'analytics', 'summary'] as const,
  development: ['bi', 'analytics', 'development'] as const,
  quality: ['bi', 'analytics', 'quality'] as const,
  production: ['bi', 'analytics', 'production'] as const,
  laboratory: ['bi', 'analytics', 'laboratory'] as const,
  rsTimeline: ['bi', 'analytics', 'rs-timeline'] as const,
  rsSuccessRate: ['bi', 'analytics', 'rs-success-rate'] as const,
  qmsTrend: ['bi', 'analytics', 'qms-trend'] as const,
  pdmTrend: ['bi', 'analytics', 'pdm-trend'] as const,
} as const;

// ============ 内部辅助：从标准响应中提取 data ============

interface StandardResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

function extractData<T>(response: StandardResponse<T> | T | undefined): T | null {
  if (!response) return null;
  // 兼容 { success, data } 包裹格式与裸数据格式
  const wrapped = response as StandardResponse<T>;
  if (typeof wrapped === 'object' && wrapped !== null && 'success' in wrapped) {
    return wrapped.success ? (wrapped.data ?? null) : null;
  }
  return response as T;
}

// ============ 单维度查询 hooks ============

/**
 * 获取 BI 汇总看板数据
 */
export function useBISummary(): UseQueryResult<SummaryDashboard | null> {
  return useQuery<SummaryDashboard | null>({
    queryKey: BI_QUERY_KEYS.summary,
    queryFn: async () => extractData<SummaryDashboard>(await fetchSummaryDashboard()),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取研发分析数据
 */
export function useBIDevelopment(): UseQueryResult<DevelopmentAnalytics | null> {
  return useQuery<DevelopmentAnalytics | null>({
    queryKey: BI_QUERY_KEYS.development,
    queryFn: async () => extractData<DevelopmentAnalytics>(await fetchDevelopmentAnalytics()),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取质量分析数据
 */
export function useBIQuality(): UseQueryResult<QualityAnalytics | null> {
  return useQuery<QualityAnalytics | null>({
    queryKey: BI_QUERY_KEYS.quality,
    queryFn: async () => extractData<QualityAnalytics>(await fetchQualityAnalytics()),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取生产分析数据
 */
export function useBIProduction(): UseQueryResult<ProductionAnalytics | null> {
  return useQuery<ProductionAnalytics | null>({
    queryKey: BI_QUERY_KEYS.production,
    queryFn: async () => extractData<ProductionAnalytics>(await fetchProductionAnalytics()),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取实验室分析数据
 */
export function useBILaboratory(): UseQueryResult<LaboratoryAnalytics | null> {
  return useQuery<LaboratoryAnalytics | null>({
    queryKey: BI_QUERY_KEYS.laboratory,
    queryFn: async () => extractData<LaboratoryAnalytics>(await fetchLaboratoryAnalytics()),
    staleTime: 5 * 60 * 1000,
  });
}

// ============ 聚合查询 hooks ============

export interface UseBIAllAnalyticsResult {
  summary: SummaryDashboard | null;
  development: DevelopmentAnalytics | null;
  quality: QualityAnalytics | null;
  production: ProductionAnalytics | null;
  laboratory: LaboratoryAnalytics | null;
  rsTimeline: unknown;
  rsSuccessRate: unknown;
  qmsTrend: unknown;
  pdmTrend: unknown;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

/**
 * 一次性并行获取所有 BI 分析维度。
 *
 * 替代原 biStore.loadAllData()：用 React Query 的并行 useQuery 自动管理
 * 加载/错误/缓存状态，无需手动 Promise.all + set state。
 *
 * @param options.enabled 是否启用查询（默认 true）
 */
export function useBIAllAnalytics(options: { enabled?: boolean } = {}): UseBIAllAnalyticsResult {
  const { enabled = true } = options;

  const summaryQuery = useBISummary();
  const developmentQuery = useBIDevelopment();
  const qualityQuery = useBIQuality();
  const productionQuery = useBIProduction();
  const laboratoryQuery = useBILaboratory();

  const rsTimelineQuery = useQuery({
    queryKey: BI_QUERY_KEYS.rsTimeline,
    queryFn: async () => {
      const res = await fetchRsProjectTimeline();
      return extractData<unknown>(res as unknown as StandardResponse<unknown>);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const rsSuccessRateQuery = useQuery({
    queryKey: BI_QUERY_KEYS.rsSuccessRate,
    queryFn: async () => {
      const res = await fetchRsExperimentSuccessRate();
      return extractData<unknown>(res as unknown as StandardResponse<unknown>);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const qmsTrendQuery = useQuery({
    queryKey: BI_QUERY_KEYS.qmsTrend,
    queryFn: async () => {
      const res = await fetchQmsQualityTrend();
      return extractData<unknown>(res as unknown as StandardResponse<unknown>);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const pdmTrendQuery = useQuery({
    queryKey: BI_QUERY_KEYS.pdmTrend,
    queryFn: async () => {
      const res = await fetchPdmProductionTrend();
      return extractData<unknown>(res as unknown as StandardResponse<unknown>);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const queries = [
    summaryQuery,
    developmentQuery,
    qualityQuery,
    productionQuery,
    laboratoryQuery,
    rsTimelineQuery,
    rsSuccessRateQuery,
    qmsTrendQuery,
    pdmTrendQuery,
  ];

  const loading = queries.some((q) => q.isLoading);
  const refreshing = queries.some((q) => q.isFetching && !q.isLoading);
  const error = queries.reduce<string | null>((acc, q) => {
    if (acc) return acc;
    const qError = q.error as Error | null;
    return qError?.message ?? null;
  }, null);

  // 取所有查询中最新的 dataUpdatedAt 作为 lastUpdated
  const lastUpdated = useMemo(() => {
    const latest = Math.max(0, ...queries.map((q) => q.dataUpdatedAt));
    return latest > 0 ? new Date(latest) : null;
  }, [queries.map((q) => q.dataUpdatedAt).join('|')]);

  const refetch = useCallback(async () => {
    await Promise.all(queries.map((q) => q.refetch()));
  }, []);

  return {
    summary: summaryQuery.data ?? null,
    development: developmentQuery.data ?? null,
    quality: qualityQuery.data ?? null,
    production: productionQuery.data ?? null,
    laboratory: laboratoryQuery.data ?? null,
    rsTimeline: rsTimelineQuery.data ?? null,
    rsSuccessRate: rsSuccessRateQuery.data ?? null,
    qmsTrend: qmsTrendQuery.data ?? null,
    pdmTrend: pdmTrendQuery.data ?? null,
    loading,
    refreshing,
    error,
    lastUpdated,
    refetch,
  };
}

// ============ 状态与操作 hooks ============

/**
 * 聚合所有 BI 查询的加载状态。
 *
 * 替代原 `useBILoading()`：只要任一 BI 查询在加载中就返回 true。
 */
export function useBILoading(): boolean {
  const summary = useBISummary();
  const development = useBIDevelopment();
  const quality = useBIQuality();
  const production = useBIProduction();
  const laboratory = useBILaboratory();
  return (
    summary.isLoading ||
    development.isLoading ||
    quality.isLoading ||
    production.isLoading ||
    laboratory.isLoading
  );
}

/**
 * 聚合所有 BI 查询的错误状态。
 *
 * 替代原 `useBIError()`：返回第一个出错的查询的错误信息。
 */
export function useBIError(): string | null {
  const summary = useBISummary();
  const development = useBIDevelopment();
  const quality = useBIQuality();
  const production = useBIProduction();
  const laboratory = useBILaboratory();
  const queries = [summary, development, quality, production, laboratory];
  for (const q of queries) {
    const qError = q.error as Error | null;
    if (qError?.message) return qError.message;
  }
  return null;
}

/**
 * 刷新所有 BI 数据。
 *
 * 替代原 `useBIStore().refreshData()`：返回一个调用函数，
 * 内部对全部 BI query 执行 refetch。
 */
export function useBIRefresh(): () => Promise<void> {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: BI_QUERY_KEYS.analytics });
  }, [queryClient]);
}

/**
 * 清空所有 BI 查询的错误状态。
 *
 * 替代原 `useBIStore().clearError()`：React Query 的错误状态无法直接清除，
 * 这里通过 invalidate 触发重新查询以清除错误。
 */
export function useBIClearError(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.resetQueries({ queryKey: BI_QUERY_KEYS.analytics });
  }, [queryClient]);
}

// ============ 手动触发加载（用于按需加载场景） ============

/**
 * 手动触发 BI 全量数据加载（mutation 风格）。
 *
 * 适用于不希望组件挂载即自动加载、而是在用户操作时才触发的场景。
 * 内部通过 invalidateQueries 触发已注册的 useQuery 重新获取。
 */
export function useBILoadAllData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await queryClient.refetchQueries({ queryKey: BI_QUERY_KEYS.analytics });
      return null;
    },
  });
}

export default {
  useBISummary,
  useBIDevelopment,
  useBIQuality,
  useBIProduction,
  useBILaboratory,
  useBIAllAnalytics,
  useBILoading,
  useBIError,
  useBIRefresh,
  useBIClearError,
  useBILoadAllData,
  BI_QUERY_KEYS,
};
