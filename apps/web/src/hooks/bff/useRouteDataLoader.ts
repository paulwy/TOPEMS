/**
 * V42.0 Track D: 路由级数据加载器
 *
 * 实现 route-level data loaders，配合 Suspense 实现数据并行加载与延迟加载：
 * - 多 loader 并行加载（Promise.all）
 * - 支持延迟加载（部分数据可延后，配合 Suspense 流式填充）
 * - 加载状态管理
 * - 错误隔离（单个 loader 失败不影响其他）
 *
 * 核心抽象:
 * - RouteDataLoader: 路由数据加载器类型（loader / deferredLoader / errorBoundary / pendingComponent）
 * - DeferredData: 延迟数据（配合 Suspense，read() 抛出 Promise 或返回数据）
 * - createDeferred(promise): 创建 DeferredData 实例
 * - useRouteDataLoader(loaders): 批量加载路由数据
 *
 * @example
 * ```tsx
 * const loaders = {
 *   stats: {
 *     loader: () => getBusinessStats(),
 *     pendingComponent: <StatsSkeleton />,
 *   },
 *   todos: {
 *     deferredLoader: () => createDeferred(getTodos()),
 *     pendingComponent: <TodosSkeleton />,
 *   },
 * };
 *
 * function Dashboard() {
 *   const { data } = useRouteDataLoader(loaders);
 *   // data.stats 已就绪；data.todos 是 DeferredData，需在 Suspense 内 read()
 *   return (
 *     <div>
 *       <Stats data={data.stats} />
 *       <Suspense fallback={<TodosSkeleton />}>
 *         <Todos data={data.todos.read()} />
 *       </Suspense>
 *     </div>
 *   );
 * }
 * ```
 */

import React, { useEffect, useState, useCallback, useRef, type ComponentType } from 'react';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const loaderLogger = logger.child({ prefix: 'RouteLoader' });

// ==================== DeferredData ====================

/** DeferredData 状态 */
type DeferredStatus = 'pending' | 'resolved' | 'rejected';

/**
 * 延迟数据（配合 Suspense）
 *
 * 实现 React Suspense 协议：
 * - read(): 未就绪时抛出 Promise（触发 Suspense fallback），就绪后返回数据，失败时抛出错误
 * - isReady(): 检查是否已就绪
 *
 * @example
 * ```tsx
 * const deferred = createDeferred(fetchData());
 *
 * function Data() {
 *   const data = deferred.read(); // 抛出 Promise 或返回数据
 *   return <div>{data.value}</div>;
 * }
 *
 * <Suspense fallback={<Loading />}>
 *   <Data />
 * </Suspense>
 * ```
 */
export class DeferredData<T = unknown> {
  private status: DeferredStatus = 'pending';
  private result: T | undefined;
  private error: Error | undefined;
  private promise: Promise<T>;
  private suspender: Promise<void> | undefined;
  private listeners: Set<() => void> = new Set();

  constructor(promise: Promise<T>) {
    this.promise = promise;
    this.suspender = promise.then(
      (value) => {
        this.status = 'resolved';
        this.result = value;
        this.listeners.forEach((l) => l());
      },
      (err) => {
        this.status = 'rejected';
        this.error = err instanceof Error ? err : new Error(String(err));
        this.listeners.forEach((l) => l());
      }
    );
  }

  /**
   * 读取数据
   *
   * - pending: 抛出 suspender Promise（触发 Suspense fallback）
   * - resolved: 返回数据
   * - rejected: 抛出错误（触发错误边界）
   */
  read(): T {
    switch (this.status) {
      case 'pending':
        throw this.suspender;
      case 'rejected':
        throw this.error;
      case 'resolved':
        return this.result as T;
    }
  }

  /**
   * 检查是否已就绪（resolved 或 rejected）
   */
  isReady(): boolean {
    return this.status === 'resolved' || this.status === 'rejected';
  }

  /**
   * 检查是否成功解析
   */
  isResolved(): boolean {
    return this.status === 'resolved';
  }

  /**
   * 检查是否失败
   */
  isRejected(): boolean {
    return this.status === 'rejected';
  }

  /**
   * 获取原始 Promise（用于 Promise.all 等场景）
   */
  toPromise(): Promise<T> {
    return this.promise;
  }

