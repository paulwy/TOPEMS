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
  publicMasterData: '/master/public-master-data',
  versioning: '/master/versioning',
  governance: '/master/governance',
  quality: '/master/quality',
  closedLoop: '/master/closed-loop',
  knowledgeGraph: '/master/knowledge-graph',
  semanticSearch: '/master/semantic-search',
  disasterRecovery: '/master/disaster-recovery',
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
  requiredPermissions: ['master-data:data-asset:read'],
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
  requiredPermissions: ['master-data:lineage:read'],
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
  requiredPermissions: ['master-data:ai_governance:read'],
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
  requiredPermissions: ['master-data:commercial:read'],
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
  requiredPermissions: ['master-data:data-asset:read'],
  action: 'read',
};
const disasterRecoveryRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.disasterRecovery,
  element: lazyWithRetry(
    () => import('@/pages/master/MasterDisasterRecoveryPage'),
    'MasterDisasterRecoveryPage'
  ),
  module: 'master',
  code: 'master-disaster-recovery',
  title: i18n.t('master.disasterRecovery'),
  titleKey: 'master.disasterRecovery',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:disaster:read'],
  action: 'read',
};
const semanticSearchRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.semanticSearch,
  element: lazyWithRetry(
    () => import('@/pages/master/MasterSemanticSearchPage'),
    'MasterSemanticSearchPage'
  ),
  module: 'master',
  code: 'master-semantic-search',
  title: i18n.t('master.semanticSearch'),
  titleKey: 'master.semanticSearch',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:semantic:read'],
  action: 'read',
};
const knowledgeGraphRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.knowledgeGraph,
  element: lazyWithRetry(
    () => import('@/pages/master/MasterKnowledgeGraphPage'),
    'MasterKnowledgeGraphPage'
  ),
  module: 'master',
  code: 'master-knowledge-graph',
  title: i18n.t('master.knowledgeGraph'),
  titleKey: 'master.knowledgeGraph',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:knowledge:read'],
  action: 'read',
};
const qualityRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.quality,
  element: lazyWithRetry(() => import('@/pages/master/MasterQualityPage'), 'MasterQualityPage'),
  module: 'master',
  code: 'master-quality',
  title: i18n.t('master.quality'),
  titleKey: 'master.quality',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:quality:read'],
  action: 'read',
};
const closedLoopRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.closedLoop,
  element: lazyWithRetry(() => import('@/pages/master/MdmClosedLoopPage'), 'MdmClosedLoopPage'),
  module: 'master',
  code: 'master-closed-loop',
  title: i18n.t('master.closedLoop.title'),
  titleKey: 'master.closedLoop.title',
  template: 'list',
  group: 'master',
  requiredPermissions: ['system:read'],
  action: 'read',
};

const governanceRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.governance,
  element: lazyWithRetry(
    () => import('@/pages/master/MasterGovernancePage'),
    'MasterGovernancePage'
  ),
  module: 'master',
  code: 'master-governance',
  title: i18n.t('master.governance'),
  titleKey: 'master.governance',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:governance:read'],
  action: 'read',
};
const versioningRoute: RouteConfigV2<Record<string, never>> = {
  path: MASTER_PATHS.versioning,
  element: lazyWithRetry(
    () => import('@/pages/master/MasterVersioningPage'),
    'MasterVersioningPage'
  ),
  module: 'master',
  code: 'master-versioning',
  title: i18n.t('master.versioning'),
  titleKey: 'master.versioning',
  template: 'list',
  group: 'master',
  requiredPermissions: ['master-data:versioning:read'],
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
  permission: 'master-data:data-asset:read',
  routes: [
    dataAssetCatalogRoute,
    schemaRegistryRoute,
    lineageAnalyticsRoute,
    aiGovernanceRoute,
    commercialRoute,
    publicMasterDataRoute,
    versioningRoute,
    governanceRoute,
    qualityRoute,
    closedLoopRoute,
    knowledgeGraphRoute,
    semanticSearchRoute,
    disasterRecoveryRoute,
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
      permission: 'master-data:data-asset:read',
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
      showInSidebar: false,
      description: i18n.t('master.schema_registry.desc'),
    },
    {
      code: 'master-lineage-analytics',
      label: i18n.t('master.lineageAnalytics'),
      labelKey: 'master.lineageAnalytics',
      icon: 'AccountTree',
      path: MASTER_PATHS.lineageAnalytics,
      permission: 'master-data:lineage:read',
      order: 2,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('master.lineage_analytics.desc'),
    },
    {
      code: 'master-ai-governance',
      label: i18n.t('master.aiGovernance'),
      labelKey: 'master.aiGovernance',
      icon: 'AutoAwesome',
      path: MASTER_PATHS.aiGovernance,
      permission: 'master-data:ai_governance:read',
      order: 3,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('master.ai_governance.desc'),
    },
    {
      code: 'master-commercial',
      label: i18n.t('master.commercial'),
      labelKey: 'master.commercial',
      icon: 'Storefront',
      path: MASTER_PATHS.commercial,
      permission: 'master-data:commercial:read',
      order: 4,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.commercial.desc'),
    },
    {
      code: 'master-public-master-data',
      label: i18n.t('master.publicMasterData'),
      labelKey: 'master.publicMasterData',
      icon: 'Boxes',
      path: MASTER_PATHS.publicMasterData,
      permission: 'master-data:data-asset:read',
      order: 5,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.public_master_data.desc'),
    },
    {
      code: 'master-versioning',
      label: i18n.t('master.versioning'),
      labelKey: 'master.versioning',
      icon: 'History',
      path: MASTER_PATHS.versioning,
      permission: 'master-data:versioning:read',
      order: 6,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('master.versioning.desc'),
    },
    {
      code: 'master-governance',
      label: i18n.t('master.governance'),
      labelKey: 'master.governance',
      icon: 'Gauge',
      path: MASTER_PATHS.governance,
      permission: 'master-data:governance:read',
      order: 7,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.governance.desc'),
    },
    {
      code: 'master-quality',
      label: i18n.t('master.quality'),
      labelKey: 'master.quality',
      icon: 'ShieldCheck',
      path: MASTER_PATHS.quality,
      permission: 'master-data:quality:read',
      order: 8,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.quality.desc'),
    },
    {
      code: 'master-closed-loop',
      label: i18n.t('master.closedLoop.title'),
      labelKey: 'master.closedLoop.title',
      icon: 'RefreshCw',
      path: MASTER_PATHS.closedLoop,
      permission: 'system:read',
      order: 9,
      group: 'master',
      showInSidebar: true,
      description: i18n.t('master.closedLoop.subtitle'),
    },
    {
      code: 'master-knowledge-graph',
      label: i18n.t('master.knowledgeGraph'),
      labelKey: 'master.knowledgeGraph',
      icon: 'Network',
      path: MASTER_PATHS.knowledgeGraph,
      permission: 'master-data:knowledge:read',
      order: 9,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('master.knowledgeGraph.desc'),
    },
    {
      code: 'master-semantic-search',
      label: i18n.t('master.semanticSearch'),
      labelKey: 'master.semanticSearch',
      icon: 'Search',
      path: MASTER_PATHS.semanticSearch,
      permission: 'master-data:semantic:read',
      order: 10,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('master.semanticSearch.desc'),
    },
    {
      code: 'master-disaster-recovery',
      label: i18n.t('master.disasterRecovery'),
      labelKey: 'master.disasterRecovery',
      icon: 'LifeBuoy',
      path: MASTER_PATHS.disasterRecovery,
      permission: 'master-data:disaster:read',
      order: 11,
      group: 'master',
      showInSidebar: false,
      description: i18n.t('master.disasterRecovery.desc'),
    },
  ],
};

export default masterModuleConfig;
