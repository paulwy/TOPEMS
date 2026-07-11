import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 ASSET_PATHS.xxx，而非硬编码字符串
export const ASSET_PATHS = {
  root: '/asset',
  equipment: '/asset/equipment',
  maintenance: '/asset/maintenance',
  inspection: '/asset/inspection',
  vehicle: '/asset/vehicle',
  voucherTemplate: '/asset/voucher-template',
  assetManagement: '/asset/asset-management',
  officeSupplies: '/asset/office-supplies',
} as const;

// ---- 路由配置（供路由系统使用） ----
export const assetModuleConfig: RouteModuleConfig = {
  code: 'asset',
  name: '资产管理',
  icon: 'Landmark',
  path: ASSET_PATHS.root,
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  frontendOnly: true,
  order: 19,
  description: '设备管理、资产台账、车辆管理、办公用品',
  permission: 'asset:read',
  routes: [
    {
      path: ASSET_PATHS.equipment,
      element: lazyWithRetry(
        () => import('@/pages/asset/EquipmentManagementPage'),
        'EquipmentManagementPage'
      ),
      module: 'asset',
      title: '设备管理',
      code: 'asset-equipment',
      requiredPermissions: ['asset:equipment:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
    {
      path: ASSET_PATHS.maintenance,
      element: lazyWithRetry(
        () => import('@/pages/asset/EquipmentMaintenancePage'),
        'EquipmentMaintenancePage'
      ),
      module: 'asset',
      title: '设备维护',
      code: 'asset-maintenance',
      requiredPermissions: ['asset:maintenance:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    },
    {
      path: ASSET_PATHS.inspection,
      element: lazyWithRetry(
        () => import('@/pages/asset/EquipmentInspectionPage'),
        'EquipmentInspectionPage'
      ),
      module: 'asset',
      title: '设备巡检',
      code: 'asset-inspection',
      requiredPermissions: ['asset:inspection:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'process',
    },
    {
      path: ASSET_PATHS.vehicle,
      element: lazyWithRetry(
        () => import('@/pages/asset/VehicleManagementPage'),
        'VehicleManagementPage'
      ),
      module: 'asset',
      title: '车辆管理',
      code: 'asset-vehicle',
      requiredPermissions: ['asset:vehicle:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
    {
      path: ASSET_PATHS.voucherTemplate,
      element: lazyWithRetry(
        () => import('@/pages/asset/VoucherTemplatePage'),
        'VoucherTemplatePage'
      ),
      module: 'asset',
      title: '凭证模板',
      code: 'asset-voucher-template',
      requiredPermissions: ['asset:voucher:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
    {
      path: ASSET_PATHS.assetManagement,
      element: lazyWithRetry(
        () => import('@/pages/asset/AssetManagementPage'),
        'AssetManagementPage'
      ),
      module: 'asset',
      title: '资产台账',
      code: 'asset-asset-management',
      requiredPermissions: ['asset:asset:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
    {
      path: ASSET_PATHS.officeSupplies,
      element: lazyWithRetry(
        () => import('@/pages/asset/OfficeSuppliesManagementPage'),
        'OfficeSuppliesManagementPage'
      ),
      module: 'asset',
      title: '办公用品',
      code: 'asset-office-supplies',
      requiredPermissions: ['asset:supplies:read', 'asset:read'],
      action: 'read',
      template: 'list',
      group: 'business',
    },
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const assetNavConfig: ModuleNavConfig = {
  code: 'asset',
  name: '资产管理',
  icon: 'Landmark',
  path: ASSET_PATHS.root,
  permission: 'asset:read',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 19,
  description: '设备管理、资产台账、车辆管理、办公用品',
  navItems: [
    {
      code: 'asset-equipment',
      label: '设备管理',
      icon: 'Server',
      path: ASSET_PATHS.equipment,
      permission: 'asset:equipment:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '设备信息管理',
    },
    {
      code: 'asset-maintenance',
      label: '设备维护',
      icon: 'Wrench',
      path: ASSET_PATHS.maintenance,
      permission: 'asset:maintenance:read',
      order: 1,
      group: 'process',
      showInTabs: true,
      description: '设备维护管理',
    },
    {
      code: 'asset-inspection',
      label: '设备巡检',
      icon: 'ClipboardCheck',
      path: ASSET_PATHS.inspection,
      permission: 'asset:inspection:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: '设备巡检管理',
    },
    {
      code: 'asset-vehicle',
      label: '车辆管理',
      icon: 'Car',
      path: ASSET_PATHS.vehicle,
      permission: 'asset:vehicle:read',
      order: 2,
      group: 'business',
      showInTabs: true,
      description: '车辆信息管理',
    },
    {
      code: 'asset-voucher-template',
      label: '凭证模板',
      icon: 'FileText',
      path: ASSET_PATHS.voucherTemplate,
      permission: 'asset:voucher:read',
      order: 3,
      group: 'business',
      showInTabs: true,
      description: '资产凭证模板',
    },
    {
      code: 'asset-asset-management',
      label: '资产台账',
      icon: 'Database',
      path: ASSET_PATHS.assetManagement,
      permission: 'asset:asset:read',
      order: 4,
      group: 'business',
      showInTabs: true,
      description: '资产台账管理',
    },
    {
      code: 'asset-office-supplies',
      label: '办公用品',
      icon: 'PenTool',
      path: ASSET_PATHS.officeSupplies,
      permission: 'asset:supplies:read',
      order: 5,
      group: 'business',
      showInTabs: true,
      description: '办公用品管理',
    },
  ],
};
