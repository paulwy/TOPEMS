/**
 * ModuleLoader - Lazy loading component for modules
 */

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { LOADER_TIMEOUT } from '@topems/shared-constants';
import type { ModuleStatus } from '@/store/moduleLoadingStore';
import { useModuleLoadingStore } from '@/store/moduleLoadingStore';
import { ModuleLoadingProgress } from './ModuleLoadingProgress';
import i18n from '@/i18n';

const DEFAULT_TIMEOUT = LOADER_TIMEOUT.MODULE;

interface ModuleLoaderProps {
  /** Component to load */
  component: () => Promise<{ default: React.ComponentType<unknown> }>;
  /** Loading fallback */
  fallback?: React.ReactNode;
  /** Error fallback */
  errorFallback?: React.ReactNode;
  /** Module identifier for tracking */
  moduleId?: string;
  /** Enable progress display */
  showProgress?: boolean;
  /** Loading timeout in ms */
  timeout?: number;
}

interface ModuleHealthState {
  status: ModuleStatus;
  lastCheck?: number;
  latency?: number;
}

/**
 * Loading Fallback Component
 */
export const ModuleLoadingFallback: React.FC<{
  moduleId?: string;
  showProgress?: boolean;
}> = ({ moduleId, showProgress }) => {
  const progress = useModuleLoadingStore((state) =>
    moduleId ? state.modules[moduleId]?.progress : state.totalProgress
  );

  if (showProgress && progress !== undefined) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          gap: 2,
        }}
      >
        <ModuleLoadingProgress moduleId={moduleId} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
        gap: 2,
      }}
    >
      <CircularProgress size={40} />
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {i18n.t('lib.module_loader.k0')}
      </Typography>
    </Box>
  );
};

/**
 * Error Fallback Component
 */
export const ModuleErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 200,
      gap: 2,
      p: 3,
    }}
  >
    <Typography
      variant='h6'
      color='error'
    >
      {i18n.t('lib.module_loader.k1')}
    </Typography>
    {error && (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {error.message}
      </Typography>
    )}
  </Box>
);

/**
 * Lazy Module Loader Component
 */
