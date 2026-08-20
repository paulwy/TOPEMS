/**
 * V41.0 Track D: 智能预加载 Hook
 *
 * 功能:
 * - 自动记录页面访问
 * - 自动预测下一页并预加载数据
 * - 预加载结果存入 React Query 缓存
 * - 可配置预加载策略
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getPrefetchEngine,
  type PrefetchEngine,
  type Prediction,
  type PrefetchTask,
  type PrefetchStrategy,
  type RouteVisit,
} from '@/utils/smart-prefetch';
import i18n from '@/i18n';
import { bffGraphQL } from '@/api/bff';
import { parseQueryName } from '@/utils/graphql-performance';
import { logger } from '@/utils/logger';

const prefetchHookLogger = logger.child({ prefix: 'UseSmartPrefetch' });

interface UseSmartPrefetchOptions {
  enabled?: boolean;
  strategies?: PrefetchStrategy[];
  minConfidence?: number;
  maxPrefetchCount?: number;
  prefetchOnIdle?: boolean;
  customPrefetch?: (query: string, variables?: Record<string, unknown>) => Promise<void>;
}

interface UseSmartPrefetchResult {
  predictions: Prediction[];
  prefetchQueue: PrefetchTask[];
  isEnabled: boolean;
  visitHistory: RouteVisit[];
  prefetchForRoute: (route: string) => Promise<void>;
  togglePrefetch: (enabled: boolean) => void;
  clearHistory: () => void;
  setStrategies: (strategies: PrefetchStrategy[]) => void;
  registerRouteQueries: (
    route: string,
    queries: Array<{ query: string; variables?: Record<string, unknown>; queryKey?: unknown[] }>
  ) => void;
  recordVisit: (route: string, duration?: number) => void;
}

const routeQueryKeys = new Map<string, unknown[][]>();

export function useSmartPrefetch(
  currentRoute?: string,
  options: UseSmartPrefetchOptions = {}
): UseSmartPrefetchResult {
  const {
    enabled: initialEnabled = true,
    strategies,
    minConfidence = 0.2,
    maxPrefetchCount = 3,
    prefetchOnIdle = true,
    customPrefetch,
  } = options;

  const queryClient = useQueryClient();
  const engineRef = useRef<PrefetchEngine>(getPrefetchEngine());
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [prefetchQueue, setPrefetchQueue] = useState<PrefetchTask[]>([]);
  const [visitHistory, setVisitHistory] = useState<RouteVisit[]>([]);
  const isPrefetchingRef = useRef(false);
  const lastRouteRef = useRef<string | null>(null);

  const engine = engineRef.current;

  useEffect(() => {
    if (strategies) {
      engine.setStrategies(strategies);
    }
  }, [engine, strategies]);

  const updateState = useCallback(() => {
    setPredictions(engine.predictNextRoutes(lastRouteRef.current || ''));
    setPrefetchQueue(engine.getPrefetchQueue());
    setVisitHistory(engine.getVisitHistory());
  }, [engine]);

  const prefetchQuery = useCallback(
    async (query: string, variables?: Record<string, unknown>, queryKey?: unknown[]) => {
      const operationName = parseQueryName(query);
      const key = queryKey || ['bff', 'prefetch', operationName, variables];

      try {
        const cached = queryClient.getQueryData(key);
        if (cached) {
          prefetchHookLogger.debug(`${i18n.t('shared.use_smart_prefetch.k0')}${operationName}`);
          return;
        }

        if (customPrefetch) {
          await customPrefetch(query, variables);
        } else {
          await queryClient.prefetchQuery({
            queryKey: key,
            queryFn: () => bffGraphQL(query, variables),
            staleTime: 5 * 60 * 1000,
          });
        }

        prefetchHookLogger.info(`${i18n.t('shared.use_smart_prefetch.k1')}${operationName}`);
      } catch (error) {
        prefetchHookLogger.warn(
          `${i18n.t('shared.use_smart_prefetch.k2')}${operationName} - ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    [queryClient, customPrefetch]
  );

  const executePrefetchQueue = useCallback(async () => {
    if (isPrefetchingRef.current || !isEnabled) return;

    const queue = engine.getPrefetchQueue();
    const pendingTasks = queue.filter((t) => t.status === 'pending');

    if (pendingTasks.length === 0) return;

    isPrefetchingRef.current = true;

    const toPrefetch = pendingTasks.slice(0, maxPrefetchCount);

    for (const task of toPrefetch) {
      engine.updateTaskStatus(task.query, 'loading');
      updateState();

      const queryKeys = task.route ? routeQueryKeys.get(task.route) || [] : [];
      const queryKey = queryKeys[0] || undefined;

      try {
        await prefetchQuery(task.query, task.variables, queryKey);
        engine.updateTaskStatus(task.query, 'done');
      } catch {
        engine.updateTaskStatus(task.query, 'error');
      }

      updateState();
    }

    engine.clearCompletedTasks();
    updateState();

    isPrefetchingRef.current = false;
  }, [engine, isEnabled, maxPrefetchCount, prefetchQuery, updateState]);

  const prefetchForRoute = useCallback(
    async (route: string) => {
      if (!isEnabled) return;

      const routeQueries = engine.getRouteQueries(route);
      if (routeQueries.length === 0) return;

      prefetchHookLogger.info(
        `${i18n.t('shared.use_smart_prefetch.k3')}${route} (${routeQueries.length}${i18n.t('shared.use_smart_prefetch.k4')}`
      );

      for (const { query, variables } of routeQueries) {
        const queryKeys = routeQueryKeys.get(route) || [];
        const queryKey = queryKeys[0] || undefined;
        await prefetchQuery(query, variables, queryKey);
      }
    },
    [engine, isEnabled, prefetchQuery]
  );

  const recordVisit = useCallback(
    (route: string, duration?: number) => {
      if (!isEnabled) return;

      engine.recordVisit(route, Date.now(), duration);
      lastRouteRef.current = route;

      const preds = engine.predictNextRoutes(route);
      const highConfidence = preds.filter((p) => p.confidence >= minConfidence);

      if (highConfidence.length > 0) {
        engine.schedulePrefetch(highConfidence);
        updateState();

        if (prefetchOnIdle && 'requestIdleCallback' in window) {
          (
            window as unknown as { requestIdleCallback: (cb: () => void) => number }
          ).requestIdleCallback(() => {
            executePrefetchQueue();
          });
        } else {
          setTimeout(() => {
            executePrefetchQueue();
          }, 100);
        }
      }
    },
    [engine, isEnabled, minConfidence, prefetchOnIdle, executePrefetchQueue, updateState]
  );

  const togglePrefetch = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    prefetchHookLogger.info(
      `${i18n.t('shared.use_smart_prefetch.k5')}${enabled ? i18n.t('shared.use_smart_prefetch.k1') : i18n.t('shared.use_smart_prefetch.k0')}`
    );
  }, []);

  const clearHistory = useCallback(() => {
    engine.clearHistory();
    updateState();
  }, [engine, updateState]);

  const setStrategies = useCallback(
    (newStrategies: PrefetchStrategy[]) => {
      engine.setStrategies(newStrategies);
      updateState();
    },
    [engine, updateState]
  );

  const registerRouteQueries = useCallback(
    (
      route: string,
      queries: Array<{ query: string; variables?: Record<string, unknown>; queryKey?: unknown[] }>
    ) => {
      const basicQueries = queries.map(({ query, variables }) => ({ query, variables }));
      const keys = queries.map(({ queryKey }) => queryKey || []).filter((k) => k.length > 0);

      engine.registerRouteQueries(route, basicQueries);
      if (keys.length > 0) {
        routeQueryKeys.set(route, keys);
      }
    },
    [engine]
  );

  useEffect(() => {
    if (currentRoute && isEnabled && currentRoute !== lastRouteRef.current) {
      recordVisit(currentRoute);
    }
  }, [currentRoute, isEnabled, recordVisit]);

  useEffect(() => {
    updateState();
  }, [updateState]);

  return {
    predictions,
    prefetchQueue,
    isEnabled,
    visitHistory,
    prefetchForRoute,
    togglePrefetch,
    clearHistory,
    setStrategies,
    registerRouteQueries,
    recordVisit,
  };
}

export default useSmartPrefetch;
