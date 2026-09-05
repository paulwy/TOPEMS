import type React from 'react';
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { logger } from './logger';

interface LazyOptions {
  fallback?: React.ReactNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- React.lazy 约束需 ComponentType<any>
export function createSafeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): LazyExoticComponent<T> {
  const { fallback = null } = options;

  const LazyComponent = lazy(async () => {
    try {
      const module = await importFn();
      return module as { default: T };
    } catch (error) {
      logger.error('[createSafeLazy] Failed to load component:', error);
      return {
        default: () => fallback,
      } as unknown as { default: T };
    }
  });

  return LazyComponent;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 同上：React.lazy 泛型约束
export function lazyWithPreload<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): {
  lazy: LazyExoticComponent<T>;
  preload: () => Promise<{ default: T }>;
} {
  const LazyComponent = createSafeLazy(importFn, options);

  return {
    lazy: LazyComponent,
    preload: importFn,
  };
}
