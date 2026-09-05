import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import { eventBus, ModuleEvents } from './eventBus';
import { isDev, VITEDeploymentMode } from '@/config/env';
import i18n from '@/i18n';

interface MicroFrontendLoaderProps {
  remoteName: string;
  remoteModule?: string;
  basename?: string;
  fallback?: React.ReactNode;
  onMount?: () => void;
  onUnmount?: () => void;
  onError?: (error: Error) => void;
}
interface MountFunction {
  mount: (container: HTMLElement, options?: unknown) => void;
  unmount: (container: HTMLElement) => void;
}
const remoteModuleCache: Map<string, MountFunction> = new Map();
const loadRemoteEntry = async (remoteName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>)[remoteName]) {
      resolve();
      return;
    }
    const getRemoteUrl = (name: string): string => {
      const envKey = `VITE_${name.toUpperCase()}_REMOTE_ENTRY`;
      const envUrl = typeof import.meta !== 'undefined' ? import.meta.env?.[envKey] : undefined;
      if (envUrl) return envUrl;
      // V64 CORS 修复：
      //   - 开发环境：一律走 Vite 同源代理 /remote/<name>/remoteEntry.js，
      //     vite.config.ts 已为 /remote/<name> 配置代理到 localhost:<port>
      //   - 生产环境：MF/hybrid 模式同源路径；static 模式不加载（返回空字符串）
      if (isDev()) {
        return `/remote/${name}/remoteEntry.js`;
      }
      const mode = VITEDeploymentMode();
      if (mode === 'module-federation' || mode === 'hybrid') {
        return `/remote/${name}/remoteEntry.js`;
      }
      // static 模式：返回空，由上层处理降级；不再直连跨端口
      return '';
    };
    const script = document.createElement('script');
    const src = getRemoteUrl(remoteName);
    // V64 防御：空 URL 说明 static 模式或无有效入口，直接 reject 不注入 script，
    // 避免 <script src=""> 被浏览器解释为当前页面 URL，造成死循环/资源浪费
    if (!src) {
      reject(
        new Error(
          `No valid remote entry for ${remoteName} (deployment mode: static or missing config)`
        )
      );
      return;
    }
    script.src = src;
    script.type = 'module';
    script.async = true;
    script.onload = () => {
      if ((window as unknown as Record<string, unknown>)[remoteName]) {
        resolve();
      } else {
        reject(new Error(`Remote entry loaded but ${remoteName} not found on window`));
      }
    };
    script.onerror = () => {
      reject(new Error(`Failed to load remote entry for ${remoteName}`));
    };
    document.head.appendChild(script);
  });
};
const loadRemoteModule = async (
  remoteName: string,
  modulePath: string = './bootstrap'
): Promise<MountFunction> => {
  const cacheKey = `${remoteName}:${modulePath}`;
  if (remoteModuleCache.has(cacheKey)) {
    return remoteModuleCache.get(cacheKey)!;
  }
  try {
    await loadRemoteEntry(remoteName);
    if (typeof window.WebpackInitSharing === 'function') {
      await window.WebpackInitSharing('default');
    }
    const container = (window as Record<string, WebpackContainer | undefined>)[remoteName];
    if (!container) {
      throw new Error(`Remote module "${remoteName}" not found`);
    }
    if (typeof container.init === 'function' && window.WebpackShareScopes) {
      await container.init(window.WebpackShareScopes.default);
    }
    const factory = await container.get(modulePath);
    const remoteModule = (await factory()) as unknown as Record<string, unknown>;
    const defaultExport = remoteModule.default as unknown as Record<string, unknown> | undefined;
    const mountFn = (remoteModule.mount || defaultExport?.mount) as
      MountFunction['mount'] | undefined;
    const unmountFn = (remoteModule.unmount || defaultExport?.unmount) as
      MountFunction['unmount'] | undefined;
    if (!mountFn) {
      throw new Error(`Module ${remoteName}:${modulePath} does not export a mount function`);
    }
    const result: MountFunction = {
      mount: mountFn,
      unmount: unmountFn || (() => {}),
    };
    remoteModuleCache.set(cacheKey, result);
    return result;
  } catch (error) {
    logger.error(
      `[MicroFrontendLoader] Failed to load remote module ${remoteName}:${modulePath}`,
      error
    );
    throw error;
  }
};
export const MicroFrontendLoader: React.FC<MicroFrontendLoaderProps> = ({
  remoteName,
  remoteModule = './bootstrap',
  basename = '/',
  fallback,
  onMount,
  onUnmount,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(false);
  const moduleRef = useRef<MountFunction | null>(null);
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    if (containerRef.current && moduleRef.current) {
      moduleRef.current.unmount(containerRef.current);
    }
    moduleRef.current = null;
    mountedRef.current = false;
  }, []);
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    let mountedModule: MountFunction | null = null;
    const mountModule = async () => {
      try {
        setLoading(true);
        setError(null);
        const module = await loadRemoteModule(remoteName, remoteModule);
        if (cancelled || !container) {
          return;
        }
        moduleRef.current = module;
        mountedModule = module;
        module.mount(container, { basename });
        mountedRef.current = true;
        setLoading(false);
        onMount?.();
        eventBus.emit(ModuleEvents.MODULE_LOADED, {
          moduleId: remoteName,
          path: basename,
        });
      } catch (err) {
        if (cancelled) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setLoading(false);
        onError?.(error);
        eventBus.emit(ModuleEvents.MODULE_ERROR, {
          moduleId: remoteName,
          error,
        });
        logger.error(`[MicroFrontendLoader] Failed to mount ${remoteName}`, error);
      }
    };
    mountModule();
    return () => {
      cancelled = true;
      if (mountedModule && container) {
        try {
          mountedModule.unmount(container);
          mountedRef.current = false;
          onUnmount?.();
        } catch (err) {
          logger.warn(`[MicroFrontendLoader] Error unmounting ${remoteName}`, err);
        }
      }
    };
  }, [remoteName, remoteModule, basename, onMount, onUnmount, onError]);
  if (loading) {
    return (
      fallback || (
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
          <CircularProgress size={40} />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {i18n.t('lib.pluginLoader.k0')} {remoteName}...
          </Typography>
        </Box>
      )
    );
  }
  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          gap: 2,
          p: 3,
          textAlign: 'center',
        }}
      >
        <AlertTriangle
          size={48}
          color='error'
        />
        <Typography variant='h6'>{i18n.t('shared.micro_frontend_loader.k0')}</Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {error.message}
        </Typography>
        <Button
          variant='outlined'
          startIcon={<RefreshCw size={16} />}
          onClick={handleRetry}
          sx={{ mt: 2 }}
        >
          {i18n.t('lib.micro_frontend_loader.k0')}
        </Button>
      </Box>
    );
  }
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
    />
  );
};
export const preloadRemoteModule = async (
  remoteName: string,
  modulePath: string = './bootstrap'
): Promise<boolean> => {
  try {
    await loadRemoteModule(remoteName, modulePath);
    logger.info(`[MicroFrontendLoader] Preloaded remote: ${remoteName}`);
    return true;
  } catch (error) {
    logger.warn(`[MicroFrontendLoader] Failed to preload remote: ${remoteName}`, error);
    return false;
  }
};
export default MicroFrontendLoader;
