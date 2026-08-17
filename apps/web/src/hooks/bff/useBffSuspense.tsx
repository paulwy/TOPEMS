/**
 * V42.0 Track D: 基于 React Suspense 的 BFF 数据加载 Hooks
 *
 * 功能:
 * - useBffSuspenseQuery: 使用 useSuspenseQuery 的 GraphQL 查询（自动抛出 Promise）
 * - useBffSuspenseInfinite: 无限滚动 Suspense 查询
 * - BffSuspenseBoundary: 错误边界 + Suspense 包装组件
 * - BffErrorFallback: 错误回退组件
 * - BffLoadingFallback: 加载回退组件
 *
 * 特性:
 * - 集成 React Query 的 useSuspenseQuery（React 19 + react-query v5）
 * - 自动错误重试（可通过 options 配置）
 * - 流式数据更新（配合 Suspense 边界）
 * - 缓存优先渲染（staleTime 控制新鲜度）
 *
 * @example
 * ```tsx
 * <BffSuspenseBoundary>
 *   <Dashboard />
 * </BffSuspenseBoundary>
 *
 * function Dashboard() {
 *   const { data } = useBffSuspenseQuery({
 *     queryKey: QUERY_KEYS.AD_HOC.BFF_DASHBOARD_BASE,
 *     query: `query { dashboard { stats { erp { total } } } }`,
 *   });
 *   return <div>总数: {data.dashboard.stats.erp.total}</div>;
 * }
 * ```
 */

