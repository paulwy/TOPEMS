import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

/** DashboardPage 路由 Props · 模板=dashboard */
export interface DashboardPageProps {
  /** 仪表盘视图类型 */
  variant?: 'overview' | 'executive';
  /** 看板全局筛选条件 */
  filters?: Record<string, unknown>;
}

/** AssetListPage 路由 Props · 模板=list */
export interface AssetListPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** CategoryManagementPage 路由 Props · 模板=list */
export interface CategoryManagementPageProps {
  /** 分页页码，默认 1 */
  page?: number;
  /** 分页大小，默认 20 */
  pageSize?: number;
  /** 列表筛选条件键值对 */
  filters?: Record<string, unknown>;
}

/** DepreciationPage 路由 Props · 模板=form */
export interface DepreciationPageProps {
  /** 表单三态：新建 / 编辑 / 只读 */
  mode?: 'create' | 'edit' | 'view';
  /** 表单回填初始值 */
  initialValues?: Record<string, unknown>;
}

/** TransferPage 路由 Props · 模板=form */
export interface TransferPageProps {
  /** 表单三态：新建 / 编辑 / 只读 */
  mode?: 'create' | 'edit' | 'view';
  /** 表单回填初始值 */
  initialValues?: Record<string, unknown>;
}
export const ASSET_PATHS = {
  root: '/asset',
  dashboard: '/asset/dashboard',
  list: '/asset/list',
  categories: '/asset/categories',
  depreciation: '/asset/depreciation',
  transfers: '/asset/transfers',
} as const;

export const assetModuleConfig: RouteModuleConfig = {
  code: 'asset',
  name: i18n.t('shared.config.asset_name'),
  nameKey: 'shared.config.asset_name',
  icon: 'Package',
  path: ASSET_PATHS.root,
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  order: 91,
  description: i18n.t('shared.config.k1'),
  permission: 'asset:list:read',
  routes: [
    {
      path: ASSET_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/asset/DashboardPage'), 'DashboardPage'),
      module: 'asset',
      title: i18n.t('shared.config.k2'),
      titleKey: 'shared.config.k2',
      code: 'asset-dashboard',
      requiredPermissions: ['asset:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    } satisfies RouteConfigV2<DashboardPageProps>,
    {
      path: ASSET_PATHS.list,
      element: lazyWithRetry(() => import('@/pages/asset/AssetListPage'), 'AssetListPage'),
      module: 'asset',
      code: 'asset-list',
      title: i18n.t('shared.config.k3'),
      titleKey: 'shared.config.k3',
      template: 'list',
      group: 'business',
      requiredPermissions: ['asset:list:read'],
      action: 'read',
    } satisfies RouteConfigV2<AssetListPageProps>,
    {
      path: ASSET_PATHS.categories,
      element: lazyWithRetry(
        () => import('@/pages/asset/CategoryManagementPage'),
        'CategoryManagementPage'
      ),
      module: 'asset',
      code: 'asset-categories',
      title: i18n.t('shared.config.k4'),
      titleKey: 'shared.config.k4',
      template: 'list',
      group: 'master',
      requiredPermissions: ['asset:category:read'],
      action: 'read',
    } satisfies RouteConfigV2<CategoryManagementPageProps>,
    {
      path: ASSET_PATHS.depreciation,
      element: lazyWithRetry(() => import('@/pages/asset/DepreciationPage'), 'DepreciationPage'),
      module: 'asset',
      code: 'asset-depreciation',
      title: i18n.t('shared.config.k5'),
      titleKey: 'shared.config.k5',
      template: 'form',
      group: 'analytics',
      requiredPermissions: ['asset:depreciation:read'],
      action: 'read',
    } satisfies RouteConfigV2<DepreciationPageProps>,
    {
      path: ASSET_PATHS.transfers,
      element: lazyWithRetry(() => import('@/pages/asset/TransferPage'), 'TransferPage'),
      module: 'asset',
      code: 'asset-transfers',
      title: i18n.t('shared.config.k6'),
      titleKey: 'shared.config.k6',
      template: 'form',
      group: 'process',
      requiredPermissions: ['asset:transfer:read'],
      action: 'read',
    } satisfies RouteConfigV2<TransferPageProps>,
  ],
};

export const assetNavConfig: ModuleNavConfig = {
  code: 'asset',
  name: i18n.t('shared.config.k7'),
  nameKey: 'shared.config.k7',
  icon: 'Package',
  path: ASSET_PATHS.root,
  source: 'plugin' as const,
  suite: 'collaboration',
  order: 91,
  navItems: [
    {
      code: 'asset-dashboard',
      label: i18n.t('shared.config.k8'),
      labelKey: 'shared.config.k8',
      icon: 'LayoutDashboard',
      path: ASSET_PATHS.dashboard,
      permission: 'asset:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k9'),
    },
    {
      code: 'asset-list',
      label: i18n.t('shared.config.k10'),
      labelKey: 'shared.config.k10',
      path: ASSET_PATHS.list,
      permission: 'asset:list:read',
      group: 'business',
      showInSidebar: true,
    },
    {
      code: 'asset-categories',
      label: i18n.t('shared.config.k11'),
      labelKey: 'shared.config.k11',
      path: ASSET_PATHS.categories,
      permission: 'asset:category:read',
      group: 'master',
      showInSidebar: true,
    },
    {
      code: 'asset-depreciation',
      label: i18n.t('shared.config.k12'),
      labelKey: 'shared.config.k12',
      path: ASSET_PATHS.depreciation,
      permission: 'asset:depreciation:read',
      group: 'analytics',
      showInSidebar: true,
    },
    {
      code: 'asset-transfers',
      label: i18n.t('shared.config.k13'),
      labelKey: 'shared.config.k13',
      path: ASSET_PATHS.transfers,
      permission: 'asset:transfer:read',
      group: 'process',
      showInSidebar: true,
    },
  ],
};
