/**
 * 侧边栏菜单权限映射（P1-4 前端权限守卫 · 菜单过滤）
 *
 * key  = GlobalLayoutV3 navItems 顶层项（组/叶子）的 path
 * value= 该菜单项所需权限码（与模块 config.ts requiredPermissions 对齐）
 *
 * 过滤规则：无映射的 path 恒显示（如全局 dashboard）；有映射的 path 在用户
 * 无对应权限时隐藏该菜单组/项（子菜单随组显隐，细粒度到叶子可后续迭代）。
 * 权限码来源：各模块 config.ts 首条 requiredPermissions（模块级代表码）。
 */
export const MENU_PERMISSIONS: Record<string, string> = {
  // 全局
  // '/dashboard' —— 全局入口，不设权限恒显示

  // 模块组（顶层 path = 模块 dashboard）
  '/admin/dashboard': 'admin:dashboard:read',
  '/asset/dashboard': 'asset:dashboard:read',
  '/ai/dashboard': 'ai:dashboard:read',
  '/bi/dashboard': 'bi:dashboard:read',
  '/crm/dashboard': 'crm:dashboard:read',
  '/doc/dashboard': 'doc:dashboard:read',
  '/ehs/dashboard': 'ehs:check:read',
  '/erp/dashboard': 'erp:dashboard:read',
  '/finance/dashboard': 'finance:dashboard:read',
  '/gis/dashboard': 'gis:dashboard:read',
  '/hrm/dashboard': 'hrm:dashboard:read',
  '/im/dashboard': 'im:dashboard:read',
  '/lims/dashboard': 'lims:sample:read',
  '/master/dashboard': 'master:data-asset:read',
  '/mes/dashboard': 'mes:dashboard:read',
  '/pdm/dashboard': 'pdm:product:read',
  '/pm/dashboard': 'pm:dashboard:read',
  '/qms/dashboard': 'qms:dashboard:read',
  '/rd/dashboard': 'rd:dashboard:read',
  '/scm/dashboard': 'scm:dashboard:read',
  '/srm/dashboard': 'srm:dashboard:read',
  '/tms/dashboard': 'tms:dashboard:read',
  '/wms/dashboard': 'wms:dashboard:read',
  '/workflow/dashboard': 'workflow:dashboard:read',

  // 顶层叶子项
  '/iam/user': 'iam:dashboard:read',
  '/mes/wip': 'mes:dashboard:read',
  '/qms/eightd': 'qms:dashboard:read',
  '/bi/report': 'bi:dashboard:read',
  '/bi/dataset': 'bi:dashboard:read',
  '/gis/map': 'gis:dashboard:read',
  '/gis/fence': 'gis:dashboard:read',
  '/doc/list': 'doc:dashboard:read',
  '/im/mail': 'im:dashboard:read',
  '/asset/list': 'asset:dashboard:read',
  '/pdm/bom': 'pdm:product:read',
  '/pdm/process': 'pdm:product:read',
  '/monitor/dashboard': 'monitor:dashboard:read',
  '/notification/dashboard': 'notification:dashboard:read',
};