import React, {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import i18n from '@/i18n';
import {
  useSuspenseQuery,
  useSuspenseInfiniteQuery,
  useQueryClient,
  type UseSuspenseQueryOptions,
  type UseSuspenseInfiniteQueryOptions,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { Box, Typography, Button, CircularProgress, Stack } from '@mui/material';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { bffGraphQL } from '@/api/bff';
import { logger } from '@/utils/logger';

import { QUERY_KEYS } from '@/lib/reactQuery';

const suspenseLogger = logger.child({ prefix: 'BFF-Suspense' });

// ==================== useBffSuspenseQuery ====================

/** useBffSuspenseQuery 配置项 */
export interface UseBffSuspenseQueryOptions<T = unknown> {
  /** React Query queryKey */
  queryKey: unknown[];
  /** GraphQL 查询字符串 */
  query: string;
  /** GraphQL 变量 */
  variables?: Record<string, unknown>;
  /** 缓存新鲜时间（毫秒），默认 5 分钟 */
  staleTime?: number;
  /** 是否启用查询，默认 true */
  enabled?: boolean;
  /** 失败重试次数，默认 2 */
  retry?: number | ((failureCount: number, error: Error) => boolean);
  /** 后台刷新间隔（毫秒），默认不刷新 */
  refetchInterval?: number;
  /** 自定义数据转换 */
  select?: (data: T) => T;
}

/** useBffSuspenseQuery 返回值 */
export interface UseBffSuspenseQueryResult<T = unknown> {
  /** 查询数据（Suspense 模式下保证已就绪） */
  data: T;
  /** 后台是否正在刷新 */
  isFetching: boolean;
  /** 手动刷新 */
  refetch: () => void;
}

/**
 * 基于 Suspense 的 BFF GraphQL 查询 Hook
 *
 * 使用 React Query v5 的 useSuspenseQuery，当数据未就绪时自动抛出 Promise，
 * 由最近的 Suspense 边界捕获并展示 fallback。
 *
 * 缓存优先：若缓存数据仍在 staleTime 内，直接返回缓存，不阻塞渲染。
 *
 * @example
 * ```tsx
 * const { data } = useBffSuspenseQuery({
 *   queryKey: QUERY_KEYS.AD_HOC.BFF_STATS_BASE,
 *   query: `query { businessStats { erp { total active } } }`,
 *   staleTime: 60_000,
 * });
 * ```
 */
export function useBffSuspenseQuery<T = unknown>(
  options: UseBffSuspenseQueryOptions<T>
): UseBffSuspenseQueryResult<T> {
  const {
    queryKey,
    query,
    variables,
    staleTime = 5 * 60 * 1000,
    enabled = true,
    retry = 2,
    refetchInterval = false,
    select,
  } = options;

  // ---------------------------------------------------------------------------
  // HOOK ORDERING CONSTRAINT (Suspense + Rules of Hooks)
  //
  // `useSuspenseQuery` throws a Promise when data is not yet cached, so that
  // React can suspend rendering and show the nearest Suspense fallback.  ANY
  // React hook declared AFTER this call will NOT execute on the first (throwing)
  // render but WILL execute on the second (resumed) render, producing the
  // dreaded "Invalid hook call" / "Rendered more hooks than during the previous
  // render" error.
  //
  // Therefore this hook intentionally avoids any useXxx() call after
  // useSuspenseQuery.  Helper functions that would normally be wrapped in
  // useCallback are returned as plain closures — React Query already keeps
  // `suspenseQuery.refetch` identity-stable, so the extra layer of
  // memoization is unnecessary.
  // ---------------------------------------------------------------------------
  const suspenseQuery = useSuspenseQuery<T, Error>({
    queryKey,
    queryFn: () => bffGraphQL<T>(query, variables) as Promise<T>,
    staleTime,
    enabled,
    retry,
    refetchInterval:
      typeof refetchInterval === 'number' && refetchInterval > 0 ? refetchInterval : false,
    select,
  } as UseSuspenseQueryOptions<T, Error>);

  // NOTE: deliberately NOT wrapped in useCallback() — see ordering note above.
  const refetch = (): void => {
    void suspenseQuery.refetch();
  };

  return {
    data: suspenseQuery.data,
    isFetching: suspenseQuery.isFetching,
    refetch,
  };
}

// ==================== useBffSuspenseInfinite ====================

/** 无限滚动游标参数 */
export interface BffInfiniteCursor {
  page: number;
  pageSize: number;
}

/** useBffSuspenseInfinite 配置项 */
export interface UseBffSuspenseInfiniteOptions<T = unknown> {
  /** React Query queryKey */
  queryKey: unknown[];
  /** GraphQL 查询字符串（需接受 $page/$pageSize 变量） */
  query: string;
  /** 基础变量（不含分页字段） */
  variables?: Record<string, unknown>;
  /** 每页条数，默认 20 */
  pageSize?: number;
  /** 缓存新鲜时间（毫秒），默认 5 分钟 */
  staleTime?: number;
  /** 失败重试次数，默认 2 */
  retry?: number;
  /** 自定义获取下一页游标 */
  getNextPageParam?: (lastPage: T, allPages: T[]) => BffInfiniteCursor | undefined;
  /** 自定义数据转换 */
  select?: (data: InfiniteData<T, BffInfiniteCursor>) => InfiniteData<T, BffInfiniteCursor>;
}

/** useBffSuspenseInfinite 返回值 */
export interface UseBffSuspenseInfiniteResult<T = unknown> {
  /** 分页数据 */
  data: InfiniteData<T, BffInfiniteCursor>;
  /** 是否正在后台获取下一页 */
  isFetchingNextPage: boolean;
  /** 是否还有下一页 */
  hasNextPage: boolean;
  /** 加载下一页 */
  fetchNextPage: () => void;
  /** 手动刷新 */
  refetch: () => void;
}

/**
 * 无限滚动 Suspense 查询 Hook
 *
 * 首页数据通过 Suspense 加载，后续页面通过 fetchNextPage 触发。
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useBffSuspenseInfinite({
 *   queryKey: QUERY_KEYS.AD_HOC.BFF_TODOS_INFINITE_BASE,
 *   query: `query($page: Int, $pageSize: Int) { unifiedTodos(page: $page, pageSize: $pageSize) { id title } }`,
 *   pageSize: 20,
 *   getNextPageParam: (lastPage, allPages) => {
 *     if (lastPage.length < 20) return undefined;
 *     return { page: allPages.length + 1, pageSize: 20 };
 *   },
 * });
 * ```
 */
export function useBffSuspenseInfinite<T = unknown>(
  options: UseBffSuspenseInfiniteOptions<T>
): UseBffSuspenseInfiniteResult<T> {
  const {
    queryKey,
    query,
    variables,
    pageSize = 20,
    staleTime = 5 * 60 * 1000,
    retry = 2,
    getNextPageParam,
    select,
  } = options;

  // See ordering note in useBffSuspenseQuery above: no React hooks allowed after
  // useSuspenseInfiniteQuery because it throws Promise on first uncached render.
  const infiniteQuery = useSuspenseInfiniteQuery<
    T,
    Error,
    InfiniteData<T, BffInfiniteCursor>,
    QueryKey,
    BffInfiniteCursor
  >({
    queryKey,
    queryFn: ({ pageParam }) =>
      bffGraphQL<T>(query, {
        ...variables,
        page: pageParam?.page ?? 1,
        pageSize: pageParam?.pageSize ?? pageSize,
      }) as Promise<T>,
    initialPageParam: { page: 1, pageSize },
    getNextPageParam: (lastPage, allPages, lastPageParam) => {
      if (getNextPageParam) return getNextPageParam(lastPage, allPages);
      // 默认行为：若返回数组长度等于 pageSize，则认为还有下一页
      if (Array.isArray(lastPage) && lastPage.length < pageSize) return;
      return {
        page: (lastPageParam?.page ?? 1) + 1,
        pageSize,
      };
    },
    staleTime,
    retry,
    select,
  } as UseSuspenseInfiniteQueryOptions<
    T,
    Error,
    InfiniteData<T, BffInfiniteCursor>,
    QueryKey,
    BffInfiniteCursor
  >);

  // NOTE: deliberately NOT wrapped in useCallback() — see ordering note above.
  const fetchNextPage = (): void => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      void infiniteQuery.fetchNextPage();
    }
  };
  const refetch = (): void => {
    void infiniteQuery.refetch();
  };

  return {
    data: infiniteQuery.data,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage,
    refetch,
  };
}

