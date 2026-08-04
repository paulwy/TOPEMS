/**
 * V45.0 Track D: BFF 错误处理 Hooks
 *
 * 提供 4 个错误处理 Hook：
 * - useBffError：获取当前错误状态 + 操作方法（重试/清除/降级）
 * - useBffRetry(queryKey, maxRetries)：自动重试指定 queryKey
 * - useBffFallback(primaryFn, fallbackFn)：自动降级，主函数失败时调用降级函数
 * - useErrorReport：错误上报（订阅错误事件 + 主动上报）
 *
 * 与 BffErrorBoundary 组件、fallback-strategy 引擎配合使用。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  classifyError,
  reportError,
  onErrorReport,
  type ClassifiedError,
  type ErrorReportRecord,
  type BffErrorType,
  type ErrorRecoveryStrategy,
} from '@/components/bff/BffErrorBoundary';
import {
  fallbackManager,
  type FallbackContext,
  type FallbackResult,
  type FallbackLevel,
} from '@/utils/bff/fallback-strategy';
import { logger } from '@/utils/logger';

const errHookLogger = logger.child({ prefix: 'BFF-ErrorHook' });

// ==================== useBffError ====================

/** useBffError 返回值 */
export interface UseBffErrorResult {
  /** 当前错误（无错误时为 null） */
  error: Error | null;
  /** 分类后的错误信息 */
  classified: ClassifiedError | null;
  /** 是否有错误 */
  hasError: boolean;
  /** 错误类型 */
  errorType: BffErrorType | null;
  /** 推荐的恢复策略 */
  recoveryStrategy: ErrorRecoveryStrategy | null;
  /** 降级级别 */
  fallbackLevel: FallbackLevel | null;
  /** 设置错误 */
  setError: (error: Error | null) => void;
  /** 清除错误 */
  clearError: () => void;
  /** 重试（清除错误并触发外部 onRetry） */
  retry: () => void;
  /** 执行降级 */
  fallback: (context: FallbackContext) => Promise<FallbackResult>;
  /** 上报当前错误 */
  report: () => void;
}

/**
 * 获取当前错误状态 + 操作方法
 *
 * @example
 * ```tsx
 * const { error, classified, retry, clearError } = useBffError();
 * if (error) return <BffErrorFallback error={error} onRetry={retry} />;
 * ```
 */
