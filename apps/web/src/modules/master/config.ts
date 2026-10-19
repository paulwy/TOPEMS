import { lazyWithRetry } from '@/routes/utils';
import i18n from '@/i18n';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

/**
 * Master Data 模块配置
 *
 * 【2026-09-10 卡2试点】数据资产目录（Data Asset Catalog V66）试点上线。
 * 后端复用 master-data V60 metadata 模块（/mdm-v60/metadata + /mdm-v60/lineage），
 * 前端 API 已改指 V60 路由，高级功能（血缘图谱/标签管理/分类树/数据地图）保留预埋。
 */

/** 数据资产目录页 Props */
interface DataAssetCatalogPageProps {
  /** 搜索关键词 */
  search?: string;
  /** 资产类型筛选 */
  type?: string;
  /** 状态筛选 */
  status?: string;
}

// ---- 路径常量 ----
const MASTER_PATHS = {
  root: '/master',
  dataAssetCatalog: '/master/data-asset-catalog',
  schemaRegistry: '/master/schema-registry',
  lineageAnalytics: '/master/lineage-analytics',
  aiGovernance: '/master/ai-governance',
  commercial: '/master/commercial',
} as const;

// ---- 路由配置 ----
const dataAssetCatalogRoute: RouteConfigV2<DataAssetCatalogPageProps> = {
  path: MASTER_PATHS.dataAssetCatalog,
  element: lazyWithRetry(
    () => import('@/pages/master/DataAssetCatalogPage'),
    'DataAssetCatalogPage'
  ),
  module: 'master',
  code: 'master-data-asset-catalog',
  title: i18n.t('master.dataAssetCatalog'),
  titleKey: 'master.dataAssetCatalog',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master:data-asset:read'],
  action: 'read',
};

const schemaRegistryRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.schemaRegistry,
  element: lazyWithRetry(() => import('@/pages/master/SchemaRegistryPage'), 'SchemaRegistryPage'),
  module: 'master',
  code: 'master-schema-registry',
  title: i18n.t('master.schemaRegistry'),
  titleKey: 'master.schemaRegistry',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:schema:read'],
  action: 'read',
};

const lineageAnalyticsRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.lineageAnalytics,
  element: lazyWithRetry(
    () => import('@/pages/master/LineageAnalyticsPage'),
    'LineageAnalyticsPage'
  ),
  module: 'master',
  code: 'master-lineage-analytics',
  title: i18n.t('master.lineageAnalytics'),
  titleKey: 'master.lineageAnalytics',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master_data:lineage:read'],
  action: 'read',
};

const aiGovernanceRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.aiGovernance,
  element: lazyWithRetry(() => import('@/pages/master/AiGovernancePage'), 'AiGovernancePage'),
  module: 'master',
  code: 'master-ai-governance',
  title: i18n.t('master.aiGovernance'),
  titleKey: 'master.aiGovernance',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master_data:ai_governance:read'],
  action: 'read',
};

const commercialRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.commercial,
  element: lazyWithRetry(
    () => import('@/pages/master/CommercialConsolePage'),
    'CommercialConsolePage'
  ),
  module: 'master',
  code: 'master-commercial',
  title: i18n.t('master.commercial'),
  titleKey: 'master.commercial',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master_data:commercial:read'],
  action: 'read',
};

export const masterModuleConfig: RouteModuleConfig = {
  code: 'master',
  name: i18n.t('master.moduleName'),
  nameKey: 'master.moduleName',
  icon: 'Database',
  path: MASTER_PATHS.root,
  source: 'plugin',
  suite: 'platform',
  status: 'online',
  order: 95,
  description: i18n.t('master.module_desc'),
  permission: 'master:data-asset:read',
  routes: [
    dataAssetCatalogRoute,
    schemaRegistryRoute,
    lineageAnalyticsRoute,
    aiGovernanceRoute,
    commercialRoute,
  ],
};

// ---- 导航菜单配置 ----
export const masterNavConfig: ModuleNavConfig = {
  code: 'master',
  name: i18n.t('master.moduleName'),
  nameKey: 'master.moduleName',
  icon: 'Database',
  path: MASTER_PATHS.root,
  source: 'plugin' as const,
  suite: 'platform',
  order: 95,
  navItems: [
    {
      code: 'master-data-asset-catalog',
      label: i18n.t('master.dataAssetCatalog'),
      labelKey: 'master.dataAssetCatalog',
      icon: 'Database',
      path: MASTER_PATHS.dataAssetCatalog,
      permission: 'master:data-asset:read',
      order: 0,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.data_asset_catalog.desc'),
    },
    {
      code: 'master-schema-registry',
      label: i18n.t('master.schemaRegistry'),
      labelKey: 'master.schemaRegistry',
      icon: 'Database',
      path: MASTER_PATHS.schemaRegistry,
      permission: 'master-data:schema:read',
      order: 1,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.schema_registry.desc'),
    },
    {
      code: 'master-lineage-analytics',
      label: i18n.t('master.lineageAnalytics'),
      labelKey: 'master.lineageAnalytics',
      icon: 'AccountTree',
      path: MASTER_PATHS.lineageAnalytics,
      permission: 'master_data:lineage:read',
      order: 2,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.lineage_analytics.desc'),
    },
    {
      code: 'master-ai-governance',
      label: i18n.t('master.aiGovernance'),
      labelKey: 'master.aiGovernance',
      icon: 'AutoAwesome',
      path: MASTER_PATHS.aiGovernance,
      permission: 'master_data:ai_governance:read',
      order: 3,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.ai_governance.desc'),
    },
    {
      code: 'master-commercial',
      label: i18n.t('master.commercial'),
      labelKey: 'master.commercial',
      icon: 'Storefront',
      path: MASTER_PATHS.commercial,
      permission: 'master_data:commercial:read',
      order: 4,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.commercial.desc'),
    },
  ],
};

export default masterModuleConfig;
