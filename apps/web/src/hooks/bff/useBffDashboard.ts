/**
 * V39.0 Track D: 仪表盘专用 BFF 聚合 hook
 *
 * 使用 getFederatedDashboard 一次 GraphQL 查询获取仪表盘所需的全部数据：
 * - dashboard.stats: 跨服务业务统计（erp/crm/hrm/finance/mes/workflow）
 * - dashboard.todos: 统一待办列表
 * - dashboard.services: 服务健康状态
 * - moduleStats: 扩展模块统计（qms/srm/lims/rd/ehs）
 * - federatedServices: 联邦服务注册表
 *
 * 自动每 5 分钟刷新，并集成 React Query 缓存。
 *
 * @example
 * ```tsx
 * const { data, loading, error, refresh } = useBffDashboard();
 *
 * if (loading) return <Skeleton />;
 * if (error) return <ErrorView message={error} />;
 *
 * return (
 *   <Dashboard
 *     stats={data.dashboard.stats}
 *     todos={data.dashboard.todos}
 *     services={data.dashboard.services}
 *     moduleStats={data.moduleStats}
 *     federatedServices={data.federatedServices}
 *   />
 * );
 * ```
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getFederatedDashboard } from '@/api/bff';
import type { ServiceStats, UnifiedTodo } from '@/api/bff';

/** 仪表盘聚合数据 */
export interface BffDashboardData {
  dashboard: {
    stats: {
      erp: ServiceStats;
      crm: ServiceStats;
      hrm: ServiceStats;
      finance: ServiceStats;
      mes: ServiceStats;
      workflow: ServiceStats;
    };
    todos: UnifiedTodo[];
    services: Array<{ service: string; healthy: boolean; url: string }>;
  };
  moduleStats: Array<{ service: string; total: number; available: boolean }>;
  federatedServices: Array<{
    service: string;
    url: string;
    available: boolean;
    entities: string[];
  }>;
}

/** useBffDashboard 配置项 */
export interface UseBffDashboardOptions {
  /** 自动刷新间隔（毫秒），默认 5 分钟；传 0 表示不自动刷新 */
  refetchInterval?: number;
  /** 缓存新鲜时间（毫秒），默认 5 分钟 */
  staleTime?: number;
  /** 是否启用查询，默认 true */
  enabled?: boolean;
}

/** useBffDashboard 返回值 */
export interface UseBffDashboardResult {
  /** 聚合数据 */
  data: BffDashboardData | undefined;
  /** 加载中（首次） */
  loading: boolean;
  /** 后台刷新中 */
  fetching: boolean;
  /** 错误信息 */
  error: string | null;
  /** 手动刷新 */
  refresh: () => void;
  /** 是否已加载过数据 */
  hasData: boolean;
}

/** 仪表盘查询 key */
export const BFF_DASHBOARD_QUERY_KEY = ['bff', 'dashboard', 'federated'] as const;

/**
 * 仪表盘专用 BFF 聚合 hook
 *
 * 一次 GraphQL 查询获取仪表盘全部数据，自动定时刷新。
 */
export function useBffDashboard(options?: UseBffDashboardOptions): UseBffDashboardResult {
  const {
    refetchInterval = 5 * 60 * 1000,
    staleTime = 5 * 60 * 1000,
    enabled = true,
  } = options ?? {};

  const queryClient = useQueryClient();

  const query = useQuery<BffDashboardData, Error>({
    queryKey: BFF_DASHBOARD_QUERY_KEY,
    queryFn: () => getFederatedDashboard() as Promise<BffDashboardData>,
    enabled,
    staleTime,
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: BFF_DASHBOARD_QUERY_KEY });
  }, [queryClient]);

  return {
    data: query.data,
    loading: query.isLoading,
    fetching: query.isFetching && !query.isLoading,
    error: query.error?.message ?? null,
    refresh,
    hasData: !!query.data,
  };
}

export default useBffDashboard;
