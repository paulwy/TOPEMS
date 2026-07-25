/**
 * V42.0 Track F: 微前端企业级 — 沙箱化远程模块加载器
 *
 * 在 RemoteLoader 基础上增加沙箱隔离:
 * - 加载模块时自动创建 SandboxBundle（JS + 样式 + 事件）
 * - 卸载模块时自动销毁沙箱（清理事件/定时器/样式/全局变量）
 * - 样式注入到 Shadow DOM（可选）
 * - 事件/定时器自动清理
 *
 * @example
 * <SandboxedRemoteLoader
 *   module="crm"
 *   url="http://localhost:3004/remoteEntry.js"
 *   expose="./CustomerList"
 *   isolation={{
 *     js: true,
 *     style: 'shadow',  // 'shadow' | 'scoped' | 'none'
 *     events: true,
 *   }}
 *   onError={(error) => console.error(error)}
 * />
 */

import type { ReactNode } from 'react';
import React, { Component, Suspense, lazy, useEffect, useRef, useMemo } from 'react';
import { Box, CircularProgress, Typography, Button, LinearProgress } from '@mui/material';
import { AlertTriangle as ErrorIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import { logger } from '@/utils/logger';
import { microFrontendPerf } from '../performance';
import { errorTracker } from '../observability';
import { sandboxManager } from './sandbox-manager';
import type { SandboxBundle } from './sandbox-manager';
import type { StyleIsolationMode } from './style-isolation';
import type { SandboxOptions } from './js-sandbox';

// ==================== 类型定义 ====================

export interface SandboxedRemoteLoaderIsolation {
  /** 是否启用 JS 沙箱（window 代理 + 全局变量隔离） */
  js?: boolean;
  /** 样式隔离模式: 'shadow' | 'scoped' | 'none' */
  style?: StyleIsolationMode | 'none';
  /** 是否启用事件隔离（事件/定时器自动清理） */
  events?: boolean;
}

export interface SandboxedRemoteLoaderProps {
  /** 模块名（用于沙箱 ID 与日志） */
  module: string;
  /** 远程入口 URL（用于预加载，实际加载通过 module federation） */
  url: string;
  /** 远程模块暴露的组件路径，如 './CustomerList' */
  expose: string;
  /** 传递给远程组件的 props */
  props?: Record<string, any>;
  /** 隔离配置 */
  isolation?: SandboxedRemoteLoaderIsolation;
  /** JS 沙箱细化配置 */
  jsSandboxOptions?: SandboxOptions;
  /** 自定义加载占位 */
  fallback?: ReactNode;
  /** 加载失败回调 */
  onError?: (error: Error) => void;
  /** 是否启用 Shadow DOM 宿主（默认 true，仅在 isolation.style === 'shadow' 时生效） */
  useShadowHost?: boolean;
}

interface LoaderState {
  loading: boolean;
  error: Error | null;
  retryCount: number;
}

// ==================== 错误边界 ====================

class SandboxedErrorBoundary extends Component<
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
      `[SandboxedRemoteLoader] 模块 ${this.props.moduleName} 加载失败:`,
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
            模块 {this.props.moduleName} 加载失败（沙箱隔离模式）
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
            重试
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

// ==================== 加载占位 ====================

const SandboxedLoadingFallback: React.FC<{ moduleName: string }> = ({ moduleName }) => (
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
      正在加载 {moduleName}（沙箱隔离中）...
    </Typography>
    <Box sx={{ width: '60%', maxWidth: 300 }}>
      <LinearProgress />
    </Box>
  </Box>
);

// ==================== SandboxedRemoteLoader ====================

export const SandboxedRemoteLoader: React.FC<SandboxedRemoteLoaderProps> = ({
  module: moduleName,
  url,
  expose,
  props,
  isolation,
  jsSandboxOptions,
  fallback,
  onError,
  useShadowHost = true,
}) => {
  const startTimeRef = useRef<number>(performance.now());
  const renderTimeRef = useRef<number>(0);
  const moduleId = `${moduleName}/${expose}`;
  const sandboxId = `sandbox-${moduleName}`;
  const shadowHostRef = useRef<HTMLDivElement | null>(null);
  const bundleRef = useRef<SandboxBundle | null>(null);

  const isoConfig: Required<SandboxedRemoteLoaderIsolation> = useMemo(
    () => ({
      js: isolation?.js ?? true,
      style: isolation?.style ?? 'scoped',
      events: isolation?.events ?? true,
    }),
    [isolation?.js, isolation?.style, isolation?.events]
  );

  // 创建沙箱（仅在挂载时创建一次）
  useEffect(() => {
    const bundle = sandboxManager.createSandbox(sandboxId, {
      js: isoConfig.js ? { interceptWindow: true, ...jsSandboxOptions } : undefined,
      style:
        isoConfig.style === 'none'
          ? undefined
          : {
              mode: isoConfig.style as StyleIsolationMode,
              scopePrefix: `mf-${moduleName}__`,
              adoptedStyleSheets: false,
            },
      events: isoConfig.events,
    });
    bundleRef.current = bundle;

    if (isoConfig.js) {
      bundle.jsSandbox.activate();
    }
    if (isoConfig.events) {
      bundle.eventIsolation.activate();
    }
    bundle.status = 'active';

    logger.info(
      `[SandboxedRemoteLoader] 已为模块 ${moduleName} 创建沙箱 (js=${isoConfig.js}, style=${isoConfig.style}, events=${isoConfig.events})`
    );

    return () => {
      // 卸载时销毁沙箱，清理所有资源
      sandboxManager.destroySandbox(sandboxId);
      bundleRef.current = null;
      logger.info(`[SandboxedRemoteLoader] 已销毁模块 ${moduleName} 的沙箱`);
    };
  }, [sandboxId, moduleName]);

  // 为 Shadow DOM 模式准备宿主元素
  useEffect(() => {
    if (isoConfig.style !== 'shadow') return;
    if (!useShadowHost) return;
    if (!shadowHostRef.current) return;

    const bundle = bundleRef.current;
    if (!bundle) return;

    // 在宿主元素上创建 Shadow Root
    bundle.styleIsolation.createShadowRoot(shadowHostRef.current);
  }, [isoConfig.style, useShadowHost]);

  // 远程组件懒加载
  const LazyComponent = useMemo(
    () =>
      lazy(async () => {
        const loadStart = performance.now();
        try {
          logger.info(
            `[SandboxedRemoteLoader] 加载 ${moduleName}/${expose} from ${url} (沙箱模式)`
          );

          // 通过 module federation 动态导入
          const mod = await import(/* @vite-ignore */ `${moduleName}/${expose}`);
          const loadEnd = performance.now();
          const moduleLoadTime = loadEnd - loadStart;

          microFrontendPerf.recordModuleLoad(moduleName, expose, {
            moduleLoadTime,
            success: true,
          });

          errorTracker.setModuleErrorContext(moduleName, {
            moduleId: moduleName,
            componentName: expose,
            url,
            extra: { sandboxed: true },
          });

          return { default: mod.default || mod };
        } catch (err) {
          console.error(`[SandboxedRemoteLoader] 加载 ${moduleName}/${expose} 失败:`, err);
          microFrontendPerf.recordModuleLoad(moduleName, expose, {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });

          const error = err instanceof Error ? err : new Error(String(err));
          errorTracker.captureError(error, {
            moduleId: moduleName,
            componentName: expose,
            extra: { phase: 'sandboxed-load', url },
          });

          throw err;
        }
      }),
    [moduleName, expose, url]
  );

  useEffect(() => {
    renderTimeRef.current = performance.now() - startTimeRef.current;
    microFrontendPerf.recordModuleLoad(moduleName, expose, {
      firstRenderTime: renderTimeRef.current,
      totalTime: renderTimeRef.current,
    });
  }, [moduleName, expose]);

  // 健康检查（开发期辅助）
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const checkInterval = setInterval(() => {
      const health = sandboxManager.healthCheck(sandboxId);
      if (health && !health.healthy) {
        logger.warn(`[SandboxedRemoteLoader] 模块 ${moduleName} 沙箱健康检查异常:`, health.issues);
      }
    }, 30000); // 30s 检查一次
    return () => clearInterval(checkInterval);
  }, [sandboxId, moduleName]);

  // 渲染：shadow 模式时组件挂载在 shadow host 内部（简化：仍在主文档树，但样式隔离生效）
  const content = (
    <SandboxedErrorBoundary
      moduleName={moduleName}
      onError={onError}
    >
      <Suspense fallback={fallback || <SandboxedLoadingFallback moduleName={moduleName} />}>
        <LazyComponent {...props} />
      </Suspense>
    </SandboxedErrorBoundary>
  );

  if (isoConfig.style === 'shadow' && useShadowHost) {
    return (
      <div
        ref={shadowHostRef}
        data-mf-module={moduleName}
        data-mf-sandbox={sandboxId}
        style={{ display: 'contents' }}
      >
        {content}
      </div>
    );
  }

  return content;
};

export default SandboxedRemoteLoader;
