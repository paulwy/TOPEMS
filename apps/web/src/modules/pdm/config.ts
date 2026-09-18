import { lazyWithRetry } from '@/routes/utils';
import type {
  RouteConfigV2,
  RouteModuleConfig,
  ListPageProps,
  FormPageProps,
} from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import type { ProductQuery, MaterialQuery, CreateProductRequest } from '@/api/pdm';
import i18n from '@/i18n';

// ---- 路径常量：唯一真相源 ----
// 组件中应引用 PDM_PATHS.xxx，而非硬编码字符串

const PDM_PATHS = {
  root: '/pdm',
  product: '/pdm/product',
  material: '/pdm/material',
  bom: '/pdm/bom',
  pdmBom: '/pdm/pdm-bom',
  document: '/pdm/document',
  version: '/pdm/version',
  change: '/pdm/change',
  project: '/pdm/project',
  productConfig: '/pdm/product-config',
  formula: '/pdm/formula',
  process: '/pdm/process',
  batch: '/pdm/batch',
  step: '/pdm/step',
  stats: '/pdm/stats',
  dashboard: '/pdm/dashboard',
  productCategory: '/pdm/product-category',
  settingBomTemplate: '/pdm/setting/bom-template',
  settingCategoryRule: '/pdm/setting/category-rule',
  settingDocApprovalFlow: '/pdm/setting/doc-approval-flow',
  settingChangeTemplate: '/pdm/setting/change-template',
} as const;
// V259 TypeMap: filters/initialValues 从 Record<string, unknown> 升级为具体 schema
// 已对齐后端 DTO: Product ← ProductQuery, Material ← MaterialQuery, ProductConfig ← CreateProductRequest
// 其余实体暂用 ListPageProps 默认（Record<string, unknown>），待后端 DTO 联动后逐一收紧
interface ProductPageProps extends ListPageProps<ProductQuery> {}
interface MaterialPageProps extends ListPageProps<MaterialQuery> {}
interface BomPageProps extends ListPageProps {}
interface PdmBomPageProps extends ListPageProps {}
interface DocumentPageProps extends ListPageProps {}
interface PdmVersionPageProps extends ListPageProps {}
interface ChangePageProps extends ListPageProps {}
interface PdmProjectPageProps extends ListPageProps {}
interface PdmProductConfigPageProps extends FormPageProps<CreateProductRequest> {}
interface PdmFormulaPageProps extends ListPageProps {}
interface PdmProcessPageProps extends ListPageProps {}
interface PdmBatchPageProps extends ListPageProps {}
interface PdmStepPageProps extends ListPageProps {}

interface PdmStatsPageProps {}

interface PdmDashboardPageProps {}

interface PdmProductCategoryPageProps {}

interface BomTemplatePageProps {}

interface CategoryRulePageProps {}

interface DocApprovalFlowPageProps {}

interface ChangeTemplatePageProps {}