export function useBffError(onRetry?: () => void): UseBffErrorResult {
  const [error, setErrorState] = useState<Error | null>(null);

  const classified = error ? classifyError(error) : null;

  const setError = useCallback((err: Error | null) => {
    setErrorState(err);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const retry = useCallback(() => {
    setErrorState(null);
    onRetry?.();
  }, [onRetry]);

  const fallback = useCallback((context: FallbackContext) => fallbackManager.execute(context), []);

  const report = useCallback(() => {
    if (classified) {
      reportError(classified);
    }
  }, [classified]);

  return {
    error,
    classified,
    hasError: error !== null,
    errorType: classified?.type ?? null,
    recoveryStrategy: classified?.recommendedStrategy ?? null,
    fallbackLevel: classified?.fallbackLevel ?? null,
    setError,
    clearError,
    retry,
    fallback,
    report,
  };
}

// ==================== useBffRetry ====================

/** useBffRetry 配置项 */
export interface UseBffRetryOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重试间隔基数（毫秒），默认 1000，指数退避 */
  baseDelay?: number;
  /** 最大重试间隔（毫秒），默认 30000 */
  maxDelay?: number;
  /** 重试回调（每次重试触发） */
  onRetry?: (attempt: number, error: Error) => void;
  /** 重试成功回调 */
  onSuccess?: () => void;
  /** 所有重试失败回调 */
  onMaxRetriesReached?: (error: Error) => void;
}

/** useBffRetry 返回值 */
export interface UseBffRetryResult {
  /** 当前重试次数 */
  retryCount: number;
  /** 是否正在重试中 */
  isRetrying: boolean;
  /** 最后一次错误 */
  lastError: Error | null;
  /** 手动触发重试 */
  retry: () => void;
  /** 重置重试状态 */
  reset: () => void;
  /** 失败时调用此函数记录错误并自动重试 */
  recordError: (error: Error) => void;
}

/**
 * 自动重试 Hook
 *
 * 当 React Query 查询失败时，按指数退避策略自动重试。
 * 可与 useQuery 的 retry 配合，也可独立使用。
 *
 * @example
 * ```tsx
 * const { retryCount, recordError } = useBffRetry(['bff', 'dashboard'], {
 *   maxRetries: 3,
 *   onRetry: (n) => console.log(`第 ${n} 次重试`),
 * });
 * ```
 */
export function useBffRetry(
  queryKey: QueryKey,
  options: UseBffRetryOptions = {}
): UseBffRetryResult {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
    onSuccess,
    onMaxRetriesReached,
  } = options;

  const queryClient = useQueryClient();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 用 ref 保存最新的回调和计数，避免闭包陈旧
  const retryCountRef = useRef(0);
  const optionsRef = useRef({
    onRetry,
    onSuccess,
    onMaxRetriesReached,
    maxRetries,
    baseDelay,
    maxDelay,
  });
  optionsRef.current = { onRetry, onSuccess, onMaxRetriesReached, maxRetries, baseDelay, maxDelay };

  const clearTimer = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    retryCountRef.current = 0;
    setRetryCount(0);
    setIsRetrying(false);
    setLastError(null);
  }, [clearTimer]);

  const doRetry = useCallback(() => {
    const opts = optionsRef.current;
    const attempt = retryCountRef.current;
    if (attempt >= opts.maxRetries) {
      setIsRetrying(false);
      if (lastError) {
        opts.onMaxRetriesReached?.(lastError);
      }
      return;
    }

    // 指数退避：delay = base * 2^attempt，上限 maxDelay
    const delay = Math.min(opts.baseDelay * Math.pow(2, attempt), opts.maxDelay);
    setIsRetrying(true);

    retryTimer.current = setTimeout(() => {
      retryCountRef.current += 1;
      setRetryCount(retryCountRef.current);
      if (lastError) {
        opts.onRetry?.(retryCountRef.current, lastError);
      }
      // 触发 React Query 重新获取
      void queryClient
        .refetchQueries({ queryKey })
        .then(() => {
          // 成功时由 recordError 的下次调用或外部感知；这里仅重置重试态
          setIsRetrying(false);
        })
        .catch((err: unknown) => {
          const e = err instanceof Error ? err : new Error(String(err));
          setLastError(e);
          // 继续重试
          doRetry();
        });
    }, delay);
  }, [queryClient, queryKey, lastError]);

  const recordError = useCallback(
    (error: Error) => {
      setLastError(error);
      const opts = optionsRef.current;
      // 若已达上限，触发回调
      if (retryCountRef.current >= opts.maxRetries) {
        setIsRetrying(false);
        opts.onMaxRetriesReached?.(error);
        return;
      }
      doRetry();
    },
    [doRetry]
  );

  // 当查询成功时重置计数
  useEffect(() => {
    const queryCache = queryClient.getQueryCache();
    const unsubscribe = queryCache.subscribe((event) => {
      const query = event.query;
      if (!query) return;
      const key = query.queryKey;
      // 简单比较 queryKey 前缀
      if (
        Array.isArray(key) &&
        Array.isArray(queryKey) &&
        key.length >= queryKey.length &&
        queryKey.every((k, i) => key[i] === k) &&
        query.state.status === 'success' &&
        retryCountRef.current > 0
      ) {
        optionsRef.current.onSuccess?.();
        retryCountRef.current = 0;
        setRetryCount(0);
        setIsRetrying(false);
        setLastError(null);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [queryClient, queryKey]);

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    retryCount,
    isRetrying,
    lastError,
    retry: doRetry,
    reset,
    recordError,
  };
}

// ==================== useBffFallback ====================

/** useBffFallback 返回值 */
export interface UseBffFallbackResult<T> {
  /** 降级后的数据（主函数或降级函数返回） */
  data: T | null;
  /** 是否正在执行 */
  loading: boolean;
  /** 错误（主函数与降级函数均失败时） */
  error: Error | null;
  /** 是否触发了降级 */
  fellBack: boolean;
  /** 降级结果详情 */
  fallbackResult: FallbackResult<T> | null;
  /** 重新执行 */
  refetch: () => Promise<void>;
}

/**
 * 自动降级 Hook
 *
 * 先执行主函数，失败时自动执行降级函数。
 * 降级函数可通过 fallbackManager 责任链进一步兜底。
 *
 * @example
 * ```tsx
 * const { data, fellBack, refetch } = useBffFallback(
 *   () => bffGraphQL('query { dashboard { stats { erp { total } } } }'),
 *   () => bffApi.getBusinessStats()
 * );
 * ```
 */
export function useBffFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: (context: FallbackContext) => Promise<T> | T,
  deps: unknown[] = []
): UseBffFallbackResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [fellBack, setFellBack] = useState(false);
  const [fallbackResult, setFallbackResult] = useState<FallbackResult<T> | null>(null);

  // 用 ref 保存最新的函数，避免闭包陈旧
  const primaryRef = useRef(primaryFn);
  const fallbackRef = useRef(fallbackFn);
  primaryRef.current = primaryFn;
  fallbackRef.current = fallbackFn;

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFellBack(false);
    setFallbackResult(null);

    try {
      const result = await primaryRef.current();
      setData(result);
      setLoading(false);
      return;
    } catch (primaryErr) {
      errHookLogger.warn('主函数失败，尝试降级:', primaryErr);
      const error = primaryErr instanceof Error ? primaryErr : new Error(String(primaryErr));

      // 构造降级上下文
      const context: FallbackContext = {
        operationName: 'useBffFallback',
        error,
      };

      try {
        // 优先使用传入的降级函数
        const fallbackData = await fallbackRef.current(context);
        setData(fallbackData);
        setFellBack(true);
        setFallbackResult({
          success: true,
          data: fallbackData,
          level: fallbackManager.getFallbackLevel(error),
          strategyName: 'useBffFallback',
          durationMs: 0,
        });
        setError(null);
        setLoading(false);
        return;
      } catch (fallbackErr) {
        // 降级函数也失败，尝试责任链
        errHookLogger.warn('降级函数失败，尝试责任链:', fallbackErr);
        const chainResult = await fallbackManager.execute<T>(context);
        if (chainResult.success && chainResult.data !== undefined) {
          setData(chainResult.data);
          setFellBack(true);
          setFallbackResult(chainResult);
          setError(null);
        } else {
          setError(error);
          setFallbackResult(chainResult);
        }
        setLoading(false);
        return;
      }
    }
  }, []);

  // deps 变化时重新执行
  useEffect(() => {
    void execute();
  }, deps);

  return {
    data,
    loading,
    error,
    fellBack,
    fallbackResult,
    refetch: execute,
  };
}

