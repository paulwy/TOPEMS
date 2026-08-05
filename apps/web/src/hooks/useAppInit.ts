import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';
import { eventBus, ModuleEvents } from '@/lib/plugin-loader/EventBus';
// V35.0 Phase 7: 微前端智能预加载
import { prefetchOnIdle } from '@/microfrontend/RemoteLoader';
import { REMOTE_MODULES } from '@/microfrontend/config';
// V37.0 Phase 7: Service Worker 离线缓存 + 智能预加载
import { prefetchRemoteEntries } from '@/lib/pwa';
// V39.0 Track F: 微前端版本管理 + 热更新 + 灰度发布
import { versionManager } from '@/microfrontend/version-manager';
import { canaryRelease } from '@/microfrontend/canary-release';
// V40.0 Track F: 微前端可观测性
import { errorTracker, userBehaviorAnalytics } from '@/microfrontend/observability';

/**
 * 应用全局状态初始化 Hook
 *
 * 集中管理应用启动期间的副作用：
 * - 错误追踪与用户行为分析（V40.0）
 * - 动态模块加载事件监听
 * - 远程模块入口预加载（V35.0 / V37.0）
 * - 微前端版本管理与灰度发布（V39.0）
 *
 * 必须在 AuthProvider 内部调用，因为部分副作用依赖 isAuthenticated。
 */
export const useAppInit = (): void => {
  const { isAuthenticated } = useAuth();

  // V40.0 Track F: 启动错误追踪 + 用户行为分析
  useEffect(() => {
    errorTracker.loadFromStorage();
    userBehaviorAnalytics.loadFromStorage();
    errorTracker.startErrorTracking();

    return () => {
      errorTracker.stopErrorTracking();
    };
  }, []);

  // 监听动态模块加载事件
  useEffect(() => {
    const handleModuleLoaded = (data: { moduleId: string; path: string }) => {
      logger.info(`[Dynamic Router] Module loaded: ${data.moduleId}`);
    };

    const handleModuleError = (data: { moduleId: string; error: Error }) => {
      logger.error(`[Dynamic Router] Module load error: ${data.moduleId}`, data.error);
    };

    eventBus.on(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
    eventBus.on(ModuleEvents.MODULE_ERROR, handleModuleError);

    return () => {
      eventBus.off(ModuleEvents.MODULE_LOADED, handleModuleLoaded);
      eventBus.off(ModuleEvents.MODULE_ERROR, handleModuleError);
    };
  }, []);

  // V35.0 Phase 7: 用户认证后，浏览器空闲时预加载非核心模块的远程入口
  // V37.0 Phase 7: 同时预缓存远程模块入口到 Service Worker
  // V64 防御：static 模式下 entry 为空字符串，必须过滤掉，
  // 否则会对空字符串执行 prefetch（等同请求当前页面），产生不必要的网络开销
  useEffect(() => {
    if (!isAuthenticated) return;
    const lazyEntries = REMOTE_MODULES.filter(
      (m) => !m.isCore && m.entry && m.entry.trim() !== ''
    ).map((m) => m.entry);
    if (lazyEntries.length > 0) {
      prefetchOnIdle(lazyEntries);
      // V37.0: 预缓存远程入口到 Service Worker（离线可用）
      prefetchRemoteEntries(lazyEntries);
    }
  }, [isAuthenticated]);

  // V39.0 Track F: 启动微前端版本管理 + 灰度配置同步
  // 用户认证后启动定时版本检查（5 分钟一次）+ 灰度配置服务端同步（2 分钟一次）
  useEffect(() => {
    if (!isAuthenticated) return;

    // 初始化版本管理器
    versionManager.init();

    // 注册版本更新回调：当检测到新版本（prompt 策略）时记录日志
    const unsubscribeVersion = versionManager.onVersionUpdate((event) => {
      logger.info(
        `[App] 版本更新通知: ${event.moduleId} ${event.oldVersion} → ${event.newVersion} (策略: ${event.strategy})`
      );
    });

    // 启动定时版本检查（5 分钟一次，首次延迟 30 秒）
    versionManager.startAutoCheck(5 * 60 * 1000);

    // 初始化灰度发布管理器
    canaryRelease.init();

    // 启动灰度配置服务端同步（2 分钟一次）
    canaryRelease.startServerSync(2 * 60 * 1000);

    return () => {
      unsubscribeVersion();
      versionManager.stopAutoCheck();
      canaryRelease.stopServerSync();
    };
  }, [isAuthenticated]);
};
