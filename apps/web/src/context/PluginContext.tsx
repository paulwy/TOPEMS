import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Plugin, TenantInstalledPlugin } from '@/api/plugin';
import { checkAllPluginsHealth, pluginApi } from '@/api/plugin';
import { useAuth } from '@/hooks/useAuth';
import { deploymentConfig } from '@/config/deployment';
import createLogger from '@/utils/logger';
import { pluginManager } from '@/lib/plugin-loader/PluginManager';

const logger = createLogger('PluginContext');

// 熔断常量：组件外声明避免 React Hook deps 告警
const FAILURE_THRESHOLD = 2; // 连续 2 次同类失败即停止轮询
const TRANSIENT_STATUS = new Set([404, 502, 503]);

interface PluginContextType {
  installedPlugins: TenantInstalledPlugin[];
  pluginHealth: Record<string, { healthy: boolean; status?: string; latency?: number }>;
  availablePlugins: Plugin[];
  isLoading: boolean;
  refreshPlugins: () => void;
  installPlugin: (code: string) => Promise<void>;
  uninstallPlugin: (code: string) => Promise<void>;
  enablePlugin: (code: string) => Promise<void>;
  disablePlugin: (code: string) => Promise<void>;
  isPluginInstalled: (code: string) => boolean;
  isPluginActive: (code: string) => boolean;
  isPluginHealthy: (code: string) => boolean;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
};

interface PluginProviderProps {
  children: ReactNode;
}

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [installedPlugins, setInstalledPlugins] = useState<TenantInstalledPlugin[]>([]);
  const [pluginHealth, setPluginHealth] = useState<
    Record<string, { healthy: boolean; status?: string; latency?: number }>
  >({});
  const [availablePlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const initializedRef = useRef(false);
  // 服务未就绪熔断：连续 N 次 404/502/503 后暂停轮询
  const consecutiveFailuresRef = useRef(0);
  const pollingCancelledRef = useRef(false);

  const fetchPlugins = useCallback(async () => {
    if (!isAuthenticated || pollingCancelledRef.current) {
      setIsLoading(false);
      return;
    }
    // 部署配置显式禁用插件服务时，跳过所有 API 请求
    if (!deploymentConfig.features.pluginServiceEnabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const promises = [checkAllPluginsHealth(), pluginApi.listInstalled()] as const;

      const [healthRes, installedRes] = await Promise.all(promises);

      setPluginHealth(healthRes);

      if (installedRes?.success && installedRes?.data) {
        setInstalledPlugins(installedRes.data);
        // 同步 PluginManager：它内部会 fetch + process 已安装插件并触发 syncNavigationRegistry，
        // 把已激活插件作为新模块动态注册到 Sidebar（专业模块分组）。
        try {
          await pluginManager.refreshPlugins();
        } catch (err) {
          logger.debug('PluginManager refresh failed, will retry:', err);
        }
      }
      consecutiveFailuresRef.current = 0;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      // 401=未登录, 404=插件模块后端未就绪, 502/503=服务离线 均为预期场景，
      // 降级为 debug，避免 demo 环境控制台 ERROR 刷屏
      if (status === 401 || status === 404 || status === 502 || status === 503) {
        logger.debug(`Plugin fetch skipped: status=${status}`);
      } else {
        logger.error('Failed to fetch plugins:', error);
      }
      if (status && TRANSIENT_STATUS.has(status)) {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= FAILURE_THRESHOLD) {
          pollingCancelledRef.current = true;
          logger.debug(
            `Plugin polling suspended after ${FAILURE_THRESHOLD} transient failures (status=${status}). Refresh page to retry.`
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) {
      return;
    }

    const scheduleFetch = () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (
          window as unknown as {
            requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
          }
        ).requestIdleCallback(
          () => {
            fetchPlugins();
          },
          { timeout: 5000 }
        );
      } else {
        setTimeout(() => {
          fetchPlugins();
        }, 2000);
      }
    };

    if (document.readyState === 'complete') {
      scheduleFetch();
    } else {
      window.addEventListener('load', scheduleFetch, { once: true });
      return () => window.removeEventListener('load', scheduleFetch);
    }

    const interval = setInterval(() => {
      // 熔断期间不再发起请求，也不清除 interval（保持句柄统一管理，成本低）
      if (!pollingCancelledRef.current) {
        fetchPlugins();
      }
    }, 30000);
    initializedRef.current = true;

    return () => {
      clearInterval(interval);
      consecutiveFailuresRef.current = 0;
      pollingCancelledRef.current = false;
    };
  }, [isAuthenticated, fetchPlugins]);

  const installPlugin = useCallback(
    async (code: string) => {
      await pluginApi.install(code);
      await fetchPlugins();
    },
    [fetchPlugins]
  );

  const uninstallPlugin = useCallback(
    async (code: string) => {
      await pluginApi.uninstall(code);
      await fetchPlugins();
    },
    [fetchPlugins]
  );

  const enablePlugin = useCallback(
    async (code: string) => {
      await pluginApi.enable(code);
      await fetchPlugins();
    },
    [fetchPlugins]
  );

  const disablePlugin = useCallback(
    async (code: string) => {
      await pluginApi.disable(code);
      await fetchPlugins();
    },
    [fetchPlugins]
  );

  const isPluginInstalled = useCallback(
    (code: string) => {
      return installedPlugins.some((p) => p.plugin_code === code);
    },
    [installedPlugins]
  );

  const isPluginActive = useCallback(
    (code: string) => {
      const plugin = installedPlugins.find((p) => p.plugin_code === code);
      return plugin?.isactive ?? false;
    },
    [installedPlugins]
  );

  const isPluginHealthy = useCallback(
    (code: string) => {
      return pluginHealth[code]?.healthy ?? false;
    },
    [pluginHealth]
  );

  return (
    <PluginContext.Provider
      value={{
        installedPlugins,
        pluginHealth,
        availablePlugins,
        isLoading,
        refreshPlugins: fetchPlugins,
        installPlugin,
        uninstallPlugin,
        enablePlugin,
        disablePlugin,
        isPluginInstalled,
        isPluginActive,
        isPluginHealthy,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};
