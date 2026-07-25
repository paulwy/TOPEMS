/**
 * V42.0 Track D: 部分预渲染（Partial Pre-Rendering, PPR）Hooks
 *
 * 实现 Next.js PPR 风格的"静态壳 + 动态内容流式填充"模式：
 * 1. 首先渲染静态壳（布局/导航/骨架屏）— 立即可见
 * 2. 标记动态区域为 StreamingSlot — 占位
 * 3. 客户端水合后，StreamingSlot 内部用 Suspense 加载真实数据
 * 4. 数据就绪后流式替换
 *
 * 提供:
 * - usePartialPreRender(route): 获取路由的预渲染壳
 * - prefetchRouteShell(route): 预取路由静态壳
 * - StreamingSlot: 动态内容流式占位组件
 * - StaticShell: 静态壳组件
 *
 * @example
 * ```tsx
 * <StaticShell route="/dashboard">
 *   <Layout />
 *   <StreamingSlot name="stats" fallback={<Skeleton />}>
 *     <Stats />  // 客户端 Suspense 加载
 *   </StreamingSlot>
 * </StaticShell>
 * ```
 */

import React, {
  Suspense,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { readSSRData } from '@/utils/streaming-ssr';
import { logger } from '@/utils/logger';

const pprLogger = logger.child({ prefix: 'PPR' });

// ==================== 路由静态壳注册表 ====================

/** 静态壳渲染函数（返回静态 React 元素） */
export type ShellRenderer = () => ReactNode;

/** 路由静态壳配置 */
export interface RouteShellConfig {
  /** 路由路径 */
  route: string;
  /** 静态壳渲染函数 */
  render: ShellRenderer;
  /** 静态壳预取的数据 key 列表 */
  staticDataKeys?: string[];
  /** 动态 slot 名称列表（用于水合后流式填充） */
  dynamicSlots?: string[];
}

/** 路由静态壳注册表 */
const routeShellRegistry = new Map<string, RouteShellConfig>();

/** 预取的静态壳缓存（route → 已就绪标记） */
const prefetchedShells = new Map<string, boolean>();

/**
 * 注册路由静态壳
 *
 * 在应用初始化时注册每个路由的静态壳渲染函数，
 * 供 usePartialPreRender / prefetchRouteShell 使用。
 *
 * @example
 * ```tsx
 * registerRouteShell({
 *   route: '/dashboard',
 *   render: () => <DashboardLayout />,
 *   staticDataKeys: ['dashboard-layout'],
 *   dynamicSlots: ['stats', 'todos'],
 * });
 * ```
 */
export function registerRouteShell(config: RouteShellConfig): () => void {
  routeShellRegistry.set(config.route, config);
  return () => {
    routeShellRegistry.delete(config.route);
  };
}

/**
 * 取消注册路由静态壳
 */
export function unregisterRouteShell(route: string): void {
  routeShellRegistry.delete(route);
  prefetchedShells.delete(route);
}

// ==================== usePartialPreRender ====================

/** usePartialPreRender 返回值 */
export interface UsePartialPreRenderResult {
  /** 静态壳是否已就绪 */
  ready: boolean;
  /** 静态壳 React 节点（未注册时为 null） */
  shell: ReactNode | null;
  /** 路由配置的动态 slot 名称列表 */
  dynamicSlots: string[];
  /** 静态数据（从 SSR 数据中按 key 读取） */
  staticData: Record<string, unknown>;
  /** 该路由是否已注册静态壳 */
  registered: boolean;
}

/**
 * 获取路由的预渲染静态壳
 *
 * 工作流：
 * 1. 从注册表中查找路由的静态壳渲染函数
 * 2. 从 SSR 注入数据中读取 staticDataKeys 对应的数据
 * 3. 返回静态壳 + 动态 slot 列表，供 StreamingSlot 流式填充
 *
 * @param route 路由路径
 *
 * @example
 * ```tsx
 * const { shell, dynamicSlots, staticData } = usePartialPreRender('/dashboard');
 * if (!shell) return <FullPageSkeleton />;
 * return (
 *   <StaticShell route="/dashboard">
 *     {shell}
 *     {dynamicSlots.includes('stats') && (
 *       <StreamingSlot name="stats" fallback={<Skeleton />}>
 *         <Stats initialData={staticData['dashboard-stats']} />
 *       </StreamingSlot>
 *     )}
 *   </StaticShell>
 * );
 * ```
 */
export function usePartialPreRender(route: string): UsePartialPreRenderResult {
  const [ready, setReady] = useState(false);
  const [staticData, setStaticData] = useState<Record<string, unknown>>({});

  const config = routeShellRegistry.get(route);

  useEffect(() => {
    setReady(false);
    if (!config) {
      setReady(true);
      return;
    }

    // 从 SSR 注入数据中读取静态壳数据
    const data: Record<string, unknown> = {};
    for (const key of config.staticDataKeys ?? []) {
      const value = readSSRData(key);
      if (value !== undefined) {
        data[key] = value;
      }
    }
    setStaticData(data);
    setReady(true);
    pprLogger.debug(`路由 ${route} 静态壳就绪，${Object.keys(data).length} 条静态数据`);
  }, [route, config]);

  return {
    ready,
    shell: config?.render() ?? null,
    dynamicSlots: config?.dynamicSlots ?? [],
    staticData,
    registered: !!config,
  };
}

// ==================== prefetchRouteShell ====================

/**
 * 预取路由静态壳
 *
 * 在路由切换前（如 hover 导航链接）预取静态壳数据，
 * 让目标路由的首屏直接命中缓存，避免 Suspense fallback 闪烁。
 *
 * @param route 路由路径
 * @returns 是否预取成功
 */
export function prefetchRouteShell(route: string): boolean {
  if (prefetchedShells.get(route)) {
    return true;
  }

  const config = routeShellRegistry.get(route);
  if (!config) {
    pprLogger.warn(`预取失败：路由 ${route} 未注册静态壳`);
    return false;
  }

  // 标记为已预取（实际数据预取由 usePrefetchBffSuspenseQuery 或路由 loader 完成）
  prefetchedShells.set(route, true);
  pprLogger.debug(`预取路由 ${route} 静态壳`);

  // 触发静态壳渲染（提前创建 React 元素，触发可能的 lazy import）
  try {
    config.render();
  } catch (e) {
    pprLogger.warn(`预取路由 ${route} 静态壳渲染失败:`, e);
    prefetchedShells.delete(route);
    return false;
  }

  return true;
}

/**
 * 清除预取缓存（测试 / 路由卸载时使用）
 */
export function clearPrefetchedShells(): void {
  prefetchedShells.clear();
}

// ==================== StaticShell ====================

/** StaticShell Props */
export interface StaticShellProps {
  children: ReactNode;
  /** 路由路径（用于追踪） */
  route?: string;
  /** 是否立即显示（默认 true；false 时等待 ready 信号） */
  immediate?: boolean;
}

/**
 * 静态壳组件
 *
 * 包裹静态内容，确保静态壳在动态内容加载前立即可见。
 * 配合 SSR 注入数据，可实现首屏无闪烁的静态壳展示。
 *
 * @example
 * ```tsx
 * <StaticShell route="/dashboard">
 *   <Layout />
 *   <StreamingSlot name="stats"><Stats /></StreamingSlot>
 * </StaticShell>
 * ```
 */
export const StaticShell: React.FC<StaticShellProps> = ({ children, route, immediate = true }) => {
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (route) {
      pprLogger.debug(
        `静态壳挂载: ${route} (${Date.now() - mountedAt.current}ms)`
      );
    }
  }, [route]);

  if (!immediate) {
    return (
      <Box sx={{ visibility: 'hidden' }}>
        {children}
      </Box>
    );
  }

  return <>{children}</>;
};