const productRoute: RouteConfigV2<ProductPageProps> = {
  path: PDM_PATHS.product,
  element: lazyWithRetry(() => import('@/pages/pdm/ProductPage'), 'ProductPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-product'),
  titleKey: 'pdm.nav.pdm-product',
  code: 'pdm-product',
  requiredPermissions: ['pdm:product:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const materialRoute: RouteConfigV2<MaterialPageProps> = {
  path: PDM_PATHS.material,
  element: lazyWithRetry(() => import('@/pages/pdm/MaterialPage'), 'MaterialPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-material'),
  titleKey: 'pdm.nav.pdm-material',
  code: 'pdm-material',
  requiredPermissions: ['pdm:material:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const bomRoute: RouteConfigV2<BomPageProps> = {
  path: PDM_PATHS.bom,
  element: lazyWithRetry(() => import('@/pages/pdm/BomPage'), 'BomPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-bom'),
  titleKey: 'pdm.nav.pdm-bom',
  code: 'pdm-bom',
  requiredPermissions: ['pdm:bom:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmBomRoute: RouteConfigV2<PdmBomPageProps> = {
  path: PDM_PATHS.pdmBom,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmBomPage'), 'PdmBomPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-pdm-bom'),
  titleKey: 'pdm.nav.pdm-pdm-bom',
  code: 'pdm-pdm-bom',
  requiredPermissions: ['pdm:bom:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const documentRoute: RouteConfigV2<DocumentPageProps> = {
  path: PDM_PATHS.document,
  element: lazyWithRetry(() => import('@/pages/pdm/DocumentPage'), 'DocumentPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-document'),
  titleKey: 'pdm.nav.pdm-document',
  code: 'pdm-document',
  requiredPermissions: ['pdm:document:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmVersionRoute: RouteConfigV2<PdmVersionPageProps> = {
  path: PDM_PATHS.version,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmVersionPage'), 'PdmVersionPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-version'),
  titleKey: 'pdm.nav.pdm-version',
  code: 'pdm-version',
  requiredPermissions: ['pdm:version:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const changeRoute: RouteConfigV2<ChangePageProps> = {
  path: PDM_PATHS.change,
  element: lazyWithRetry(() => import('@/pages/pdm/ChangePage'), 'ChangePage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-change'),
  titleKey: 'pdm.nav.pdm-change',
  code: 'pdm-change',
  requiredPermissions: ['pdm:change:read'],
  action: 'read',
  template: 'list',
  group: 'process',
};

const pdmProjectRoute: RouteConfigV2<PdmProjectPageProps> = {
  path: PDM_PATHS.project,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmProjectPage'), 'PdmProjectPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-project'),
  titleKey: 'pdm.nav.pdm-project',
  code: 'pdm-project',
  requiredPermissions: ['pdm:project:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmProductConfigRoute: RouteConfigV2<PdmProductConfigPageProps> = {
  path: PDM_PATHS.productConfig,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmProductConfigPage'), 'PdmProductConfigPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-product-config'),
  titleKey: 'pdm.nav.pdm-product-config',
  code: 'pdm-product-config',
  requiredPermissions: ['pdm:product:read'],
  action: 'read',
  template: 'form',
  group: 'master',
};

const pdmFormulaRoute: RouteConfigV2<PdmFormulaPageProps> = {
  path: PDM_PATHS.formula,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmFormulaPage'), 'PdmFormulaPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-formula'),
  titleKey: 'pdm.nav.pdm-formula',
  code: 'pdm-formula',
  requiredPermissions: ['pdm:formula:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmProcessRoute: RouteConfigV2<PdmProcessPageProps> = {
  path: PDM_PATHS.process,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmProcessPage'), 'PdmProcessPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-process'),
  titleKey: 'pdm.nav.pdm-process',
  code: 'pdm-process',
  requiredPermissions: ['pdm:process:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmBatchRoute: RouteConfigV2<PdmBatchPageProps> = {
  path: PDM_PATHS.batch,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmBatchPage'), 'PdmBatchPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-batch'),
  titleKey: 'pdm.nav.pdm-batch',
  code: 'pdm-batch',
  requiredPermissions: ['pdm:batch:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmStepRoute: RouteConfigV2<PdmStepPageProps> = {
  path: PDM_PATHS.step,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmStepPage'), 'PdmStepPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-step'),
  titleKey: 'pdm.nav.pdm-step',
  code: 'pdm-step',
  requiredPermissions: ['pdm:step:read'],
  action: 'read',
  template: 'list',
  group: 'master',
};

const pdmStatsRoute: RouteConfigV2<PdmStatsPageProps> = {
  path: PDM_PATHS.stats,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmStatsPage'), 'PdmStatsPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-stats'),
  titleKey: 'pdm.nav.pdm-stats',
  code: 'pdm-stats',
  requiredPermissions: ['pdm:stats:read'],
  action: 'read',
  template: 'stats',
  group: 'analytics',
};

const pdmDashboardRoute: RouteConfigV2<PdmDashboardPageProps> = {
  path: PDM_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/pdm/PdmDashboardPage'), 'PdmDashboardPage'),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-dashboard'),
  titleKey: 'pdm.nav.pdm-dashboard',
  code: 'pdm-dashboard',
  requiredPermissions: ['pdm:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const pdmProductCategoryRoute: RouteConfigV2<PdmProductCategoryPageProps> = {
  path: PDM_PATHS.productCategory,
  element: lazyWithRetry(
    () => import('@/pages/pdm/PdmProductCategoryPage'),
    'PdmProductCategoryPage'
  ),
  module: 'pdm',
  title: i18n.t('pdm.nav.pdm-product-category'),
  titleKey: 'pdm.nav.pdm-product-category',
  code: 'pdm-product-category',
  requiredPermissions: ['pdm:product_category:read'],
  action: 'read',
  template: 'tree',
  group: 'master',
};

const bomTemplateRoute: RouteConfigV2<BomTemplatePageProps> = {
  path: PDM_PATHS.settingBomTemplate,
  element: lazyWithRetry(() => import('@/pages/pdm/setting/BomTemplatePage'), 'BomTemplatePage'),
  module: 'pdm',
  code: 'pdm-bom-template',
  title: i18n.t('pdm.nav.pdm-bom-template'),
  titleKey: 'pdm.nav.pdm-bom-template',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['pdm:bom_template:read'],
  action: 'read',
};

const categoryRuleRoute: RouteConfigV2<CategoryRulePageProps> = {
  path: PDM_PATHS.settingCategoryRule,
  element: lazyWithRetry(() => import('@/pages/pdm/setting/CategoryRulePage'), 'CategoryRulePage'),
  module: 'pdm',
  code: 'pdm-category-rule',
  title: i18n.t('pdm.nav.pdm-category-rule'),
  titleKey: 'pdm.nav.pdm-category-rule',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['pdm:category_rule:read'],
  action: 'read',
};

const docApprovalFlowRoute: RouteConfigV2<DocApprovalFlowPageProps> = {
  path: PDM_PATHS.settingDocApprovalFlow,
  element: lazyWithRetry(
    () => import('@/pages/pdm/setting/DocApprovalFlowPage'),
    'DocApprovalFlowPage'
  ),
  module: 'pdm',
  code: 'pdm-doc-approval-flow',
  title: i18n.t('pdm.nav.pdm-doc-approval-flow'),
  titleKey: 'pdm.nav.pdm-doc-approval-flow',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['pdm:doc_approval_flow:read'],
  action: 'read',
};

const changeTemplateRoute: RouteConfigV2<ChangeTemplatePageProps> = {
  path: PDM_PATHS.settingChangeTemplate,
  element: lazyWithRetry(
    () => import('@/pages/pdm/setting/ChangeTemplatePage'),
    'ChangeTemplatePage'
  ),
  module: 'pdm',
  code: 'pdm-change-template',
  title: i18n.t('pdm.nav.pdm-change-template'),
  titleKey: 'pdm.nav.pdm-change-template',
  template: 'settings',
  group: 'setting',
  requiredPermissions: ['pdm:change_template:read'],
  action: 'read',
};

// ---- 路由配置（供路由系统使用） ----
export const pdmModuleConfig: RouteModuleConfig = {
  code: 'pdm',
  name: i18n.t('shared.config.pdm_name'),
  nameKey: 'shared.config.pdm_name',
  icon: 'Package',
  path: PDM_PATHS.root,
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 13,
  description: i18n.t('pdm.nav.module_name_desc'),
  permission: 'pdm:module:read',
  routes: [
    productRoute,
    materialRoute,
    bomRoute,
    pdmBomRoute,
    documentRoute,
    pdmVersionRoute,
    changeRoute,
    pdmProjectRoute,
    pdmProductConfigRoute,
    pdmFormulaRoute,
    pdmProcessRoute,
    pdmBatchRoute,
    pdmStepRoute,
    pdmStatsRoute,
    pdmDashboardRoute,
    pdmProductCategoryRoute,
    bomTemplateRoute,
    categoryRuleRoute,
    docApprovalFlowRoute,
    changeTemplateRoute,
  ],
};

// ---- 导航配置（供导航注册表使用） ----
export const pdmNavConfig: ModuleNavConfig = {
  code: 'pdm',
  name: i18n.t('pdm.nav.module_name'),
  nameKey: 'pdm.nav.module_name',
  icon: 'Package',
  path: PDM_PATHS.root,
  permission: 'pdm:module:read',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 13,
  description: i18n.t('pdm.nav.module_name_desc'),
  navItems: [
    {
      code: 'pdm-dashboard',
      label: i18n.t('pdm.nav.pdm-dashboard'),
      labelKey: 'pdm.nav.pdm-dashboard',
      icon: 'LayoutDashboard',
      path: PDM_PATHS.dashboard,
      permission: 'pdm:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('pdm.nav.pdm-dashboard_desc'),
    },
    {
      code: 'pdm-product',
      label: i18n.t('pdm.nav.pdm-product'),
      labelKey: 'pdm.nav.pdm-product',
      icon: 'Box',
      path: PDM_PATHS.product,
      permission: 'pdm:product:read',
      order: 1,
      group: 'master',
      showInTabs: true,
      description: i18n.t('pdm.nav.pdm-product_desc'),
    },
    {
      code: 'pdm-material',
      label: i18n.t('pdm.nav.pdm-material'),
      labelKey: 'pdm.nav.pdm-material',
      icon: 'Layers',
      path: PDM_PATHS.material,
      permission: 'pdm:material:read',
      order: 2,
      group: 'master',
      showInTabs: true,
      description: i18n.t('pdm.nav.pdm-material_desc'),
    },
    {
      code: 'pdm-bom',
      label: i18n.t('pdm.nav.pdm-bom'),
      labelKey: 'pdm.nav.pdm-bom',
      icon: 'GitBranch',
      path: PDM_PATHS.bom,
      permission: 'pdm:bom:read',
      order: 3,
      group: 'master',
      showInTabs: true,
      description: i18n.t('pdm.nav.pdm-bom_desc'),
    },
    {
      code: 'pdm-pdm-bom',
      label: i18n.t('pdm.nav.pdm-pdm-bom'),
      labelKey: 'pdm.nav.pdm-pdm-bom',
      icon: 'Network',
      path: PDM_PATHS.pdmBom,
      permission: 'pdm:bom:read',
      order: 4,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-pdm-bom_desc'),
    },
    {
      code: 'pdm-document',
      label: i18n.t('pdm.nav.pdm-document'),
      labelKey: 'pdm.nav.pdm-document',
      icon: 'FileText',
      path: PDM_PATHS.document,
      permission: 'pdm:document:read',
      order: 5,
      group: 'master',
      showInTabs: true,
      description: i18n.t('pdm.nav.pdm-document_desc'),
    },
    {
      code: 'pdm-version',
      label: i18n.t('pdm.nav.pdm-version'),
      labelKey: 'pdm.nav.pdm-version',
      icon: 'Tag',
      path: PDM_PATHS.version,
      permission: 'pdm:version:read',
      order: 1,
      group: 'process',
      description: i18n.t('pdm.nav.pdm-version_desc'),
    },
    {
      code: 'pdm-change',
      label: i18n.t('pdm.nav.pdm-change'),
      labelKey: 'pdm.nav.pdm-change',
      icon: 'RefreshCw',
      path: PDM_PATHS.change,
      permission: 'pdm:change:read',
      order: 2,
      group: 'process',
      showInTabs: true,
      description: i18n.t('pdm.nav.pdm-change_desc'),
    },
    {
      code: 'pdm-project',
      label: i18n.t('pdm.nav.pdm-project'),
      labelKey: 'pdm.nav.pdm-project',
      icon: 'FolderKanban',
      path: PDM_PATHS.project,
      permission: 'pdm:project:read',
      order: 6,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-project_desc'),
    },
    {
      code: 'pdm-product-config',
      label: i18n.t('pdm.nav.pdm-product-config'),
      labelKey: 'pdm.nav.pdm-product-config',
      icon: 'Settings2',
      path: PDM_PATHS.productConfig,
      permission: 'pdm:product:read',
      order: 7,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-product-config_desc'),
    },
    {
      code: 'pdm-formula',
      label: i18n.t('pdm.nav.pdm-formula'),
      labelKey: 'pdm.nav.pdm-formula',
      icon: 'FlaskConical',
      path: PDM_PATHS.formula,
      permission: 'pdm:formula:read',
      order: 8,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-formula_desc'),
    },
    {
      code: 'pdm-process',
      label: i18n.t('pdm.nav.pdm-process'),
      labelKey: 'pdm.nav.pdm-process',
      icon: 'Activity',
      path: PDM_PATHS.process,
      permission: 'pdm:process:read',
      order: 9,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-process_desc'),
    },
    {
      code: 'pdm-batch',
      label: i18n.t('pdm.nav.pdm-batch'),
      labelKey: 'pdm.nav.pdm-batch',
      icon: 'Hash',
      path: PDM_PATHS.batch,
      permission: 'pdm:batch:read',
      order: 10,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-batch_desc'),
    },
    {
      code: 'pdm-step',
      label: i18n.t('pdm.nav.pdm-step'),
      labelKey: 'pdm.nav.pdm-step',
      icon: 'CircleDot',
      path: PDM_PATHS.step,
      permission: 'pdm:step:read',
      order: 11,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-step_desc'),
    },
    {
      code: 'pdm-stats',
      label: i18n.t('pdm.nav.pdm-stats'),
      labelKey: 'pdm.nav.pdm-stats',
      icon: 'BarChart3',
      path: PDM_PATHS.stats,
      permission: 'pdm:stats:read',
      order: 1,
      group: 'analytics',
      description: i18n.t('pdm.nav.pdm-stats_desc'),
    },
    {
      code: 'pdm-product-category',
      label: i18n.t('pdm.nav.pdm-product-category'),
      labelKey: 'pdm.nav.pdm-product-category',
      icon: 'Tags',
      path: PDM_PATHS.productCategory,
      permission: 'pdm:product_category:read',
      order: 12,
      group: 'master',
      description: i18n.t('pdm.nav.pdm-product-category_desc'),
    },
    {
      code: 'pdm-bom-template',
      label: i18n.t('pdm.nav.pdm-bom-template'),
      labelKey: 'pdm.nav.pdm-bom-template',
      icon: 'GitBranch',
      path: PDM_PATHS.settingBomTemplate,
      permission: 'pdm:bom_template:read',
      order: 1,
      group: 'setting',
      description: i18n.t('pdm.nav.pdm-bom-template_desc'),
    },
    {
      code: 'pdm-category-rule',
      label: i18n.t('pdm.nav.pdm-category-rule'),
      labelKey: 'pdm.nav.pdm-category-rule',
      icon: 'Tags',
      path: PDM_PATHS.settingCategoryRule,
      permission: 'pdm:category_rule:read',
      order: 2,
      group: 'setting',
      description: i18n.t('pdm.nav.pdm-category-rule_desc'),
    },
    {
      code: 'pdm-doc-approval-flow',
      label: i18n.t('pdm.nav.pdm-doc-approval-flow'),
      labelKey: 'pdm.nav.pdm-doc-approval-flow',
      icon: 'FileCheck',
      path: PDM_PATHS.settingDocApprovalFlow,
      permission: 'pdm:doc_approval_flow:read',
      order: 3,
      group: 'setting',
      description: i18n.t('pdm.nav.pdm-doc-approval-flow_desc'),
    },
    {
      code: 'pdm-change-template',
      label: i18n.t('pdm.nav.pdm-change-template'),
      labelKey: 'pdm.nav.pdm-change-template',
      icon: 'RefreshCw',
      path: PDM_PATHS.settingChangeTemplate,
      permission: 'pdm:change_template:read',
      order: 4,
      group: 'setting',
      description: i18n.t('pdm.nav.pdm-change-template_desc'),
    },
  ],
};
