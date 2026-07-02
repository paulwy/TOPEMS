import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
import { lazyWithRetry } from '../utils';

export { lazyWithRetry };

export type PageTemplateType =
  'dashboard' | 'list' | 'detail' | 'form' | 'tree' | 'stats' | 'settings' | 'kanban';

export type LayoutType = 'default' | 'full' | 'mobile' | 'none';

export interface RouteConfig {
  path: string;
  element: ReactElement | LazyExoticComponent<ComponentType<any>>;
  requiredPermissions?: string[];
  module?: string;
  action?: 'read' | 'write' | 'update' | 'delete' | 'admin';
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
  group?: string;
  parentPath?: string;
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
