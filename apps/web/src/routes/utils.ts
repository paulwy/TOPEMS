import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
import React from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// 内联简单错误组件，避免导入 ErrorPage 导致循环依赖
// 使用 React.createElement 避免在 .ts 文件中使用 JSX
const SimpleErrorPage: React.FC = () =>
  React.createElement('div', { style: { padding: 24, textAlign: 'center' } },
    React.createElement('h2', null, '组件加载失败'),
    React.createElement('p', null, '请刷新页面重试')
  );

// 简单日志函数，避免导入 logger 导致循环依赖
const logError = (message: string, ...args: unknown[]) => {
  console.error(message, ...args);
};

export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleName?: string
): LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await factory();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logError(
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
    logError(
      `[Lazy Load] Component ${moduleName || 'unknown'} failed after ${MAX_RETRIES} retries`
    );
    return { default: SimpleErrorPage as unknown as T };
  });
}

export const createSafeLazy = () => {
  return <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
    moduleName?: string
  ): LazyExoticComponent<T> => {
    return React.lazy(async () => {
      try {
        const result = await factory();
        return result;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logError(
          `[Safe Lazy] Failed to load component ${moduleName || 'unknown'}:`,
          err.message
        );
        return { default: SimpleErrorPage as unknown as T };
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
