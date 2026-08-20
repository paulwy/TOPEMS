/**
 * V41.0 Track D: 自动分片 Hook
 *
 * 功能:
 * - 自动检测是否需要分片
 * - 透明执行分片查询
 * - 合并结果返回
 * - 进度报告
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  shouldShard,
  shardQuery,
  executeShardedQuery,
  mergePaginatedResults,
  mergeArrayResults,
  type ShardPlan,
  type ShardOptions,
  type ShardStrategy,
  type ShardExecuteResult,
} from '@/utils/query-sharding';
import i18n from '@/i18n';
import { bffGraphQL } from '@/api/bff';
import { logger } from '@/utils/logger';

const autoShardLogger = logger.child({ prefix: 'AutoSharding' });

interface UseAutoShardingOptions extends ShardOptions {
  enabled?: boolean;
  autoDetect?: boolean;
  mergeStrategy?: 'paginated' | 'array' | 'custom';
  customMerge?: (results: unknown[]) => unknown;
}

interface UseAutoShardingResult<T = unknown> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  progress: number;
  shardCount: number;
  shardPlan: ShardPlan | null;
  strategy: ShardStrategy | null;
  needsSharding: boolean;
  refetch: (newVariables?: Record<string, unknown>) => Promise<void>;
  executeSharded: (
    customQuery?: string,
    customVariables?: Record<string, unknown>
  ) => Promise<T | null>;
}

export function useAutoSharding<T = unknown>(
  query: string,
  baseVariables: Record<string, unknown> = {},
  options: UseAutoShardingOptions = {}
): UseAutoShardingResult<T> {
  const {
    enabled = true,
    autoDetect = true,
    mergeStrategy = 'paginated',
    customMerge,
    maxConcurrency,
    retryAttempts,
    maxRecordsPerShard,
    preferredStrategy,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [shardCount, setShardCount] = useState(0);
  const [shardPlan, setShardPlan] = useState<ShardPlan | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const variablesRef = useRef(baseVariables);

  const shardCheck = useMemo(() => {
    if (!autoDetect || !enabled) {
      return {
        shouldShard: false,
        reason: i18n.t('shared.use_auto_sharding.k0'),
        estimatedRecords: 0,
        score: 0,
      };
    }
    return shouldShard(query, baseVariables, { maxRecordsPerShard });
  }, [query, baseVariables, autoDetect, enabled, maxRecordsPerShard]);

  const needsSharding = shardCheck.shouldShard;
  const strategy = shardPlan?.strategy || null;

  const mergeResults = useCallback(
    (results: unknown[]): T | null => {
      if (results.length === 0) return null;

      switch (mergeStrategy) {
        case 'paginated':
          return mergePaginatedResults(
            results as Array<{ items: unknown[]; total?: number }>
          ) as unknown as T;

        case 'array':
          return mergeArrayResults(results as unknown[][]) as unknown as T;

        case 'custom':
          if (customMerge) {
            return customMerge(results) as T;
          }
          return results[0] as T;

        default:
          return results[0] as T;
      }
    },
    [mergeStrategy, customMerge]
  );

  const handleProgress = useCallback((p: number, completed: number, total: number) => {
    setProgress(p);
    autoShardLogger.debug(
      `${i18n.t('shared.use_auto_sharding.k0')}${completed}/${total} (${p.toFixed(1)}%)`
    );
  }, []);

  const executeSharded = useCallback(
    async (customQuery?: string, customVariables?: Record<string, unknown>): Promise<T | null> => {
      const targetQuery = customQuery || query;
      const targetVariables = customVariables || baseVariables;

      if (!enabled) {
        try {
          setIsLoading(true);
          setIsError(false);
          setError(null);
          setProgress(0);

          const result = await bffGraphQL<T>(targetQuery, targetVariables);
          setData(result);
          setIsLoading(false);
          return result;
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          setIsError(true);
          setIsLoading(false);
          return null;
        }
      }

      setIsLoading(true);
      setIsError(false);
      setError(null);
      setProgress(0);

      try {
        const plan = shardQuery(targetQuery, targetVariables, {
          maxRecordsPerShard,
          preferredStrategy,
        });

        setShardPlan(plan);
        setShardCount(plan.shards.length);

        autoShardLogger.info(
          `${i18n.t('shared.use_auto_sharding.k1')}${plan.shards.length}${i18n.t('shared.use_auto_sharding.k2')}${plan.strategy}`
        );

        const executeFn = async (vars: Record<string, unknown>) => {
          return bffGraphQL<T>(targetQuery, vars);
        };

        const result: ShardExecuteResult<T> = await executeShardedQuery(executeFn, plan, {
          maxConcurrency,
          retryAttempts,
          onProgress: handleProgress,
        });

        if (result.errors.length > 0 && result.data.length === 0) {
          throw new Error(
            `${i18n.t('shared.use_auto_sharding.k3')}${result.errors.map((e) => e.error.message).join(', ')}`
          );
        }

        const merged = mergeResults(result.data);
        setData(merged);

        if (result.errors.length > 0) {
          autoShardLogger.warn(
            `${i18n.t('shared.use_auto_sharding.k4')}${result.errors.length}/${result.totalCount}`
          );
        }

        return merged;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setIsError(true);
        autoShardLogger.error(`${i18n.t('shared.use_auto_sharding.k5')}${e.message}`);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      query,
      baseVariables,
      enabled,
      maxRecordsPerShard,
      preferredStrategy,
      maxConcurrency,
      retryAttempts,
      handleProgress,
      mergeResults,
    ]
  );

  const refetch = useCallback(
    async (newVariables?: Record<string, unknown>) => {
      if (newVariables) {
        variablesRef.current = newVariables;
      }
      await executeSharded(undefined, newVariables);
    },
    [executeSharded]
  );

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const execute = async () => {
      if (!mounted) return;
      await executeSharded();
    };

    execute();

    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, executeSharded]);

  return {
    data,
    isLoading,
    isError,
    error,
    progress,
    shardCount,
    shardPlan,
    strategy,
    needsSharding,
    refetch,
    executeSharded,
  };
}

export default useAutoSharding;
