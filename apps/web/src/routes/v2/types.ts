import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
import type { ModuleSuite, NavGroup } from '@/lib/navigation/types';
import { lazyWithRetry } from '../utils';

export { lazyWithRetry };

export type PageTemplateType =
  | 'dashboard'
  | 'list'
  | 'detail'
  | 'form'
  | 'tree'
  | 'stats'
  | 'settings'
  | 'kanban'
  | 'wizard'
  | 'timeline'
  | 'master-detail';

export type LayoutType = 'default' | 'full' | 'mobile' | 'none';

export interface RouteConfig<P = any> {
  path: string;
  element: ReactElement | LazyExoticComponent<ComponentType<P>>;
  requiredPermissions?: string[];
  module?: string;
  action?: 'read' | 'write' | 'update' | 'delete' | 'admin';
}

export type ModuleTier = 'basic' | 'advanced';

export interface RouteConfigV2<P = any> {
  path: string;
  element: ReactElement | LazyExoticComponent<ComponentType<P>>;
  module: string;
  title: string;
  /** i18n key for the title; if provided, render-time translation overrides `title` */
  titleKey?: string;
  code: string;
  requiredPermissions?: string[];
  action?: 'read' | 'write' | 'update' | 'delete' | 'admin';
  template?: PageTemplateType;
  layout?: LayoutType;
  group?: NavGroup;
  parentPath?: string;
  children?: RouteConfigV2[];
  // P34-4: 模块分层 — 'basic' 默认显示；'advanced' 需 core_tenant_modules 中对应模块处于激活态
  tier?: ModuleTier;
}

export interface RouteModuleConfig {
  code: string;
  name: string;
  /** i18n key for the name; if provided, render-time translation overrides `name` */
  nameKey?: string;
  icon: string;
  path: string;
  source: 'core' | 'plugin';
  suite?: ModuleSuite;
  status?: 'online' | 'beta' | 'plan' | 'new';
  frontendOnly?: boolean;
  order?: number;
  description?: string;
  permission?: string;
  // P34-4: 模块分层 — 默认 'basic'；'advanced' 需要在 core_tenant_modules 中显式激活
  tier?: ModuleTier;
  /** 模块需要额外预加载的 i18n 命名空间（跨组件依赖） */
  preloadNamespaces?: string[];
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

/**
 * P34-4: filter modules by tier.
 *
 * - `basic` modules are always visible (default).
 * - `advanced` modules are only visible when their `code` appears in the
 *   `activeAdvancedModuleCodes` set — typically populated from the
 *   `core_tenant_modules` table where `tier = 'advanced' AND isActive = true`.
 * - Modules without a `tier` field default to `basic` and are always shown.
 *
 * NOTE: The actual core_tenant_modules fetch is not wired up yet; callers
 * currently pass an empty set, which means advanced modules are hidden
 * until the integration is completed in a later phase.
 */
function filterModulesByTier(
  modules: RouteModuleConfig[],
  activeAdvancedModuleCodes: Set<string> = new Set()
): RouteModuleConfig[] {
  return modules.filter((m) => {
    const tier = m.tier ?? 'basic';
    if (tier === 'basic') return true;
    if (tier === 'advanced') return activeAdvancedModuleCodes.has(m.code);
    return true;
  });
}

/**
 * P34-4: filter routes by tier. Same semantics as {@link filterModulesByTier}
 * but operates on a flat list of routes. `advancedRouteCodes` is the set of
 * route `code` values explicitly activated for the current tenant.
 */
function filterRoutesByTier(
  routes: RouteConfigV2[],
  activeAdvancedRouteCodes: Set<string> = new Set()
): RouteConfigV2[] {
  return routes.filter((r) => {
    const tier = r.tier ?? 'basic';
    if (tier === 'basic') return true;
    if (tier === 'advanced') return activeAdvancedRouteCodes.has(r.code);
    return true;
  });
}

export function toFlatRouteConfig(modules: RouteModuleConfig[]): RouteConfig[] {
  const result: RouteConfig[] = [];
  modules.forEach((moduleConfig) => {
    const flatRoutes = flattenRoutes(moduleConfig.routes);
    flatRoutes.forEach((route) => {
      result.push({
        path: route.path,
        element: route.element,
        requiredPermissions: route.requiredPermissions,
        module: route.module,
        action: route.action,
      });
    });
  });
  return result;
}
