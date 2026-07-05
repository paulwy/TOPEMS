import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@/utils/logger';
import { eventBus, ModuleEvents } from './EventBus';

export interface MicroFrontendLoaderProps {
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

declare global {
  interface Window {
    [key: string]: any;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __webpack_share_scopes__: any;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    __webpack_init_sharing__: (scope: string) => Promise<void>;
  }
}

const loadRemoteEntry = async (remoteName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window[remoteName]) {
      resolve();
      return;
    }

    const remotes: Record<string, string> = {
      topems_core: 'http://localhost:3001/remoteEntry.js',
      topems_hrm: 'http://localhost:3002/remoteEntry.js',
      topems_crm: 'http://localhost:3003/remoteEntry.js',
      topems_finance: 'http://localhost:3004/remoteEntry.js',
      topems_pm: 'http://localhost:3005/remoteEntry.js',
      topems_mes: 'http://localhost:3006/remoteEntry.js',
      topems_scm: 'http://localhost:3007/remoteEntry.js',
    };

    const script = document.createElement('script');
    script.src = remotes[remoteName] || `http://localhost:3001/remoteEntry.js`;
    script.type = 'module';
    script.async = true;

    script.onload = () => {
      if (window[remoteName]) {
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

    if (typeof window.__webpack_init_sharing__ === 'function') {
      await window.__webpack_init_sharing__('default');
    }

    const container = window[remoteName];
    if (!container) {
      throw new Error(`Remote module "${remoteName}" not found`);
    }

    if (typeof container.init === 'function' && window.__webpack_share_scopes__) {
      await container.init(window.__webpack_share_scopes__.default);
    }

    const factory = await container.get(modulePath);
    const module = await factory();

    const mountFn = module.mount || module.default?.mount;
    const unmountFn = module.unmount || module.default?.unmount;

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

    const mountModule = async () => {
      try {
        setLoading(true);
        setError(null);

        const module = await loadRemoteModule(remoteName, remoteModule);

        if (cancelled || !containerRef.current) {
          return;
        }

        moduleRef.current = module;
        module.mount(containerRef.current, { basename });
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
      if (mountedRef.current && containerRef.current && moduleRef.current) {
        try {
          moduleRef.current.unmount(containerRef.current);
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
            正在加载模块 {remoteName}...
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
        <Typography variant='h6'>模块加载失败</Typography>
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
          重新加载
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