// ==================== BffLoadingFallback ====================

/** BffLoadingFallback Props */
export interface BffLoadingFallbackProps {
  /** 提示文案，默认 "加载中..." */
  message?: string;
  /** 是否全屏，默认 false */
  fullScreen?: boolean;
  /** 最小高度（px），默认 200 */
  minHeight?: number;
}

/**
 * 加载回退组件
 *
 * 在 Suspense fallback 中展示，提供统一的加载视觉。
 *
 * @example
 * ```tsx
 * <Suspense fallback={<BffLoadingFallback message="加载仪表盘..." />}>
 *   <Dashboard />
 * </Suspense>
 * ```
 */
export const BffLoadingFallback: React.FC<BffLoadingFallbackProps> = ({
  message = i18n.t('hooks.use_bff_suspense.k0'),
  fullScreen = false,
  minHeight = 200,
}) => {
  const content = (
    <Stack
      spacing={2}
      sx={{ alignItems: 'center', justifyContent: 'center', minHeight, width: '100%' }}
    >
      <CircularProgress
        size={32}
        thickness={4}
      />
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {message}
      </Typography>
    </Stack>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          zIndex: 1300,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

// ==================== BffErrorFallback ====================

/** BffErrorFallback Props */
export interface BffErrorFallbackProps {
  /** 错误对象 */
  error: Error;
  /** 重试回调 */
  onReset?: () => void;
  /** 自定义错误标题 */
  title?: string;
  /** 是否显示错误详情，默认 true */
  showDetails?: boolean;
}

/**
 * 错误回退组件
 *
 * 在错误边界捕获到异常时展示，支持重试。
 *
 * @example
 * ```tsx
 * <BffErrorFallback error={error} onReset={() => refetch()} />
 * ```
 */
export const BffErrorFallback: React.FC<BffErrorFallbackProps> = ({
  error,
  onReset,
  title = i18n.t('hooks.use_bff_suspense.k0'),
  showDetails = true,
}) => {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        bgcolor: 'error.50',
        border: '1px solid',
        borderColor: 'error.main',
      }}
    >
      <Stack
        spacing={2}
        sx={{ alignItems: 'flex-start' }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <AlertCircle
            size={20}
            color='error'
          />
          <Typography
            variant='subtitle2'
            color='error.main'
            sx={{ fontWeight: 600 }}
          >
            {title}
          </Typography>
        </Stack>

        {showDetails && (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ wordBreak: 'break-word' }}
          >
            {error.message}
          </Typography>
        )}

        {onReset && (
          <Button
            size='small'
            variant='outlined'
            color='error'
            startIcon={<RefreshCw size={16} />}
            onClick={onReset}
          >
            {i18n.t('hooks.use_bff_suspense.k1')}
          </Button>
        )}
      </Stack>
    </Box>
  );
};

