/**
 * V40.0 Track D: BFF GraphQL 性能监控 Hook
 *
 * 功能:
 * - 记录每个查询的耗时
 * - 记录成功/失败状态
 * - 计算缓存命中率（配合 APQ）
 * - 慢查询检测（可配置阈值，默认 1000ms）
 * - 慢查询告警回调
 */

import { useCallback, useEffect, useState } from 'react';
import {
  type QueryPerformanceRecord,
  type QueryPerformanceStats,
  calculateStats,
  parseQueryName,
  queryHash,
} from '@/utils/graphql-performance';
import i18n from '@/i18n';
import { onBffPerformance } from '@/api/bff';
import { logger } from '@/utils/logger';

let autoRegistered = false;

const perfLogger = logger.child({ prefix: 'BFF-Perf' });

/** 默认慢查询阈值（毫秒） */
const DEFAULT_SLOW_QUERY_THRESHOLD = 1000;

/** 最大保留的历史记录数 */
const MAX_HISTORY_RECORDS = 1000;

/** 每个查询最大保留的记录数 */
const MAX_RECORDS_PER_QUERY = 200;

/** 慢查询回调类型 */
type SlowQueryCallback = (record: QueryPerformanceRecord, threshold: number) => void;

/** useBffPerformance 返回值 */
interface UseBffPerformanceResult {
  /** 所有查询的性能统计（按平均耗时排序） */
  stats: QueryPerformanceStats[];
  /** 最近的查询记录 */
  recentRecords: QueryPerformanceRecord[];
  /** 慢查询列表 */
  slowQueries: QueryPerformanceRecord[];
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 设置慢查询阈值 */
  setSlowQueryThreshold: (threshold: number) => void;
  /** 总查询数 */
  totalQueries: number;
  /** 总成功数 */
  totalSuccess: number;
  /** 总失败数 */
  totalErrors: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 记录查询性能 */
  recordQueryPerformance: (
    query: string,
    duration: number,
    success: boolean,
    cached?: boolean,
    variables?: Record<string, unknown>,
    error?: string
  ) => Promise<void>;
  /** 获取慢查询列表 */
  getSlowQueries: (threshold?: number) => QueryPerformanceRecord[];
  /** 获取指定查询的性能统计 */
  getQueryPerformance: (queryName: string) => QueryPerformanceStats | null;
  /** 注册慢查询回调 */
  onSlowQuery: (callback: SlowQueryCallback) => () => void;
  /** 清除所有性能统计 */
  clearPerformanceStats: () => void;
}

/** 全局状态 - 用于在多个 hook 实例间共享数据 */
const globalState = {
  recordsByQuery: new Map<string, QueryPerformanceRecord[]>(),
  recentRecords: [] as QueryPerformanceRecord[],
  slowQueryCallbacks: new Set<SlowQueryCallback>(),
  slowQueryThreshold: DEFAULT_SLOW_QUERY_THRESHOLD,
  listeners: new Set<() => void>(),
};

function notifyListeners() {
  globalState.listeners.forEach((listener) => listener());
}

/**
 * 自动注册到 BFF 性能监控回调
 * 确保只注册一次
 */
function ensureAutoRegistered(): void {
  if (autoRegistered) return;
  autoRegistered = true;

  onBffPerformance((query, duration, success, cached, variables, error) => {
    const operationName = parseQueryName(query);
    queryHash(query).then((hash) => {
      const record: QueryPerformanceRecord = {
        operationName,
        queryHash: hash,
        duration,
        success,
        cached,
        timestamp: Date.now(),
        variables,
        error,
      };

      const existing = globalState.recordsByQuery.get(operationName) || [];
      existing.push(record);
      if (existing.length > MAX_RECORDS_PER_QUERY) {
        existing.shift();
      }
      globalState.recordsByQuery.set(operationName, existing);

      globalState.recentRecords.unshift(record);
      if (globalState.recentRecords.length > MAX_HISTORY_RECORDS) {
        globalState.recentRecords.pop();
      }

      if (duration >= globalState.slowQueryThreshold) {
        perfLogger.warn(
          `${i18n.t('shared.use_bff_performance.k0')}${operationName} - ${duration.toFixed(0)}${i18n.t('shared.use_bff_performance.ms_1')}${globalState.slowQueryThreshold}ms)`
        );
        globalState.slowQueryCallbacks.forEach((cb) => {
          try {
            cb(record, globalState.slowQueryThreshold);
          } catch (e) {
            perfLogger.error(i18n.t('shared.use_bff_performance.k2'), e);
          }
        });
      }

      notifyListeners();
    });
  });
}

