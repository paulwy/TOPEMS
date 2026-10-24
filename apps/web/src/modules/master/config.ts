import { lazyWithRetry } from '@/routes/utils';
import i18n from '@/i18n';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';

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
  publicMasterData: '/master/public-master-data',
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
const publicMasterDataRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.publicMasterData,
  element: lazyWithRetry(
    () => import('@/pages/master/PublicMasterDataPage'),
    'PublicMasterDataPage'
  ),
  module: 'master',
  code: 'master-public-master-data',
  title: i18n.t('master.publicMasterData'),
  titleKey: 'master.publicMasterData',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master:data-asset:read'],
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
    publicMasterDataRoute,
  ],
};

export default masterModuleConfig;
