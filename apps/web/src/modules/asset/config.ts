import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

export const ASSET_PATHS = {
  root: '/asset',
  list: '/asset/list',
  categories: '/asset/categories',
  depreciation: '/asset/depreciation',
  transfers: '/asset/transfers',
} as const;

export const assetModuleConfig: RouteModuleConfig = {
  code: 'asset',
  name: '资产管理',
  icon: 'Package',
  path: ASSET_PATHS.root,
  source: 'plugin',
  suite: 'collaboration',
  status: 'online',
  order: 91,
  description: '企业固定资产管理',
  permission: 'asset:read',
  routes: [
    {
      path: ASSET_PATHS.list,
      element: lazyWithRetry(() => import('@/pages/asset/AssetListPage'), 'AssetListPage'),
      module: 'asset',
      code: 'asset-list',
      title: '资产列表',
      template: 'list',
      group: 'business',
      requiredPermissions: ['asset:read'],
      action: 'read',
    },
    {
      path: ASSET_PATHS.categories,
      element: lazyWithRetry(
        () => import('@/pages/asset/CategoryManagementPage'),
        'CategoryManagementPage'
      ),
      module: 'asset',
      code: 'asset-categories',
      title: '资产分类',
      template: 'list',
      group: 'master',
      requiredPermissions: ['asset:category:read'],
      action: 'read',
    },
    {
      path: ASSET_PATHS.depreciation,
      element: lazyWithRetry(() => import('@/pages/asset/DepreciationPage'), 'DepreciationPage'),
      module: 'asset',
      code: 'asset-depreciation',
      title: '折旧管理',
      template: 'form',
      group: 'analytics',
      requiredPermissions: ['asset:depreciation:read'],
      action: 'read',
    },
    {
      path: ASSET_PATHS.transfers,
      element: lazyWithRetry(() => import('@/pages/asset/TransferPage'), 'TransferPage'),
      module: 'asset',
      code: 'asset-transfers',
      title: '资产调拨',
      template: 'form',
      group: 'process',
      requiredPermissions: ['asset:transfer:read'],
      action: 'read',
    },
  ],
};

export const assetNavConfig: ModuleNavConfig = {
  code: 'asset',
  name: '资产管理',
  icon: 'Package',
  path: ASSET_PATHS.root,
  source: 'plugin' as const,
  suite: 'collaboration',
  order: 91,
  navItems: [
    {
      code: 'asset-list',
      label: '资产列表',
      path: ASSET_PATHS.list,
      group: 'business',
      showInSidebar: true,
    },
    {
      code: 'asset-categories',
      label: '资产分类',
      path: ASSET_PATHS.categories,
      group: 'master',
      showInSidebar: true,
    },
    {
      code: 'asset-depreciation',
      label: '折旧管理',
      path: ASSET_PATHS.depreciation,
      group: 'analytics',
      showInSidebar: true,
    },
    {
      code: 'asset-transfers',
      label: '资产调拨',
      path: ASSET_PATHS.transfers,
      group: 'process',
      showInSidebar: true,
    },
  ],
};
