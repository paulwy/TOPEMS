import type { ReactNode } from 'react';
import React, { Component, Suspense, lazy, useEffect, useRef } from 'react';
import { Box, CircularProgress, Typography, Button, LinearProgress } from '@mui/material';
import { AlertTriangle as ErrorIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import { logger } from '@/utils/logger';
import { microFrontendPerf } from './performance';
import { versionManager } from './version-manager';
import { canaryRelease } from './canary-release';
import { modulePerformanceMetrics, errorTracker, userBehaviorAnalytics } from './observability';
import i18n from '@/i18n';
// V42.0: 沙箱管理器（可选启用）
import { sandboxManager, type SandboxBundle } from './sandbox/sandbox-manager';

/**
 * 远程模块加载状态
 */
interface RemoteLoaderState {
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * 远程模块错误边界
 */
class RemoteErrorBoundary extends Component<
  { children: ReactNode; moduleName: string; onError?: (error: Error) => void },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(
      `${i18n.t('microfrontend.remote_loader.k0')}${this.props.moduleName}${i18n.t('microfrontend.remote_loader.k1')}`,
      error,
      errorInfo
    );
    errorTracker.captureError(error, {
      moduleId: this.props.moduleName,
      extra: { errorInfo },
    });
    this.props.onError?.(error);
  }

  handleRetry = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            gap: 2,
          }}
        >
          <ErrorIcon
            color='error'
            style={{ width: 48, height: 48 }}
          />
          <Typography
            variant='h6'
            color='error'
          >
            {i18n.t('microfrontend.remote_loader.k0')} {this.props.moduleName}{' '}
            {i18n.t('microfrontend.remote_loader.k1')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {this.state.error.message}
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            variant='contained'
            onClick={this.handleRetry}
          >
            {i18n.t('microfrontend.remote_loader.k0')}
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * 加载中占位组件（V36.0: 带可视化进度条）
 */
const LoadingFallback: React.FC<{ moduleName: string }> = ({ moduleName }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      gap: 2,
    }}
  >
    <CircularProgress />
    <Typography
      variant='body2'
      color='text.secondary'
    >
      {i18n.t('microfrontend.remote_loader.k2')} {moduleName}...
    </Typography>
    {/* V36.0: 可视化加载进度条 */}
    <Box sx={{ width: '60%', maxWidth: 300 }}>
      <LinearProgress />
    </Box>
  </Box>
);

/**
 * RemoteLoader 属性
 */
export interface RemoteLoaderProps {
  /** 远程模块名（如 'topems_erp'） */
  moduleName: string;
  /** 远程模块导出的组件名（如 './ErpApp'） */
  component: string;
  /** 传递给远程组件的 props */
  props?: Record<string, unknown>;
  /** 加载失败回调 */
  onError?: (error: Error) => void;
  /** 自定义加载占位 */
  fallback?: React.ReactNode;
  /** V42.0: 是否启用沙箱隔离（默认 false，保持向后兼容） */
  useSandbox?: boolean;
  /** V42.0: 沙箱配置（仅当 useSandbox=true 时生效） */
  sandboxOptions?: {
    /** 启用 JS 沙箱 */
    js?: boolean;
    /** 样式隔离模式 */
    style?: 'shadow' | 'scoped' | 'css_modules' | 'none';
    /** 启用事件隔离 */
    events?: boolean;
  };
}

/**
 * 远程模块加载器
 *
 * 使用 React.lazy 动态加载远程模块，配合 ErrorBoundary 提供错误恢复。
 *
 * V42.0: 新增 useSandbox 选项，启用后自动创建沙箱隔离（JS + 样式 + 事件），
 * 卸载时自动销毁沙箱，清理事件/定时器/样式/全局变量。默认不启用，保持向后兼容。
 *
 * @example
 * // 基础用法（无沙箱，向后兼容）
 * <RemoteLoader moduleName="topems_erp" component="./ErpApp" />
 *
 * @example
 * // V42.0: 启用沙箱隔离
 * <RemoteLoader
 *   moduleName="topems_erp"
 *   component="./ErpApp"
 *   useSandbox
 *   sandboxOptions={{ js: true, style: 'scoped', events: true }}
 * />
 */
