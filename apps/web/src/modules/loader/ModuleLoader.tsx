/**
 * ModuleLoader - Lazy loading component for modules
 */

import React, { Suspense, lazy } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

interface ModuleLoaderProps {
  /** Component to load */
  component: () => Promise<any>;
  /** Loading fallback */
  fallback?: React.ReactNode;
  /** Error fallback */
  errorFallback?: React.ReactNode;
}

/**
 * Loading Fallback Component
 */
export const ModuleLoadingFallback: React.FC = () => (
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
    <Typography variant="body2" color="text.secondary">
      加载模块中...
    </Typography>
  </Box>
);

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
    <Typography variant="h6" color="error">
      模块加载失败
    </Typography>
    {error && (
      <Typography variant="body2" color="text.secondary">
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
  fallback = <ModuleLoadingFallback />,
  errorFallback = <ModuleErrorFallback />,
}) => {
  const LazyComponent = lazy(component);
  
  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  );
};

/**
 * Dynamic Module Loader with retry support
 */
export class DynamicModuleLoader {
  private cache: Map<string, any> = new Map();
  private retryCount: Map<string, number> = new Map();
  private maxRetries = 3;

  async loadModule(component: () => Promise<any>, moduleId?: string): Promise<any> {
    const cacheKey = moduleId || component.toString();
    
    // Return from cache if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const retryKey = moduleId || cacheKey;
    const retries = this.retryCount.get(retryKey) || 0;

    try {
      const module = await component();
      this.cache.set(cacheKey, module);
      this.retryCount.delete(retryKey);
      return module;
    } catch (error) {
      if (retries < this.maxRetries) {
        this.retryCount.set(retryKey, retries + 1);
        // Exponential backoff
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
}

export const moduleLoader = new DynamicModuleLoader();

// ============================================================================
// Route Wrapper with Module Loading
// ============================================================================

export interface ModuleRouteWrapperProps {
  routePath: string;
  component: () => Promise<any>;
  moduleId?: string;
  fallback?: React.ReactNode;
}

/**
 * Route Wrapper with automatic module loading
 */
export const ModuleRouteWrapper: React.FC<ModuleRouteWrapperProps> = ({
  routePath,
  component,
  moduleId,
  fallback,
}) => {
  const [moduleComponent, setModuleComponent] = React.useState<any>(null);
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
      } catch (err) {
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
    return <moduleComponent />;
  }

  return null;
};
