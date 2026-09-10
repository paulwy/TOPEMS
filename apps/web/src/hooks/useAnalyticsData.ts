/**
 * 通用分析数据 Hook
 * 用于加载分析/仪表盘页面的聚合数据
 */

import { useState, useEffect, useCallback } from 'react';

interface UseAnalyticsDataOptions<TData> {
  /** 数据加载函数，返回 ApiResponse 包装的数据 */
  fetcher: () => Promise<{ data: TData } | TData>;
  /** 是否立即加载 */
  immediate?: boolean;
  /** 依赖项，变化时重新加载 */
  deps?: unknown[];
}

interface UseAnalyticsDataResult<TData> {
  data: TData | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * 通用分析数据 Hook
 *
 * @example
 * const { data, loading, error, reload } = useAnalyticsData({
 *   fetcher: () => wmsAnalyticsApi.getInventoryTurnover(params),
 *   deps: [startDate, endDate, groupBy],
 * });
 */
export function useAnalyticsData<TData>({
  fetcher,
  immediate = true,
  deps = [],
}: UseAnalyticsDataOptions<TData>): UseAnalyticsDataResult<TData> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      // 处理 ApiResponse 包装: { code, message, data }
      const response = result as { data?: TData; code?: number; message?: string };
      if (response && typeof response === 'object' && 'data' in response) {
        setData(response.data as TData);
      } else {
        setData(result as TData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '加载失败';
      setError(message);
      console.error('Analytics data load error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: load };
}

/**
 * 分析页面通用状态
 */
export interface AnalyticsPageState {
  startDate: string;
  endDate: string;
  groupBy: 'month' | 'week' | 'day';
  warehouseId?: string;
}

/**
 * 默认日期范围（最近 90 天）
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}
