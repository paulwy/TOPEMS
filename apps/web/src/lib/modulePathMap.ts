/**
 * 模块根路径 → 默认仪表盘页面路径映射表
 *
 * 用途：
 * 1. navTree L2 节点点击时，跳转到对应模块的仪表盘而非裸根路径（避免 404）
 * 2. 路由层 toFlatRouteConfig 为每个模块根路径注入 <Navigate to=dashboard /> 重定向
 *
 * 新增模块时必须在此表补充映射，否则点击侧栏模块卡 / 手动输入根路径会 404。
 */
export const MODULE_ROOT_TO_DASHBOARD: Readonly<Record<string, string>> = Object.freeze({
  '/admin': '/admin/dashboard',
  '/ai': '/ai/dashboard',
  '/aps': '/aps/dashboard',
  '/asset': '/asset/dashboard',
  '/automation': '/automation/dashboard',
  '/bi': '/bi/dashboard',
  '/crm': '/crm/dashboard',
  '/doc': '/doc/dashboard',
  '/ehs': '/ehs/dashboard',
  '/erp': '/erp/dashboard',
  '/finance': '/finance/dashboard',
  '/gis': '/gis/dashboard',
  '/hrm': '/hrm/dashboard',
  '/iam': '/iam/dashboard',
  '/im': '/im/dashboard',
  '/integration': '/integration/dashboard',
  '/lims': '/lims/dashboard',
  '/mes': '/mes/dashboard',
  '/mobile': '/mobile/home',
  '/monitor': '/monitor/dashboard',
  '/notification': '/notification/dashboard',
  '/oa': '/oa/dashboard',
  '/pdm': '/pdm/dashboard',
  '/plugin': '/plugin/dashboard',
  '/pm': '/pm/dashboard',
  '/qms': '/qms/dashboard',
  '/rd': '/rd/dashboard',
  '/registry': '/registry/dashboard',
  '/report': '/report/dashboard',
  '/scm': '/scm/dashboard',
  '/shared': '/shared/dashboard',
  '/srm': '/srm/dashboard',
  '/ticket': '/ticket/dashboard',
  '/tms': '/tms/dashboard',
  '/wms': '/wms/dashboard',
  '/workflow': '/workflow/dashboard',
});

/**
 * 给定模块根路径，返回其默认仪表盘路径；
 * 若未在映射表中注册，则原样返回（兜底行为）。
 */
export function resolveModuleDashboard(rootPath: string): string {
  return MODULE_ROOT_TO_DASHBOARD[rootPath] ?? rootPath;
}