/**
 * BFF GraphQL 性能监控 Hook
 *
 * @example
 * ```tsx
 * const { stats, slowQueries, recordQueryPerformance, onSlowQuery } = useBffPerformance();
 *
 * // 注册慢查询告警
 * useEffect(() => {
 *   const off = onSlowQuery((record, threshold) => {
 *     console.warn(`慢查询: ${record.operationName} (${record.duration}ms > ${threshold}ms)`);
 *   });
 *   return off;
 * }, [onSlowQuery]);
 * ```
 */
export function useBffPerformance(): UseBffPerformanceResult {
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    ensureAutoRegistered();
    globalState.listeners.add(forceUpdate);
    return () => {
      globalState.listeners.delete(forceUpdate);
    };
  }, [forceUpdate]);

  const setSlowQueryThreshold = useCallback((threshold: number) => {
    globalState.slowQueryThreshold = threshold;
    notifyListeners();
  }, []);

  const recordQueryPerformance = useCallback(
    async (
      query: string,
      duration: number,
      success: boolean,
      cached = false,
      variables?: Record<string, unknown>,
      error?: string
    ) => {
      const operationName = parseQueryName(query);
      const hash = await queryHash(query);

      const record: QueryPerformanceRecord = {
        operationName,
        queryHash: hash,
        duration,
        success,
        cached,
        timestamp: Date.now(),
        variables,
        error,
      };

      const existing = globalState.recordsByQuery.get(operationName) || [];
      existing.push(record);
      if (existing.length > MAX_RECORDS_PER_QUERY) {
        existing.shift();
      }
      globalState.recordsByQuery.set(operationName, existing);

      globalState.recentRecords.unshift(record);
      if (globalState.recentRecords.length > MAX_HISTORY_RECORDS) {
        globalState.recentRecords.pop();
      }

      if (duration >= globalState.slowQueryThreshold) {
        perfLogger.warn(
          `${i18n.t('shared.use_bff_performance.k3')}${operationName} - ${duration.toFixed(0)}${i18n.t('shared.use_bff_performance.ms_4')}${globalState.slowQueryThreshold}ms)`
        );
        globalState.slowQueryCallbacks.forEach((cb) => {
          try {
            cb(record, globalState.slowQueryThreshold);
          } catch (e) {
            perfLogger.error(i18n.t('shared.use_bff_performance.k5'), e);
          }
        });
      }

      notifyListeners();
    },
    []
  );

  const getSlowQueries = useCallback((threshold?: number): QueryPerformanceRecord[] => {
    const t = threshold ?? globalState.slowQueryThreshold;
    return globalState.recentRecords.filter((r) => r.duration >= t);
  }, []);

  const getQueryPerformance = useCallback((queryName: string): QueryPerformanceStats | null => {
    const records = globalState.recordsByQuery.get(queryName);
    if (!records || records.length === 0) return null;
    return calculateStats(queryName, records);
  }, []);

  const onSlowQuery = useCallback((callback: SlowQueryCallback): (() => void) => {
    globalState.slowQueryCallbacks.add(callback);
    return () => {
      globalState.slowQueryCallbacks.delete(callback);
    };
  }, []);

  const clearPerformanceStats = useCallback(() => {
    globalState.recordsByQuery.clear();
    globalState.recentRecords = [];
    notifyListeners();
  }, []);

  const allStats: QueryPerformanceStats[] = Array.from(globalState.recordsByQuery.entries())
    .map(([name, records]) => calculateStats(name, records))
    .sort((a, b) => b.avgDuration - a.avgDuration);

  const totalQueries = globalState.recentRecords.length;
  const totalSuccess = globalState.recentRecords.filter((r) => r.success).length;
  const totalErrors = totalQueries - totalSuccess;
  const cacheHits = globalState.recentRecords.filter((r) => r.cached).length;
  const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

  return {
    stats: allStats,
    recentRecords: [...globalState.recentRecords],
    slowQueries: getSlowQueries(),
    slowQueryThreshold: globalState.slowQueryThreshold,
    setSlowQueryThreshold,
    totalQueries,
    totalSuccess,
    totalErrors,
    cacheHitRate,
    recordQueryPerformance,
    getSlowQueries,
    getQueryPerformance,
    onSlowQuery,
    clearPerformanceStats,
  };
}

export default useBffPerformance;
