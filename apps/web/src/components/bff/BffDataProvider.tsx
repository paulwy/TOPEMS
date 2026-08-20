/**
 * V39.0 Track D: BFF 数据 Context Provider
 *
 * 将 BFF 聚合数据、实时连接状态、缓存版本等信息通过 Context 提供给子组件，
 * 避免每个组件各自发起 BFF 查询，统一数据出口。
 *
 * 集成内容：
 * - useBffDashboard: 一次 GraphQL 查询聚合仪表盘全部数据（stats/todos/services/moduleStats/federatedServices）
 * - getCacheVersion + startCacheVersionPolling: 缓存版本轮询，版本变化时自动失效 React Query 缓存
 * - getSubscriptionStats: WebSocket 连接数 + 活跃订阅数
 * - subscribeServiceHealthWithRetry: 服务健康实时订阅
 *
 * @example
 * ```tsx
 * <BffDataProvider>
 *   <App />
 * </BffDataProvider>
 *
 * // 子组件中消费
 * const { dashboard, wsStatus, cacheVersion } = useBffData();
 * ```
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import i18n from '@/i18n';
import { useQueryClient } from '@tanstack/react-query';
import {
  getCacheVersion,
  startCacheVersionPolling,
  getSubscriptionStats,
  subscribeServiceHealthWithRetry,
} from '@/api/bff';
import { useBffDashboard, type BffDashboardData } from '@/hooks/bff/useBffDashboard';
import type { SubscriptionStatus } from '@/hooks/bff/useBffSubscription';

/** 服务健康条目 */
interface ServiceHealthEntry {
  service: string;
  healthy: boolean;
  url: string;
}

/** BFF Context 提供的数据 */
interface BffDataContextValue {
  /** 仪表盘聚合数据 */
  dashboard: BffDashboardData | undefined;
  /** 仪表盘加载中 */
  dashboardLoading: boolean;
  /** 仪表盘错误 */
  dashboardError: string | null;
  /** 手动刷新仪表盘 */
  refreshDashboard: () => void;
  /** WebSocket 连接状态 */
  wsStatus: SubscriptionStatus;
  /** WebSocket 是否已连接 */
  wsConnected: boolean;
  /** 活跃 WebSocket 连接数 */
  wsConnections: number;
  /** 活跃订阅数 */
  activeSubscriptions: number;
  /** 当前缓存版本号 */
  cacheVersion: number;
  /** 服务健康实时状态（按服务名索引） */
  serviceHealth: Record<string, ServiceHealthEntry>;
  /** 手动刷新订阅统计 */
  refreshStats: () => void;
}

const BffDataContext = createContext<BffDataContextValue | undefined>(undefined);

/** BffDataProvider Props */
interface BffDataProviderProps {
  children: ReactNode;
  /** 是否启用仪表盘自动查询，默认 true */
  enableDashboard?: boolean;
  /** 是否启用缓存版本轮询，默认 true */
  enableCachePolling?: boolean;
  /** 是否启用服务健康订阅，默认 true */
  enableHealthSubscription?: boolean;
}

/**
 * BFF 数据 Context Provider 组件
 */
export const BffDataProvider: React.FC<BffDataProviderProps> = ({
  children,
  enableDashboard = true,
  enableCachePolling = true,
  enableHealthSubscription = true,
}) => {
  const queryClient = useQueryClient();

  // ---- 仪表盘聚合查询 ----
  const {
    data: dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useBffDashboard({ enabled: enableDashboard });

  // ---- WebSocket 连接状态 ----
  const [wsStatus, setWsStatus] = useState<SubscriptionStatus>('disconnected');
  const [wsConnections, setWsConnections] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);

  // ---- 缓存版本 ----
  const [cacheVersion, setCacheVersion] = useState(0);

  // ---- 服务健康实时状态 ----
  const [serviceHealth, setServiceHealth] = useState<Record<string, ServiceHealthEntry>>({});

  // ---- 订阅统计刷新 ----
  const refreshStats = useCallback(async () => {
    try {
      const stats = await getSubscriptionStats();
      setWsConnections(stats.ws_connections);
      setActiveSubscriptions(stats.active_subscriptions);
    } catch {
      // 忽略统计获取失败
    }
  }, []);

  // ---- 缓存版本轮询 ----
  useEffect(() => {
    if (!enableCachePolling) return;

    // 获取初始版本号
    getCacheVersion()
      .then(setCacheVersion)
      .catch(() => {});

    const stop = startCacheVersionPolling(() => {
      // 缓存版本变化时：更新版本号 + 失效全部 React Query 缓存
      getCacheVersion()
        .then(setCacheVersion)
        .catch(() => {});
      queryClient.invalidateQueries();
    });

    // 定期刷新订阅统计
    refreshStats();
    const statsTimer = setInterval(refreshStats, 30_000);

    return () => {
      stop();
      clearInterval(statsTimer);
    };
  }, [enableCachePolling, queryClient, refreshStats]);

  // ---- 服务健康实时订阅 ----
  const healthSubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enableHealthSubscription) return;

    healthSubRef.current = subscribeServiceHealthWithRetry(
      (health) => {
        setServiceHealth((prev) => ({
          ...prev,
          [health.service]: {
            service: health.service,
            healthy: health.healthy,
            url: health.url,
          },
        }));
      },
      (status) => {
        setWsStatus(status);
      }
    );

    return () => {
      healthSubRef.current?.();
      healthSubRef.current = null;
    };
  }, [enableHealthSubscription]);

  const value: BffDataContextValue = {
    dashboard,
    dashboardLoading,
    dashboardError,
    refreshDashboard,
    wsStatus,
    wsConnected: wsStatus === 'connected',
    wsConnections,
    activeSubscriptions,
    cacheVersion,
    serviceHealth,
    refreshStats,
  };

  return <BffDataContext.Provider value={value}>{children}</BffDataContext.Provider>;
};

/**
 * 消费 BFF 数据 Context 的 hook
 *
 * 必须在 BffDataProvider 内部使用。
 */
export function useBffData(): BffDataContextValue {
  const ctx = useContext(BffDataContext);
  if (!ctx) {
    throw new Error(i18n.t('components.bff_data_provider.k0'));
  }
  return ctx;
}

export default BffDataProvider;