// ==================== BffSuspenseBoundary ====================

/** BffSuspenseBoundary 内部错误边界状态 */
interface BffErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** BffSuspenseBoundary Props */
export interface BffSuspenseBoundaryProps {
  children: ReactNode;
  /** 加载回退，默认 <BffLoadingFallback /> */
  fallback?: ReactNode;
  /** 错误回退渲染函数 */
  errorFallback?: (error: Error, reset: () => void) => ReactNode;
  /** 错误回调 */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** 重置时回调 */
  onReset?: () => void;
  /** 是否显示错误详情，默认 true */
  showDetails?: boolean;
  /** Suspense 名称（用于调试 + 性能统计） */
  name?: string;
}

/**
 * BFF Suspense 错误边界
 *
 * 内部类组件捕获子树抛出的错误，配合 Suspense 处理 Promise 抛出。
 * 当错误发生时展示 BffErrorFallback，点击"重试"重置错误边界状态。
 *
 * @example
 * ```tsx
 * <BffSuspenseBoundary name="dashboard">
 *   <Dashboard />
 * </BffSuspenseBoundary>
 * ```
 */
class BffErrorBoundaryInner extends Component<
  BffSuspenseBoundaryProps & { boundaryKey: number },
  BffErrorBoundaryState
> {
  constructor(props: BffSuspenseBoundaryProps & { boundaryKey: number }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): BffErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const { onError, name } = this.props;
    suspenseLogger.error(
      `{i18n.t('hooks.use_bff_suspense.suspense_0')}${name ? ` [${name}]` : ''} {i18n.t('hooks.use_bff_suspense.k1')}`,
      error,
      info.componentStack
    );
    onError?.(error, info);
  }

  override componentDidUpdate(
    prevProps: Readonly<BffSuspenseBoundaryProps & { boundaryKey: number }>
  ): void {
    // 当 boundaryKey 变化（外部触发重置）时清除错误状态
    if (prevProps.boundaryKey !== this.props.boundaryKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReset = (): void => {
    const { onReset } = this.props;
    onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    const { children, fallback, errorFallback, showDetails, name } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      if (errorFallback) {
        return errorFallback(error, this.handleReset);
      }
      return (
        <BffErrorFallback
          error={error}
          onReset={this.handleReset}
          showDetails={showDetails}
        />
      );
    }

    return (
      <Suspense
        fallback={fallback ?? <BffLoadingFallback />}
        name={name}
      >
        {children}
      </Suspense>
    );
  }
}

/**
 * BFF Suspense 边界组件
 *
 * 封装错误边界 + Suspense，提供统一的加载/错误处理。
 * 通过 `resetKey` 可在外部强制重置错误状态（如路由切换时）。
 *
 * @example
 * ```tsx
 * <BffSuspenseBoundary
 *   name="todos"
 *   fallback={<BffLoadingFallback message="加载待办..." />}
 *   resetKey={routeKey}
 * >
 *   <TodosView />
 * </BffSuspenseBoundary>
 * ```
 */
export const BffSuspenseBoundary: React.FC<
  BffSuspenseBoundaryProps & { resetKey?: string | number }
> = ({ resetKey, children, ...rest }) => {
  const [boundaryKey, setBoundaryKey] = useState(0);
  const lastResetKey = useRef(resetKey);

  useEffect(() => {
    if (lastResetKey.current !== resetKey) {
      lastResetKey.current = resetKey;
      setBoundaryKey((k) => k + 1);
    }
  }, [resetKey]);

  return (
    <BffErrorBoundaryInner
      key={boundaryKey}
      boundaryKey={boundaryKey}
      {...rest}
    >
      {children}
    </BffErrorBoundaryInner>
  );
};