export const RemoteLoader: React.FC<RemoteLoaderProps> = ({
  moduleName,
  component,
  props,
  onError,
  fallback,
  useSandbox = false,
  sandboxOptions,
}) => {
  const startTimeRef = useRef<number>(performance.now());
  const renderTimeRef = useRef<number>(0);
  const moduleId = `${moduleName}/${component}`;
  const sandboxId = `remote-${moduleName}`;
  const sandboxBundleRef = useRef<SandboxBundle | null>(null);

  React.useEffect(() => {
    modulePerformanceMetrics.recordNavigationStart(moduleId);
    if (typeof window !== 'undefined' && window.location) {
      userBehaviorAnalytics.trackModuleVisit(moduleName, window.location.pathname);
    }
    errorTracker.setModuleErrorContext(moduleName, {
      moduleId: moduleName,
      componentName: component,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      extra: { sandboxed: useSandbox },
    });

    // V42.0: 启用沙箱时创建 SandboxBundle
    if (useSandbox) {
      const opts = sandboxOptions ?? {};
      const bundle = sandboxManager.createSandbox(sandboxId, {
        js: opts.js ? { interceptWindow: true } : undefined,
        style:
          opts.style && opts.style !== 'none'
            ? { mode: opts.style, scopePrefix: `mf-${moduleName}` }
            : undefined,
        events: opts.events ?? true,
      });
      sandboxBundleRef.current = bundle;
      if (opts.js) bundle.jsSandbox.activate();
      if (opts.events ?? true) bundle.eventIsolation.activate();
      bundle.status = 'active';
      logger.info(
        `${i18n.t('microfrontend.remote_loader.remoteloader_2')}${moduleName}${i18n.t('microfrontend.remote_loader.k3')}`
      );
    }

    return () => {
      userBehaviorAnalytics.endModuleVisit(moduleName);
      errorTracker.clearModuleErrorContext(moduleName);
      // V42.0: 卸载时销毁沙箱
      if (useSandbox) {
        sandboxManager.destroySandbox(sandboxId);
        sandboxBundleRef.current = null;
      }
    };
  }, [moduleName, component, moduleId, useSandbox, sandboxId]);

  const LazyComponent = React.useMemo(
    () =>
      lazy(async () => {
        const loadStart = performance.now();
        try {
          // V39.0: 加载前检查模块版本并记录
          const moduleVersion = versionManager.getModuleVersion(moduleName);
          // V39.0: 检查灰度状态（若启用则记录）
          const canaryConfig = canaryRelease.getCanaryConfig(moduleName);
          const canaryStatus = canaryConfig.enabled
            ? `${i18n.t('microfrontend.remote_loader.k4')}${canaryConfig.percentage}% (${canaryConfig.canaryVersion})`
            : i18n.t('microfrontend.remote_loader.k0');
          logger.info(
            `${i18n.t('microfrontend.remote_loader.remoteloader_5')}${moduleName}/${component}${i18n.t('microfrontend.remote_loader.k6')}${moduleVersion}, ${canaryStatus})`
          );

          const module = await loadRemoteModule(moduleName, component);
          const loadEnd = performance.now();
          const moduleLoadTime = loadEnd - loadStart;

          microFrontendPerf.recordModuleLoad(moduleName, component, {
            moduleLoadTime,
            success: true,
          });

          modulePerformanceMetrics.recordModulePerformance(moduleId, {
            moduleId,
            componentName: component,
            remoteEntryLoadTime: moduleLoadTime,
            totalLoadTime: moduleLoadTime,
            success: true,
          });

          setTimeout(() => {
            modulePerformanceMetrics.collectResourceTiming(moduleId);
          }, 100);

          return { default: module.default || module };
        } catch (err) {
          console.error(
            `${i18n.t('microfrontend.remote_loader.remoteloader_7')}${moduleName}/${component}${i18n.t('microfrontend.remote_loader.k8')}`,
            err
          );
          microFrontendPerf.recordModuleLoad(moduleName, component, {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });

          const error = err instanceof Error ? err : new Error(String(err));
          errorTracker.captureError(error, {
            moduleId: moduleName,
            componentName: component,
            extra: { phase: 'load' },
          });

          modulePerformanceMetrics.recordModulePerformance(moduleId, {
            moduleId,
            componentName: component,
            success: false,
            error: error.message,
          });

          throw err;
        }
      }),
    [moduleName, component, moduleId]
  );

  useEffect(() => {
    renderTimeRef.current = performance.now() - startTimeRef.current;
    microFrontendPerf.recordModuleLoad(moduleName, component, {
      firstRenderTime: renderTimeRef.current,
      totalTime: renderTimeRef.current,
    });

    modulePerformanceMetrics.recordModulePerformance(moduleId, {
      firstScreenRenderTime: renderTimeRef.current,
      totalLoadTime: renderTimeRef.current,
    });

    modulePerformanceMetrics.observeFCP(moduleId);
    modulePerformanceMetrics.observeTTI(moduleId);
  }, [moduleName, component, moduleId]);

  return (
    <RemoteErrorBoundary
      moduleName={moduleName}
      onError={onError}
    >
      <Suspense fallback={fallback || <LoadingFallback moduleName={moduleName} />}>
        <LazyComponent {...props} />
      </Suspense>
    </RemoteErrorBoundary>
  );
};