// ==================== StreamingSlot ====================

/** StreamingSlot Props */
export interface StreamingSlotProps {
  children: ReactNode;
  /** slot 名称（对应路由配置的 dynamicSlots） */
  name: string;
  /** 加载回退（Suspense fallback） */
  fallback?: ReactNode;
  /** slot 优先级（用于流式替换顺序，数字越小越优先） */
  priority?: number;
  /** 是否在视口可见时才加载（IntersectionObserver），默认 false */
  lazy?: boolean;
  /** 自定义最小高度（px），默认 100 */
  minHeight?: number;
  /** 数据就绪回调（流式替换完成时触发） */
  onReady?: () => void;
}

/**
 * 默认流式占位骨架
 */
const DefaultSlotFallback: React.FC<{ minHeight: number }> = ({ minHeight }) => (
  <Box sx={{ width: '100%', minHeight }}>
    <Stack spacing={1}>
      <Skeleton
        variant='rectangular'
        height={minHeight / 3}
      />
      <Skeleton
        variant='rectangular'
        height={minHeight / 3}
      />
      <Skeleton
        variant='rectangular'
        height={minHeight / 3}
      />
    </Stack>
  </Box>
);

/**
 * 动态内容流式占位组件
 *
 * PPR 工作流的核心组件：
 * 1. 首次渲染展示 fallback（骨架屏）
 * 2. 客户端水合后，内部用 Suspense 加载真实数据
 * 3. 数据就绪后流式替换 fallback
 *
 * 支持 lazy 模式（视口可见时才加载），减少首屏不必要的请求。
 *
 * @example
 * ```tsx
 * <StreamingSlot
 *   name="stats"
 *   fallback={<Skeleton variant="rectangular" height={200} />}
 *   priority={1}
 * >
 *   <Stats />
 * </StreamingSlot>
 *
 * <StreamingSlot name="comments" lazy priority={3}>
 *   <Comments />
 * </StreamingSlot>
 * ```
 */
