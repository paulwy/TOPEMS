import type { ComponentType, LazyExoticComponent, ReactNode } from 'react';
import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const CACHE = new Map<string, Promise<{ default: ComponentType<any> }>>();

export interface LazyLoadOptions {
  maxRetries?: number;
  retryDelay?: number;
  moduleName?: string;
  fallback?: ReactNode;
}

export interface LoadableComponentProps {
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

export function lazyLoadWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const { maxRetries = MAX_RETRIES, retryDelay = RETRY_DELAY_MS, moduleName } = options;

  return lazy(async () => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await factory();
        logger.info(`[Lazy Load] Successfully loaded component ${moduleName || 'unknown'}`);
        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `[Lazy Load] Failed to load component ${moduleName || 'unknown'} (attempt ${attempt}/${maxRetries}):`,
          lastError.message
        );
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    logger.error(
      `[Lazy Load] Component ${moduleName || 'unknown'} failed after ${maxRetries} retries`
    );
    throw lastError || new Error('Failed to load component');
  });
}

export function loadable<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): ComponentType<LoadableComponentProps & React.ComponentProps<T>> {
  const LazyComponent = lazyLoadWithRetry(importFn, options);

  return function LoadableWrapper(props: LoadableComponentProps & React.ComponentProps<T>) {
    const { fallback = null, onError, onLoad, ...componentProps } = props;
    const [error, setError] = useState<Error | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      if (loaded && onLoad) {
        onLoad();
      }
    }, [loaded, onLoad]);

    useEffect(() => {
      setLoaded(true);
    }, []);

    if (error) {
      if (onError) {
        onError(error);
      }
      return null;
    }

    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...(componentProps as React.ComponentProps<T>)} />
      </Suspense>
    );
  };
}

export async function preloadModule<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  moduleName?: string
): Promise<void> {
  try {
    await importFn();
    logger.info(`[Preload] Successfully preloaded module ${moduleName || 'unknown'}`);
  } catch (error) {
    logger.error(
      `[Preload] Failed to preload module ${moduleName || 'unknown'}:`,
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    moduleName?: string;
    cache?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    retryDelay = RETRY_DELAY_MS,
    moduleName,
    cache = true,
  } = options;

  const cacheKey = moduleName || importFn.toString();

  if (cache && CACHE.has(cacheKey)) {
    return CACHE.get(cacheKey) as unknown as Promise<T>;
  }

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const promise = importFn();
      if (cache) {
        CACHE.set(cacheKey, promise as Promise<{ default: ComponentType<any> }>);
      }
      const result = await promise;
      logger.info(`[Dynamic Import] Successfully imported module ${moduleName || 'unknown'}`);
      return result;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(
        `[Dynamic Import] Failed to import module ${moduleName || 'unknown'} (attempt ${attempt}/${maxRetries}):`,
        lastError.message
      );
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  throw lastError || new Error('Failed to dynamically import module');
}

export function usePreloadModule<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  moduleName?: string,
  shouldPreload: boolean = true
) {
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadError, setPreloadError] = useState<Error | null>(null);

  const triggerPreload = useCallback(async () => {
    if (!shouldPreload || isPreloading) return;
    setIsPreloading(true);
    try {
      await preloadModule(importFn, moduleName);
    } catch (error) {
      setPreloadError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsPreloading(false);
    }
  }, [importFn, moduleName, shouldPreload, isPreloading]);

  useEffect(() => {
    triggerPreload();
  }, [triggerPreload]);

  return { isPreloading, preloadError, triggerPreload };
}

export function PreloadLink<T extends ComponentType<any>>({
  to,
  importFn,
  moduleName,
  children,
  ...rest
}: {
  to: string;
  importFn: () => Promise<{ default: T }>;
  moduleName?: string;
  children: ReactNode;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handleMouseEnter = useCallback(() => {
    preloadModule(importFn, moduleName);
  }, [importFn, moduleName]);

  return (
    <a
      href={to}
      onMouseEnter={handleMouseEnter}
      {...rest}
    >
      {children}
    </a>
  );
}

export function PrefetchOnIdle<T extends ComponentType<any>>({
  importFn,
  moduleName,
  when,
}: {
  importFn: () => Promise<{ default: T }>;
  moduleName?: string;
  when?: boolean;
}) {
  useEffect(() => {
    if (when === false) return;

    const handleIdle = () => {
      preloadModule(importFn, moduleName);
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(handleIdle);
    } else {
      setTimeout(handleIdle, 1000);
    }

    return () => {
      if ('cancelIdleCallback' in window) {
        // Note: requestIdleCallback returns an ID, but we don't store it
      }
    };
  }, [importFn, moduleName, when]);

  return null;
}
