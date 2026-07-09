import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
import type React from 'react';
import { lazy } from 'react';
import ErrorPage from '../pages/shared/ErrorPage';
import { logger } from '@/utils/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const lazyWithRetry = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleName?: string
): LazyExoticComponent<T> => {
  return lazy(async () => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await factory();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `[Lazy Load] Failed to load component ${moduleName || 'unknown'} (attempt ${attempt}/${
            MAX_RETRIES
          }):`,
          lastError.message
        );
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }
    logger.error(
      `[Lazy Load] Component ${moduleName || 'unknown'} failed after ${MAX_RETRIES} retries`
    );
    return { default: ErrorPage as unknown as T };
  });
};

export const createSafeLazy = () => {
  return <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    moduleName?: string
  ): LazyExoticComponent<T> => {
    return lazy(async () => {
      try {
        const result = await factory();
        return result;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(
          `[Safe Lazy] Failed to load component ${moduleName || 'unknown'}:`,
          err.message
        );
        return { default: ErrorPage as unknown as T };
      }
    });
  };
};

export interface RouteConfig {
  path: string;
  element: ReactElement | LazyExoticComponent<ComponentType<any>>;
  requiredPermissions?: string[];
  module?: string;
  action?: 'read' | 'write' | 'update' | 'delete' | 'admin';
}
