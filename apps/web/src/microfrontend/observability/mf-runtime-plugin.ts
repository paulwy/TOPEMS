/**
 * V217 MF 运行时可观测性埋点插件
 *
 * 通过 @module-federation/runtime 的 registerGlobalPlugins API
 * 注册 ModuleFederationRuntimePlugin，在以下生命周期钩子中埋点：
 *
 * - errorLoadShare:    共享依赖加载失败（loadShare failure stack）
 * - errorLoadRemote:   远程模块加载失败（chunk 404、入口错误等）
 * - loadEntryError:    远程入口加载失败（recoverable hook）
 * - afterLoadEntry:    入口加载完成（含 error/recovered 字段）
 * - afterLoadRemote:   远程模块加载完成（含 error/recovered 字段）
 * - fetch:             拦截 MF 发起的网络请求（Content-Type 检测）
 * - createScript:      脚本标签创建追踪（URL 记录）
 * - beforeLoadShare:   共享依赖加载前（计时起点）
 * - afterLoadShare:    共享依赖加载后（计时终点）
 * - beforeRequest:     远程请求前（计时起点）
 *
 * 错误被分类后路由到：
 * - errorTracker.captureError()  → 持久化 + 去重 + 统计
 * - logger.error()               → 控制台结构化日志
 * - useNotificationStore          → 全局 Toast 实时告警
 */

import type { ModuleFederationRuntimePlugin } from '@module-federation/runtime';
import { registerGlobalPlugins } from '@module-federation/runtime';
import { logger } from '@/utils/logger';
import { errorTracker } from './error-tracker';
import { useNotificationStore } from '@/store/notificationStore';
import {
  classifyMFError,
  getUserMessage,
  shouldShowToast,
  shouldSuppressToast,
  type MFErrorEvent,
} from './mf-error-classifier';
import i18n from '@/i18n';

const MAX_EVENTS = 200;
let initialized = false;
let recentEvents: MFErrorEvent[] = [];
let loadTimings: Map<string, number> = new Map();

function recordEvent(event: MFErrorEvent): void {
  recentEvents.push(event);
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents = recentEvents.slice(-MAX_EVENTS);
  }
}

function routeToErrorTracker(event: MFErrorEvent): void {
  const error = new Error(event.errorMessage);
  error.name = `MF_${event.type}`;
  if (event.errorStack) error.stack = event.errorStack;

  errorTracker.captureError(error, {
    moduleId: event.moduleName,
    componentName: event.expose,
    url: event.chunkUrl,
    extra: {
      mfErrorType: event.type,
      severity: event.severity,
      httpStatus: event.httpStatus,
      contentType: event.contentType,
      lifecycle: event.lifecycle,
      recovered: event.recovered,
      timestamp: event.timestamp,
    },
  });
}

function routeToToast(event: MFErrorEvent): void {
  if (!shouldShowToast(event)) return;
  if (shouldSuppressToast(event, recentEvents)) return;

  try {
    useNotificationStore.getState().addNotification({
      title: event.severity === 'critical' ? i18n.t('microfrontend.mf-runtime-plugin.k1') : i18n.t('microfrontend.mf-runtime-plugin.k0'),
      message: getUserMessage(event),
      type: event.severity === 'critical' ? 'error' : 'warning',
      duration: event.severity === 'critical' ? 0 : 8000,
    });
  } catch {
    // notificationStore may not be available during SSR or early init
  }
}

function handleMFError(params: {
  error?: unknown;
  remoteInfo?: { name?: string; alias?: string; entry?: string } | null;
  expose?: string;
  lifecycle: string;
  recovered?: boolean;
  pkgName?: string;
}): void {
  const event = classifyMFError(params);
  recordEvent(event);

  logger.error(
    `[MF-Observability] ${event.type} | ${event.moduleName}${event.expose ? `/${event.expose}` : ''} | ${event.errorMessage}`,
    {
      type: event.type,
      severity: event.severity,
      chunkUrl: event.chunkUrl,
      httpStatus: event.httpStatus,
      contentType: event.contentType,
      recovered: event.recovered,
      lifecycle: event.lifecycle,
    }
  );

  routeToErrorTracker(event);
  routeToToast(event);
}

/**
 * MF 运行时可观测性插件
 */