// ==================== useErrorReport ====================

/** useErrorReport 返回值 */
export interface UseErrorReportResult {
  /** 最近的错误上报记录 */
  reports: ErrorReportRecord[];
  /** 主动上报错误 */
  report: (error: Error, retryCount?: number) => void;
  /** 上报分类后的错误 */
  reportClassified: (classified: ClassifiedError, retryCount?: number) => void;
  /** 清空错误记录 */
  clear: () => void;
}

/**
 * 错误上报 Hook
 *
 * 订阅错误上报事件，提供主动上报方法。
 * 适用于错误监控面板。
 *
 * @example
 * ```tsx
 * const { reports, report } = useErrorReport();
 * useEffect(() => {
 *   if (queryError) report(queryError);
 * }, [queryError]);
 * ```
 */
export function useErrorReport(): UseErrorReportResult {
  const [reports, setReports] = useState<ErrorReportRecord[]>([]);

  // 订阅错误上报事件
  useEffect(() => {
    // 初始加载已有记录
    try {
      const raw =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('topems:bff:error-reports')
          : null;
      if (raw) {
        setReports(JSON.parse(raw) as ErrorReportRecord[]);
      }
    } catch {
      // ignore
    }

    const unsubscribe = onErrorReport((record) => {
      setReports((prev) => [record, ...prev].slice(0, 200));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const report = useCallback((error: Error, retryCount = 0) => {
    const classified = classifyError(error);
    reportError(classified, retryCount);
  }, []);

  const reportClassified = useCallback((classified: ClassifiedError, retryCount = 0) => {
    reportError(classified, retryCount);
  }, []);

  const clear = useCallback(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('topems:bff:error-reports');
    }
    setReports([]);
  }, []);

  return {
    reports,
    report,
    reportClassified,
    clear,
  };
}

export default useBffError;