export const StreamingSlot: React.FC<StreamingSlotProps> = ({
  children,
  name,
  fallback,
  priority = 2,
  lazy = false,
  minHeight = 100,
  onReady,
}) => {
  const [visible, setVisible] = useState(!lazy);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 视口可见时加载
  useEffect(() => {
    if (!lazy || visible) return;

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [lazy, visible]);

  const handleReady = useCallback(() => {
    if (!loaded) {
      setLoaded(true);
      onReady?.();
    }
  }, [loaded, onReady]);

  const slotFallback = fallback ?? <DefaultSlotFallback minHeight={minHeight} />;

  return (
    <Box
      ref={ref}
      data-streaming-slot={name}
      data-slot-priority={priority}
      data-slot-loaded={loaded ? 'true' : 'false'}
      sx={{ width: '100%' }}
    >
      {visible ? (
        <Suspense
          fallback={slotFallback}
          name={`slot-${name}`}
        >
          <SlotReadyWrapper onReady={handleReady}>{children}</SlotReadyWrapper>
        </Suspense>
      ) : (
        slotFallback
      )}
    </Box>
  );
};

/**
 * 内部组件：在 children 挂载后触发 onReady 回调
 */
const SlotReadyWrapper: React.FC<{ children: ReactNode; onReady: () => void }> = ({
  children,
  onReady,
}) => {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return <>{children}</>;
};

// ==================== PPR 统计 ====================

/** PPR slot 状态记录 */
export interface PPRSlotRecord {
  name: string;
  route?: string;
  priority: number;
  loaded: boolean;
  duration: number | null;
  mountedAt: number;
}

const pprSlotListeners = new Set<() => void>();
const pprSlotRecords: PPRSlotRecord[] = [];
const MAX_PPR_RECORDS = 100;

function notifyPPRListeners(): void {
  pprSlotListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      pprLogger.error('PPR 统计监听器执行失败:', e);
    }
  });
}

/**
 * 记录 PPR slot 状态（供 PerformancePanel 统计）
 */
export function recordPPRSlot(record: PPRSlotRecord): void {
  pprSlotRecords.unshift(record);
  if (pprSlotRecords.length > MAX_PPR_RECORDS) {
    pprSlotRecords.pop();
  }
  notifyPPRListeners();
}

/**
 * 获取 PPR slot 统计
 */
export function getPPRStats(): {
  records: PPRSlotRecord[];
  totalSlots: number;
  loadedSlots: number;
  pendingSlots: number;
  avgLoadDuration: number;
} {
  const loaded = pprSlotRecords.filter((r) => r.loaded && r.duration !== null);
  const pending = pprSlotRecords.filter((r) => !r.loaded);
  const avgLoadDuration =
    loaded.length > 0
      ? loaded.reduce((sum, r) => sum + (r.duration ?? 0), 0) / loaded.length
      : 0;
  return {
    records: [...pprSlotRecords],
    totalSlots: pprSlotRecords.length,
    loadedSlots: loaded.length,
    pendingSlots: pending.length,
    avgLoadDuration,
  };
}

/**
 * 订阅 PPR 统计变化
 * @returns 取消订阅函数
 */
export function onPPRStatsChange(callback: () => void): () => void {
  pprSlotListeners.add(callback);
  return () => {
    pprSlotListeners.delete(callback);
  };
}

export default usePartialPreRender;