const mfObservabilityPlugin: ModuleFederationRuntimePlugin = {
  name: 'topems-mf-observability',
  version: '1.0.0',

  // ==================== Remote Handler Hooks ====================

  errorLoadRemote: async (ctx) => {
    handleMFError({
      error: ctx.error,
      remoteInfo: ctx.remote,
      expose: ctx.expose,
      lifecycle: `errorLoadRemote:${ctx.lifecycle}`,
      recovered: false,
    });
    return undefined;
  },

  afterLoadRemote: async (ctx) => {
    if (ctx.error && !ctx.recovered) {
      handleMFError({
        error: ctx.error,
        remoteInfo: ctx.remote,
        expose: ctx.expose,
        lifecycle: 'afterLoadRemote',
        recovered: ctx.recovered,
      });
    }
    return undefined;
  },

  beforeRequest: async (ctx) => {
    const key = `remote:${ctx.id}`;
    loadTimings.set(key, performance.now());
    logger.debug(`[MF-Observability] beforeRequest: ${ctx.id}`);
    return ctx;
  },

  // ==================== Loader Hooks ====================

  loadEntryError: async (ctx) => {
    handleMFError({
      error: ctx,
      remoteInfo: ctx.remoteInfo,
      lifecycle: 'loadEntryError',
      recovered: false,
    });
    return undefined;
  },

  afterLoadEntry: async (ctx) => {
    if (ctx.error && !ctx.recovered) {
      handleMFError({
        error: ctx.error,
        remoteInfo: ctx.remoteInfo,
        lifecycle: 'afterLoadEntry',
        recovered: ctx.recovered,
      });
    }
    return undefined;
  },

  createScript: (ctx) => {
    logger.debug(
      `[MF-Observability] createScript: ${ctx.remoteInfo?.name ?? 'unknown'} → ${ctx.url}`
    );
    return undefined;
  },

  fetch: async (url: string, _init: RequestInit, remoteInfo?: any) => {
    logger.debug(
      `[MF-Observability] fetch: ${remoteInfo?.name ?? 'unknown'} → ${url}`
    );

    // 拦截 MF 发起的 fetch 请求，检测 Content-Type 异常
    try {
      const response = await fetch(url, _init);
      if (!response.ok) {
        handleMFError({
          error: new Error(`HTTP ${response.status}: ${url}`),
          remoteInfo,
          lifecycle: 'fetch',
          recovered: false,
        });
      }
      const contentType = response.headers.get('content-type') || '';
      if (
        response.ok &&
        contentType &&
        !contentType.includes('javascript') &&
        !contentType.includes('text/plain') &&
        !contentType.includes('application/json') &&
        !contentType.includes('text/css')
      ) {
        handleMFError({
          error: new Error(`Unexpected Content-Type "${contentType}" for ${url}`),
          remoteInfo,
          lifecycle: 'fetch:content-type',
          recovered: false,
        });
      }
      return response;
    } catch (err) {
      handleMFError({
        error: err,
        remoteInfo,
        lifecycle: 'fetch:network',
        recovered: false,
      });
      throw err;
    }
  },

  // ==================== Shared Handler Hooks ====================

  beforeLoadShare: async (ctx) => {
    const key = `share:${ctx.pkgName}`;
    loadTimings.set(key, performance.now());
    return ctx;
  },

  afterLoadShare: (ctx) => {
    const key = `share:${ctx.pkgName}`;
    const start = loadTimings.get(key);
    if (start) {
      const duration = performance.now() - start;
      loadTimings.delete(key);
      logger.debug(
        `[MF-Observability] loadShare: ${ctx.pkgName} → ${duration.toFixed(2)}ms`
      );
    }
  },

  errorLoadShare: (ctx) => {
    handleMFError({
      error: ctx.error,
      pkgName: ctx.pkgName,
      lifecycle: `errorLoadShare:${ctx.lifecycle}`,
      recovered: ctx.recovered,
    });
  },

  // ==================== Core Lifecycle Hooks ====================

  beforeInitContainer: async (ctx) => {
    logger.debug(
      `[MF-Observability] beforeInitContainer: ${ctx.remoteInfo.name}`
    );
    return ctx;
  },

  initContainer: async (ctx) => {
    logger.debug(
      `[MF-Observability] initContainer: ${ctx.remoteInfo.name}`
    );
    return ctx;
  },

  afterInitRemote: async (ctx) => {
    if (ctx.error && !ctx.cached) {
      handleMFError({
        error: ctx.error,
        remoteInfo: ctx.remoteInfo,
        lifecycle: 'afterInitRemote',
        recovered: false,
      });
    }
    return undefined;
  },

  afterExecuteFactory: async (ctx) => {
    if (ctx.error) {
      handleMFError({
        error: ctx.error,
        remoteInfo: ctx.moduleInfo,
        expose: ctx.expose,
        lifecycle: 'afterExecuteFactory',
        recovered: false,
      });
    }
    return undefined;
  },
};

/**
 * 初始化 MF 运行时可观测性埋点
 *
 * 必须在第一个远程模块加载之前调用（通常在 main.tsx 顶部）。
 * 使用 registerGlobalPlugins 注册到全局 MF 实例，
 * 所有后续创建的 ModuleFederation 实例都会继承这些插件。
 */
export function initMFObservability(): void {
  if (initialized) {
    logger.debug(i18n.t('microfrontend.mf-runtime-plugin.k0'));
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }

  try {
    registerGlobalPlugins([mfObservabilityPlugin]);
    initialized = true;
    logger.info(i18n.t('microfrontend.mf-runtime-plugin.k1'));
  } catch (err) {
    logger.error(i18n.t('microfrontend.mf-runtime-plugin.k2'), err);
  }
}

/**
 * 获取最近的 MF 错误事件列表
 */
export function getMFErrorEvents(): MFErrorEvent[] {
  return [...recentEvents];
}

/**
 * 获取 MF 错误统计
 */
export function getMFErrorStats(): {
  total: number;
  byType: Record<string, number>;
  byModule: Record<string, number>;
  critical: number;
  recovered: number;
} {
  const byType: Record<string, number> = {};
  const byModule: Record<string, number> = {};
  let critical = 0;
  let recovered = 0;

  for (const e of recentEvents) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    byModule[e.moduleName] = (byModule[e.moduleName] || 0) + 1;
    if (e.severity === 'critical') critical++;
    if (e.recovered) recovered++;
  }

  return {
    total: recentEvents.length,
    byType,
    byModule,
    critical,
    recovered,
  };
}

/**
 * 清空 MF 错误事件记录
 */
export function clearMFErrorEvents(): void {
  recentEvents = [];
  loadTimings.clear();
}

export { mfObservabilityPlugin };
export default { initMFObservability, getMFErrorEvents, getMFErrorStats, clearMFErrorEvents };