  /**
   * 订阅状态变化（非 Suspense 场景使用）
   * @returns 取消订阅函数
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/**
 * 创建 DeferredData 实例
 *
 * @param promise 原始 Promise
 * @returns DeferredData 实例
 *
 * @example
 * ```tsx
 * const deferred = createDeferred(getDashboardStats());
 * ```
 */
export function createDeferred<T>(promise: Promise<T>): DeferredData<T> {
  return new DeferredData<T>(promise);
}

// ==================== RouteDataLoader 类型 ====================

/** 路由参数 */
export type RouteParams = Record<string, string | number | boolean | undefined>;

/** 同步加载器配置 */
export interface RouteLoaderConfig<T = unknown> {
  /** 加载函数：返回 Promise<T> */
  loader: (params: RouteParams) => Promise<T>;
  /** 错误边界组件（可选，覆盖默认） */
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
  /** 加载中组件（可选） */
  pendingComponent?: ComponentType;
  /** 是否延迟加载（默认 false）。延迟加载返回 DeferredData */
  deferred?: false;
  /** 重试次数，默认 1 */
  retry?: number;
}

/** 延迟加载器配置 */
export interface RouteDeferredLoaderConfig<T = unknown> {
  /** 延迟加载函数：返回 DeferredData<T> */
  deferredLoader: (params: RouteParams) => DeferredData<T>;
  /** 错误边界组件（可选） */
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
  /** 加载中组件（可选） */
  pendingComponent?: ComponentType;
  /** 标记为延迟加载 */
  deferred: true;
  /** 重试次数，默认 1 */
  retry?: number;
}

/** 路由数据加载器（联合类型） */
export type RouteDataLoader<T = unknown> = RouteLoaderConfig<T> | RouteDeferredLoaderConfig<T>;

/** 判断是否为延迟加载器 */
function isDeferredLoader<T>(loader: RouteDataLoader<T>): loader is RouteDeferredLoaderConfig<T> {
  return (loader as RouteDeferredLoaderConfig<T>).deferred === true;
}

// ==================== useRouteDataLoader ====================

/** 加载器结果条目 */
export type RouteDataEntry<T = unknown> = T | DeferredData<T>;

/** 加载器状态 */
export interface RouteLoaderState {
  /** 整体加载状态 */
  status: 'idle' | 'loading' | 'success' | 'partial' | 'error';
  /** 各 loader 的错误（key → Error） */
  errors: Record<string, Error>;
  /** 各 loader 的状态（key → 'pending' | 'resolved' | 'rejected'） */
  statuses: Record<string, 'pending' | 'resolved' | 'rejected'>;
}

/** useRouteDataLoader 返回值 */
export interface UseRouteDataLoaderResult<T extends Record<string, RouteDataLoader>> {
  /** 加载结果（key → 数据或 DeferredData） */
  data: {
    [K in keyof T]: T[K] extends RouteDeferredLoaderConfig<infer U>
      ? DeferredData<U>
      : T[K] extends RouteLoaderConfig<infer U>
        ? U
        : never;
  };
  /** 加载状态 */
  state: RouteLoaderState;
  /** 整体是否加载中 */
  loading: boolean;
  /** 是否有错误 */
  hasError: boolean;
  /** 重试指定 loader */
  retry: (key: string) => void;
  /** 重试所有失败的 loader */
  retryAll: () => void;
}

/**
 * 批量加载路由数据
 *
 * 特性:
 * - 并行加载多个 loader（Promise.all）
 * - 支持延迟加载（deferredLoader 返回 DeferredData，配合 Suspense）
 * - 加载状态管理（per-loader status）
 * - 错误隔离（单个 loader 失败不影响其他 loader 的结果）
 *
 * @param loaders 路由数据加载器映射表
 * @param params 路由参数
 *
 * @example
 * ```tsx
 * const { data, loading, state } = useRouteDataLoader({
 *   stats: { loader: () => getBusinessStats() },
 *   todos: { deferredLoader: () => createDeferred(getTodos()), deferred: true },
 * }, { page: 1 });
 *
 * if (loading) return <Skeleton />;
 * return <Stats data={data.stats} />;
 * ```
 */
export function useRouteDataLoader<T extends Record<string, RouteDataLoader>>(
  loaders: T,
  params: RouteParams = {}
): UseRouteDataLoaderResult<T> {
  const [state, setState] = useState<RouteLoaderState>({
    status: 'idle',
    errors: {},
    statuses: {},
  });
  const [data, setData] = useState<Record<string, RouteDataEntry>>({});
  const retryCounter = useRef<Record<string, number>>({});
  const paramsKey = useRef<string>(JSON.stringify(params));
  const loadersKey = useRef<string>('');

  const executeLoaders = useCallback(async () => {
    const entries = Object.entries(loaders);
    if (entries.length === 0) {
      setState({ status: 'success', errors: {}, statuses: {} });
      return;
    }

    const initialStatuses: Record<string, 'pending' | 'resolved' | 'rejected'> = {};
    for (const [key] of entries) {
      initialStatuses[key] = 'pending';
    }
    setState({ status: 'loading', errors: {}, statuses: initialStatuses });

    const results: Record<string, RouteDataEntry> = {};
    const errors: Record<string, Error> = {};
    const statuses: Record<string, 'pending' | 'resolved' | 'rejected'> = { ...initialStatuses };

    // 并行加载所有 loader
    await Promise.all(
      entries.map(async ([key, loader]) => {
        const maxRetry = loader.retry ?? 1;
        let attempt = 0;
        let lastError: Error | undefined;

        while (attempt <= maxRetry) {
          try {
            if (isDeferredLoader(loader)) {
              const deferred = loader.deferredLoader(params);
              results[key] = deferred;
              // DeferredData 不阻塞 Promise.all，状态由 Suspense 边界处理
              statuses[key] = 'resolved';
            } else {
              const result = await loader.loader(params);
              results[key] = result;
              statuses[key] = 'resolved';
            }
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            attempt++;
            if (attempt > maxRetry) break;
            loaderLogger.warn(`loader [${key}${i18n.t('shared.use_route_data_loader.k0')}${attempt}${i18n.t('shared.use_route_data_loader.k1')}`, lastError.message);
          }
        }

        if (lastError) {
          errors[key] = lastError;
          statuses[key] = 'rejected';
          loaderLogger.error(`loader [${key}${i18n.t('shared.use_route_data_loader.k2')}`, lastError);
        }
      })
    );

    const hasAnyError = Object.keys(errors).length > 0;
    const allResolved = Object.values(statuses).every((s) => s === 'resolved');
    const finalStatus: RouteLoaderState['status'] = allResolved
      ? 'success'
      : hasAnyError
        ? Object.keys(results).length > 0
          ? 'partial'
          : 'error'
        : 'loading';

    setState({ status: finalStatus, errors, statuses });
    setData(results);
  }, [loaders, params]);

  // 当 loaders 或 params 变化时重新加载
  useEffect(() => {
    const newParamsKey = JSON.stringify(params);
    const newLoadersKey = Object.keys(loaders).join(',');
    if (newParamsKey !== paramsKey.current || newLoadersKey !== loadersKey.current) {
      paramsKey.current = newParamsKey;
      loadersKey.current = newLoadersKey;
      void executeLoaders();
    } else if (state.status === 'idle') {
      void executeLoaders();
    }
  }, [loaders, params, executeLoaders]);

  // 首次加载
  useEffect(() => {
    void executeLoaders();
  }, []);

  const retry = useCallback(
    (key: string) => {
      retryCounter.current[key] = (retryCounter.current[key] ?? 0) + 1;
      void executeLoaders();
    },
    [executeLoaders]
  );

  const retryAll = useCallback(() => {
    for (const key of Object.keys(loaders)) {
      retryCounter.current[key] = (retryCounter.current[key] ?? 0) + 1;
    }
    void executeLoaders();
  }, [loaders, executeLoaders]);

  return {
    data: data as UseRouteDataLoaderResult<T>['data'],
    state,
    loading: state.status === 'loading' || state.status === 'idle',
    hasError: Object.keys(state.errors).length > 0,
    retry,
    retryAll,
  };
}

// ==================== RouteDataBoundary 便捷组件 ====================

/** RouteDataBoundary Props */
export interface RouteDataBoundaryProps {
  children: React.ReactNode;
  /** 错误边界组件 */
  errorComponent?: ComponentType<{ error: Error; retry: () => void }>;
  /** 加载中组件 */
  pendingComponent?: ComponentType;
  /** 重置 key（变化时重置内部状态） */
  resetKey?: string | number;
}

/**
 * 路由数据边界组件
 *
 * 封装 Suspense + ErrorBoundary，配合 DeferredData 使用。
 * 当 DeferredData.read() 抛出 Promise 时展示 pendingComponent，
 * 抛出错误时展示 errorComponent。
 */
export function RouteDataBoundary({
  children,
  errorComponent: ErrorComp,
  pendingComponent: PendingComp,
  resetKey,
}: RouteDataBoundaryProps): React.ReactElement {
  const [error, setError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setError(null);
  }, [resetKey]);

  if (error) {
    const retry = () => {
      setError(null);
      setRetryKey((k) => k + 1);
    };
    if (ErrorComp) {
      return React.createElement(ErrorComp, { error, retry });
    }
    return React.createElement('div', null, `${i18n.t('shared.use_route_data_loader.k3')}${error.message}`);
  }

  return React.createElement(
    React.Suspense,
    {
      key: retryKey,
      fallback: PendingComp ? React.createElement(PendingComp) : null,
    },
    React.createElement(RouteDataErrorCatcher, { onError: (err: Error) => setError(err), children })
  );
}

/** 内部错误捕获组件 */
const RouteDataErrorCatcher: React.FC<{
  children: React.ReactNode;
  onError: (error: Error) => void;
}> = ({ children, onError }) => {
  React.useEffect(() => {
    // 捕获 unhandled rejection（DeferredData 抛出的错误）
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Error) {
        onError(event.reason);
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [onError]);

  return React.createElement(React.Fragment, null, children);
};

export default useRouteDataLoader;
