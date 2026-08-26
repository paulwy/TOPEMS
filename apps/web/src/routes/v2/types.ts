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

type ModuleTier = 'basic' | 'advanced';

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

// ============ 页面 Props 基础类型（V259 TypeMap 基础设施）============
//
// 目标：消除各模块 config.ts 中重复的 `{ page?, pageSize?, filters?: Record<string, unknown> }`
// 与 `{ mode?, initialValues?: Record<string, unknown> }` 模式，将 `Record<string, unknown>`
// 升级为具体 schema（TypeMap<Entity>），需 tsc + 后端 DTO 联动。
//
// 使用方式：
//   // config.ts
//   import type { ListPageProps, FormPageProps } from '@/routes/v2/types';
//   import type { ProductQuery } from '@/api/pdm';
//   interface ProductPageProps extends ListPageProps<ProductQuery> {}
//   interface PdmProductConfigPageProps extends FormPageProps<CreateProductRequest> {}

/**
 * 列表页 Props 基础类型。
 *
 * @template TFilters - 筛选参数 schema，默认 `Record<string, unknown>`（向后兼容）。
 *                      升级为具体类型后可与后端 DTO 联动（如 `ProductQuery`）。
 */
export interface ListPageProps<TFilters = Record<string, unknown>> {
  /** 当前页码（1-based） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 筛选参数 — 升级为 TypeMap<Entity> 后由具体 schema 描述 */
  filters?: TFilters;
}

/**
 * 表单页 Props 基础类型。
 *
 * @template TValues - 表单初始值 schema，默认 `Record<string, unknown>`（向后兼容）。
 *                      升级为具体类型后可与后端 Create{Entity}Request / Update{Entity}Request DTO 联动。
 */
export interface FormPageProps<TValues = Record<string, unknown>> {
  /** 表单模式 */
  mode?: 'create' | 'edit' | 'view';
  /** 初始值 — 升级为 TypeMap<Entity> 后由具体 schema 描述 */
  initialValues?: TValues;
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
