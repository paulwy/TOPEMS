import React, { type ComponentType, type LazyExoticComponent } from 'react';
import { createLogger } from './logger';

const logger = createLogger('lazyImport');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface LazyImportOptions<T extends ComponentType<any>> {
  factory: () => Promise<{ default: T }>;
  moduleName?: string;
  maxRetries?: number;
  retryDelay?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: ComponentType;
}

export function lazyImport<T extends ComponentType<any>>(
  options: LazyImportOptions<T>
): LazyExoticComponent<T>;

export function lazyImport<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleName?: string
): LazyExoticComponent<T>;

export function lazyImport<T extends ComponentType<any>>(
  factoryOrOptions: (() => Promise<{ default: T }>) | LazyImportOptions<T>,
  moduleName?: string
): LazyExoticComponent<T> {
  let factory: () => Promise<{ default: T }>;
  let name: string | undefined;
  let maxRetries = MAX_RETRIES;
  let retryDelay = RETRY_DELAY_MS;
  let onLoad: (() => void) | undefined;
  let onError: ((error: Error) => void) | undefined;

  if (typeof factoryOrOptions === 'function') {
    factory = factoryOrOptions;
    name = moduleName;
  } else {
    factory = factoryOrOptions.factory;
    name = factoryOrOptions.moduleName;
    maxRetries = factoryOrOptions.maxRetries ?? MAX_RETRIES;
    retryDelay = factoryOrOptions.retryDelay ?? RETRY_DELAY_MS;
    onLoad = factoryOrOptions.onLoad;
    onError = factoryOrOptions.onError;
  }

  return React.lazy(async () => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const module = await factory();
        onLoad?.();
        logger.debug(`[Lazy Import] Loaded: ${name || 'unknown'}`);
        return module;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        onError?.(lastError);

        logger.warn(
          `[Lazy Import] Failed to load ${name || 'unknown'} (attempt ${attempt}/${maxRetries}): ${lastError.message}`
        );

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    logger.error(`[Lazy Import] ${name || 'unknown'} failed after ${maxRetries} retries`);

    throw lastError;
  });
}

export default lazyImport;
