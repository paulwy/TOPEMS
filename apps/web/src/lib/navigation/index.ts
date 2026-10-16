import { navigationRegistryV2 } from './NavigationRegistryV2';
import {
  coreModuleNavConfigs,
  adminNavConfig,
  iamNavConfig,
  workflowNavConfig,
  notificationNavConfig,
  docNavConfig,
  monitorNavConfig,
  oaNavConfig,
  aiNavConfig,
  automationNavConfig,
  erpNavConfig,
  hrmNavConfig,
  integrationNavConfig,
  mesNavConfig,
  mobileNavConfig,
  pmNavConfig,
  qmsNavConfig,
  reportNavConfig,
  scmNavConfig,
  ticketNavConfig,
  wmsNavConfig,
  pluginNavConfig,
} from './modules';
import type { ModuleNavConfig } from './types';

/**
 * P4-C-2: Core 平台静态模块（source='core'，默认启用、不可卸载）
 *
 * 分类规则（与 project_memory 约束对齐）：
 * - 企业平台域 (enterprise): iam(1) → admin(2) → erp(3) → report(4) → plugin(5 扩展市场入口)
 * - 协同与工具域 (collaboration): workflow → notification → doc → oa(轻量版) → ticket → mobile
 * - 平台能力域 (platform): ai → automation → integration → monitor
 * - 运营域 (operation/project): pm
 * - 制造域 (manufacturing): mes → qms
 * - 供应链域 (supply): scm → wms
 * - 财务域 (finance): hrm(与 finance_hr L1 域映射)
 *
 * 专业模块（crm/finance/asset/lowcode/bi/im/aps/pdm/rd/srm/lims/gis/tms/ehs 共14个）
 *   - 标记 source='plugin'
 *   - 不在此列表，必须通过「🧩 扩展市场」安装后由 PluginManager 动态注册
 */
const essentialModules: ModuleNavConfig[] = [
  // 企业平台域
  iamNavConfig,
  adminNavConfig,
  erpNavConfig,
  reportNavConfig,
  pluginNavConfig,
  // 协同与工具域
  workflowNavConfig,
  notificationNavConfig,
  docNavConfig,
  oaNavConfig,
  ticketNavConfig,
  mobileNavConfig,
  // 平台能力域
  aiNavConfig,
  automationNavConfig,
  integrationNavConfig,
  monitorNavConfig,
  // 运营/项目域
  pmNavConfig,
  // 制造域
  mesNavConfig,
  qmsNavConfig,
  // 供应链域
  scmNavConfig,
  wmsNavConfig,
  // 财务HR域
  hrmNavConfig,
];

essentialModules.forEach((config) => {
  navigationRegistryV2.registerModule(config);
});

// MONO 内建模式：将全部内建模块（含 bi/crm/finance/asset/im/aps/pdm/rd/srm/lims/gis/tms/ehs 等
// 专业模块，source='plugin'）统一注册进导航注册表。
// 背景：插件市场（pluginApi.listInstalled）当前返回空数组，这些模块不会经 PluginManager
// 动态注册；而面包屑/页签/顶部导航走 navigationRegistryV2.findNavItemByPath/getNavHierarchy，
// 若模块未注册则 /bi/data-analysis 等页面级路径无法命中，落入 useAutoBreadcrumbs 的 URL 段
// fallback，输出英文 PascalCase（如 "Data Analysis"）。
// registerModule 基于 Map.set 幂等，插件市场模式下由 PluginManager 动态注册不受影响。
coreModuleNavConfigs.forEach((config) => {
  navigationRegistryV2.registerModule(config);
});

export { navigationRegistryV2 };
export * from './types';
export * from './hooks';
export { default as SidebarNavGroup } from './components/SidebarNavGroup';
