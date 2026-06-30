import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
import { lazy } from 'react';
import ErrorPage from '../../pages/shared/ErrorPage';
import { logger } from '@/utils/logger';
import type { NavGroup } from '../../lib/navigation/types';

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

export type PageTemplateType =
  | 'dashboard'
  | 'list'
  | 'detail'
  | 'form'
  | 'tree'
  | 'stats'
  | 'settings'
  | 'kanban';

export type LayoutType = 'default' | 'full' | 'mobile' | 'none';

export interface RouteNavConfig {
  label: string;
  icon?: string;
  order?: number;
  group?: NavGroup;
  showInSidebar?: boolean;
  showInBreadcrumb?: boolean;
  showInTabs?: boolean;
  description?: string;
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
}

export interface RouteConfigV2 {
  path: string;
  element: ReactElement | LazyExoticComponent<ComponentType<any>>;
  module: string;
  title: string;
  code: string;
  requiredPermissions?: string[];
  action?: 'read' | 'write' | 'update' | 'delete' | 'admin';
  template?: PageTemplateType;
  layout?: LayoutType;
  group?: NavGroup;
  parentPath?: string;
  nav?: RouteNavConfig;
  children?: RouteConfigV2[];
}

export interface RouteModuleConfig {
  code: string;
  name: string;
  icon: string;
  path: string;
  source: 'core' | 'plugin';
  suite?:
    | 'finance'
    | 'hr'
    | 'manufacturing'
    | 'supply'
    | 'crm'
    | 'quality'
    | 'project'
    | 'gis'
    | 'enterprise';
  status?: 'online' | 'beta' | 'plan' | 'new';
  order?: number;
  description?: string;
  permission?: string;
  routes: RouteConfigV2[];
}

export function generateNavFromRoutes(moduleConfig: RouteModuleConfig) {
  const navItems = moduleConfig.routes
    .filter((route) => route.nav)
    .map((route) => ({
      code: route.code,
      label: route.nav!.label,
      icon: route.nav!.icon,
      path: route.path,
      permission: route.requiredPermissions?.[0],
      order: route.nav!.order,
      group: route.group || route.nav!.group,
      badge: route.nav!.badge,
      badgeColor: route.nav!.badgeColor,
      description: route.nav!.description,
      showInSidebar: route.nav!.showInSidebar,
      showInBreadcrumb: route.nav!.showInBreadcrumb,
      showInTabs: route.nav!.showInTabs,
      children: route.children
        ?.filter((child) => child.nav)
        .map((child) => ({
          code: child.code,
          label: child.nav!.label,
          icon: child.nav!.icon,
          path: child.path,
          permission: child.requiredPermissions?.[0],
          order: child.nav!.order,
          group: child.group || child.nav!.group,
          badge: child.nav!.badge,
          badgeColor: child.nav!.badgeColor,
          description: child.nav!.description,
          showInSidebar: child.nav!.showInSidebar,
          showInBreadcrumb: child.nav!.showInBreadcrumb,
          showInTabs: child.nav!.showInTabs,
        })),
    }));

  return {
    code: moduleConfig.code,
    name: moduleConfig.name,
    icon: moduleConfig.icon,
    path: moduleConfig.path,
    permission: moduleConfig.permission,
    source: moduleConfig.source,
    suite: moduleConfig.suite,
    status: moduleConfig.status,
    order: moduleConfig.order,
    description: moduleConfig.description,
    navItems,
  };
}

export function flattenRoutes(routes: RouteConfigV2[]): RouteConfigV2[] {
  const result: RouteConfigV2[] = [];

  const traverse = (items: RouteConfigV2[]) => {
    items.forEach((route) => {
      result.push(route);
      if (route.children) {
        traverse(route.children);
      }
    });
  };

  traverse(routes);
  return result;
}
