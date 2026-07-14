import React, { lazy, type ComponentType, type LazyExoticComponent } from 'react';

interface LazyOptions {
  fallback?: React.ReactNode;
}

export function createSafeLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyOptions = {}
): LazyExoticComponent<T> {
  const { fallback = null } = options;
  
  const LazyComponent = lazy(
    async () => {
      try {
        const module = await importFn();
        return module as { default: T };
      } catch (error) {
        console.error('[createSafeLazy] Failed to load component:', error);
        return {
          default: () => fallback,
        } as unknown as { default: T };
      }
    }
  );

  return LazyComponent;
}

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