// ==================== Suspense 使用统计追踪 ====================

/** Suspense 挂载记录 */
export interface SuspenseMountRecord {
  name: string;
  mountedAt: number;
  duration: number | null;
}

const suspenseStatsListeners = new Set<() => void>();
const suspenseMounts: SuspenseMountRecord[] = [];
const MAX_SUSPENSE_RECORDS = 100;

function notifySuspenseStatsListeners(): void {
  suspenseStatsListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      suspenseLogger.error(i18n.t('hooks.use_bff_suspense.k4'), e);
    }
  });
}

/**
 * 记录一次 Suspense 挂载（供 PerformancePanel 统计）
 *
 * @param name Suspense 边界名称
 * @param duration 持续时间（毫秒），null 表示尚未结束
 */
export function recordSuspenseMount(name: string, duration: number | null = null): void {
  suspenseMounts.unshift({ name, mountedAt: Date.now(), duration });
  if (suspenseMounts.length > MAX_SUSPENSE_RECORDS) {
    suspenseMounts.pop();
  }
  notifySuspenseStatsListeners();
}

/**
 * 获取 Suspense 使用统计
 */
export function getSuspenseStats(): {
  records: SuspenseMountRecord[];
  totalMounts: number;
  uniqueBoundaries: number;
  avgDuration: number;
} {
  const uniqueNames = new Set(suspenseMounts.map((r) => r.name));
  const completed = suspenseMounts.filter((r) => r.duration !== null);
  const avgDuration =
    completed.length > 0
      ? completed.reduce((sum, r) => sum + (r.duration ?? 0), 0) / completed.length
      : 0;
  return {
    records: [...suspenseMounts],
    totalMounts: suspenseMounts.length,
    uniqueBoundaries: uniqueNames.size,
    avgDuration,
  };
}

/**
 * 订阅 Suspense 统计变化
 * @returns 取消订阅函数
 */
export function onSuspenseStatsChange(callback: () => void): () => void {
  suspenseStatsListeners.add(callback);
  return () => {
    suspenseStatsListeners.delete(callback);
  };
}

/**
 * Suspense 性能追踪 Hook
 *
 * 在组件挂载时记录 Suspense 边界名称，卸载时记录持续时间。
 * 供 PerformancePanel 的 Suspense Tab 消费。
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   useSuspensePerfTracker('dashboard');
 *   const { data } = useBffSuspenseQuery({ ... });
 *   return <div>{data.total}</div>;
 * }
 * ```
 */
export function useSuspensePerfTracker(name: string): void {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    recordSuspenseMount(name, null);
    const endTime = Date.now();
    const duration = endTime - startTime.current;
    recordSuspenseMount(name, duration);
    return () => {
      // 卸载时无需再次记录，duration 已在 effect 中记录
    };
  }, [name]);
}

// ==================== 缓存预热工具 ====================

/**
 * 预热 Suspense 查询缓存
 *
 * 在路由切换或用户 hover 时提前发起查询，填入 React Query 缓存，
 * 这样真正渲染 useBffSuspenseQuery 时可直接命中缓存，避免 Suspense fallback 闪烁。
 *
 * @example
 * ```tsx
 * prefetchBffSuspenseQuery({
 *   queryKey: QUERY_KEYS.AD_HOC.BFF_DASHBOARD_BASE,
 *   query: `query { dashboard { stats { erp { total } } } }`,
 * });
 * ```
 */
export function usePrefetchBffSuspenseQuery(): (
  options: Omit<UseBffSuspenseQueryOptions, 'enabled'>
) => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(
    async (options: Omit<UseBffSuspenseQueryOptions, 'enabled'>) => {
      const { queryKey, query, variables, staleTime = 5 * 60 * 1000 } = options;
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => bffGraphQL(query, variables),
        staleTime,
      });
    },
    [queryClient]
  );
}

export default useBffSuspenseQuery;
