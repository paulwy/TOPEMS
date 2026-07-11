import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const assetModuleConfig: RouteModuleConfig = {
  code: 'asset',
  name: '资产管理',
  icon: 'Landmark',
  path: '/asset',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  frontendOnly: true,
  order: 19,
  description: '设备管理、资产台账、车辆管理、办公用品',
  permission: 'asset:read',
  routes: [
    {
      path: '/asset/equipment',
      element: lazyWithRetry(
        () => import('../../pages/asset/EquipmentManagementPage'),
        'EquipmentManagementPage'
      ),
      module: 'asset',
      title: '设备管理',
      code: 'asset-equipment',
      requiredPermissions: ['asset:equipment:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/asset/maintenance',
      element: lazyWithRetry(
        () => import('../../pages/asset/EquipmentMaintenancePage'),
        'EquipmentMaintenancePage'
      ),
      module: 'asset',
      title: '设备维护',
      code: 'asset-maintenance',
      requiredPermissions: ['asset:maintenance:read'],
      template: 'list',
      group: 'process',
    },
    {
      path: '/asset/inspection',
      element: lazyWithRetry(
        () => import('../../pages/asset/EquipmentInspectionPage'),
        'EquipmentInspectionPage'
      ),
      module: 'asset',
      title: '设备巡检',
      code: 'asset-inspection',
      requiredPermissions: ['asset:inspection:read'],
      template: 'list',
      group: 'process',
    },
    {
      path: '/asset/vehicle',
      element: lazyWithRetry(
        () => import('../../pages/asset/VehicleManagementPage'),
        'VehicleManagementPage'
      ),
      module: 'asset',
      title: '车辆管理',
      code: 'asset-vehicle',
      requiredPermissions: ['asset:vehicle:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/asset/voucher-template',
      element: lazyWithRetry(
        () => import('../../pages/asset/VoucherTemplatePage'),
        'VoucherTemplatePage'
      ),
      module: 'asset',
      title: '凭证模板',
      code: 'asset-voucher-template',
      requiredPermissions: ['asset:voucher:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/asset/asset-management',
      element: lazyWithRetry(
        () => import('../../pages/asset/AssetManagementPage'),
        'AssetManagementPage'
      ),
      module: 'asset',
      title: '资产台账',
      code: 'asset-asset-management',
      requiredPermissions: ['asset:asset:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/asset/office-supplies',
      element: lazyWithRetry(
        () => import('../../pages/asset/OfficeSuppliesManagementPage'),
        'OfficeSuppliesManagementPage'
      ),
      module: 'asset',
      title: '办公用品',
      code: 'asset-office-supplies',
      requiredPermissions: ['asset:supplies:read'],
      template: 'list',
      group: 'business',
    },
  ],
};