export const ModuleLoader: React.FC<ModuleLoaderProps> = ({
  component,
  fallback,
  errorFallback = <ModuleErrorFallback />,
  moduleId,
  showProgress = false,
  timeout = DEFAULT_TIMEOUT,
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const setLoading = useModuleLoadingStore((state) => state.setLoading);
  const setLoaded = useModuleLoadingStore((state) => state.setLoaded);
  const setErrorState = useModuleLoadingStore((state) => state.setError);
  const setProgress = useModuleLoadingStore((state) => state.setProgress);
  const healthStatus = useModuleLoadingStore((state) =>
    moduleId ? state.modules[moduleId]?.healthStatus : undefined
  );

  const effectiveModuleId = moduleId || `module_${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const loadWithTimeout = async () => {
      setLoading(effectiveModuleId);

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          setIsTimedOut(true);
          reject(new Error(`Module loading timeout after ${timeout}ms`));
        }, timeout);
      });

      const loadPromise = (async () => {
        let lastProgress = 0;
        const progressInterval = setInterval(() => {
          if (lastProgress < 95) {
            lastProgress += Math.random() * 15;
            setProgress(effectiveModuleId, Math.min(95, lastProgress));
          }
        }, 150);

        try {
          const module = await component();
          clearInterval(progressInterval);
          setProgress(effectiveModuleId, 100);
          setLoaded(effectiveModuleId);
          return module;
        } catch (err) {
          clearInterval(progressInterval);
          throw err;
        }
      })();

      try {
        await Promise.race([loadPromise, timeoutPromise]);
      } catch (err) {
        setErrorState(effectiveModuleId, err as Error);
        setError(err as Error);
      }
    };

    loadWithTimeout();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [component, effectiveModuleId, timeout, setLoading, setLoaded, setErrorState, setProgress]);

  if (isTimedOut || error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
          gap: 2,
          p: 3,
        }}
      >
        <Typography
          variant='h6'
          color='error'
        >
          {i18n.t('lib.module_loader.k2')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {isTimedOut
            ? `${i18n.t('shared.module_loader.k0')}${timeout / 1000}${i18n.t('shared.module_loader.k1')}`
            : error?.message}
        </Typography>
        {healthStatus === 'unhealthy' && (
          <Typography
            variant='caption'
            color='warning.main'
          >
            {i18n.t('lib.module_loader.k3')}
          </Typography>
        )}
      </Box>
    );
  }

  const defaultFallback = showProgress ? (
    <ModuleLoadingFallback
      moduleId={effectiveModuleId}
      showProgress={true}
    />
  ) : (
    <ModuleLoadingFallback />
  );

  const LazyComponent = lazy(component);

  return (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent />
    </Suspense>
  );
};

/**
 * Dynamic Module Loader with retry support
 */
class DynamicModuleLoader {
  private cache: Map<string, { default: React.ComponentType<unknown> }> = new Map();
  private retryCount: Map<string, number> = new Map();
  private maxRetries = 3;
  private loadingStore = useModuleLoadingStore.getState();

  async loadModule(
    component: () => Promise<{ default: React.ComponentType<unknown> }>,
    moduleId?: string
  ): Promise<{ default: React.ComponentType<unknown> }> {
    const cacheKey = moduleId || component.toString();

    if (this.cache.has(cacheKey)) {
      this.loadingStore.setLoaded(moduleId || cacheKey);
      return this.cache.get(cacheKey)!;
    }

    const retryKey = moduleId || cacheKey;
    const retries = this.retryCount.get(retryKey) || 0;

    this.loadingStore.setLoading(moduleId || cacheKey);

    try {
      const module = await component();
      this.cache.set(cacheKey, module);
      this.retryCount.delete(retryKey);
      this.loadingStore.setLoaded(moduleId || cacheKey);
      return module;
    } catch (error: unknown) {
      this.loadingStore.setError(moduleId || cacheKey, error as Error);
      if (retries < this.maxRetries) {
        this.retryCount.set(retryKey, retries + 1);
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
        return this.loadModule(component, moduleId);
      }
      throw error;
    }
  }

  clearCache(moduleId?: string): void {
    if (moduleId) {
      this.cache.delete(moduleId);
    } else {
      this.cache.clear();
    }
  }

  async preload(moduleId: string, loader: () => Promise<unknown>): Promise<boolean> {
    return this.loadingStore.preload(moduleId, loader);
  }

  unload(moduleId: string): void {
    this.cache.delete(moduleId);
    this.loadingStore.unload(moduleId);
  }
}

const moduleLoader = new DynamicModuleLoader();

// ============================================================================
// Route Wrapper with Module Loading
// ============================================================================

interface ModuleRouteWrapperProps {
  routePath: string;
  component: () => Promise<{ default: React.ComponentType<unknown> }>;
  moduleId?: string;
  fallback?: React.ReactNode;
}

/**
 * Route Wrapper with automatic module loading
 */
const ModuleRouteWrapper: React.FC<ModuleRouteWrapperProps> = ({
  routePath,
  component,
  moduleId,
  fallback,
}) => {
  const [moduleComponent, setModuleComponent] = React.useState<React.ComponentType<unknown> | null>(
    null
  );
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        const mod = await moduleLoader.loadModule(component, moduleId);
        if (mounted) {
          setModuleComponent(() => mod.default || mod);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [routePath, component, moduleId]);

  if (loading) {
    return fallback || <ModuleLoadingFallback />;
  }

  if (error) {
    return <ModuleErrorFallback error={error} />;
  }

  if (moduleComponent) {
    const Component = moduleComponent;
    return <Component />;
  }

  return null;
};