/**
 * 动态加载远程模块
 *
 * 优先使用 module-federation 的 import动态导入，
 * 失败时尝试降级入口。
 */
async function loadRemoteModule(moduleName: string, component: string): Promise<any> {
  const entryStart = performance.now();
  const module = await import(/* @vite-ignore */ `${moduleName}/${component}`);
  const entryLoadTime = performance.now() - entryStart;

  microFrontendPerf.recordModuleLoad(moduleName, component, {
    remoteEntryLoadTime: entryLoadTime,
  });

  return module;
}

/**
 * 批量预加载远程模块
 *
 * @param moduleNames 要预加载的模块名列表
 */
export async function preloadRemoteModules(moduleNames: string[]): Promise<void> {
  const promises = moduleNames.map(async (name) => {
    try {
      // 预加载模块的所有 chunk
      await loadRemoteModule(name, './preload');
    } catch {
      // 预加载失败不阻塞主流程
      console.warn(
        `${i18n.t('microfrontend.remote_loader.k9')}${name}${i18n.t('microfrontend.remote_loader.k10')}`
      );
    }
  });
  await Promise.allSettled(promises);
}

// ==================== V35.0 Phase 7: 智能预加载策略 ====================

/** 已预加载的模块入口 URL 集合（避免重复 prefetch） */
const prefetchedEntries = new Set<string>();

/**
 * V35.0: 使用 <link rel="prefetch"> 预加载远程入口文件
 *
 * 浏览器在空闲时自动下载远程入口 JS，不阻塞主线程。
 * 当用户实际导航到该模块时，入口已缓存，加载更快。
 *
 * @param entryUrl 远程入口 URL
 */
export function prefetchRemoteEntry(entryUrl: string): void {
  // V64 防御：空 URL（static 模式）直接跳过，避免创建 <link href=""> 指向当前页面
  if (!entryUrl || entryUrl.trim() === '') return;
  if (prefetchedEntries.has(entryUrl)) return;
  prefetchedEntries.add(entryUrl);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = entryUrl;
  link.as = 'script';
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

/**
 * V35.0: 浏览器空闲时预加载远程模块入口
 *
 * 使用 requestIdleCallback 在主线程空闲时预加载非核心模块，
 * 避免与首屏渲染竞争网络带宽。
 *
 * @param entries 要预加载的远程入口 URL 列表
 * @param timeout 空闲等待超时（毫秒），默认 3000ms
 */
export function prefetchOnIdle(entries: string[], timeout = 3000): void {
  // 浏览器不支持 requestIdleCallback 时，使用 setTimeout 降级
  if (typeof window === 'undefined' || !('requestIdleCallback' in window)) {
    setTimeout(() => entries.forEach(prefetchRemoteEntry), timeout);
    return;
  }

  (window as any).requestIdleCallback(
    (deadline: IdleDeadline) => {
      // 只在浏览器确实空闲时预加载
      if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
        entries.forEach(prefetchRemoteEntry);
      }
    },
    { timeout }
  );
}

// ==================== V36.0 Phase 6: 路由级 hover 预加载 ====================

/**
 * V36.0: hover 预加载远程模块入口
 *
 * 在用户 hover 导航项时立即预加载对应的远程入口，
 * 减少点击后的加载等待时间。
 *
 * @param moduleName 远程模块名（如 'topems_erp'）
 * @param entryUrl 远程入口 URL
 */
export function prefetchOnHover(entryUrl: string): void {
  // 直接触发 prefetch，利用浏览器的最低优先级下载
  prefetchRemoteEntry(entryUrl);
}

export default RemoteLoader;
