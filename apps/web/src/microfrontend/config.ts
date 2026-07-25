/**
 * 微前端模块配置中心
 *
 * 每个 remote 对应一个可独立部署的业务域。
 * 核心域（portal）始终加载，业务域按需加载。
 */

export interface RemoteModuleConfig {
  /** 模块名（federation name） */
  name: string;
  /** 模块入口 URL（生产环境从配置中心动态获取） */
  entry: string;
  /** 模块显示名 */
  displayName: string;
  /** 模块图标（MUI icon name） */
  icon: string;
  /** 路由前缀 */
  routePrefix: string;
  /** 是否核心模块（核心模块始终加载，不可卸载） */
  isCore: boolean;
  /** 模块版本要求 */
  requiredVersion?: string;
  /** 回退入口（远程不可用时的降级） */
  fallbackEntry?: string;
  /** 预加载策略：'eager' | 'lazy' | 'visible' | 'network' */
  preload: 'eager' | 'lazy' | 'visible' | 'network';
  /** 权限码（检查用户是否有权限访问该模块） */
  permission?: string;
  /** V39.0: 当前模块版本（由 version-manager 维护，初始化时可留空） */
  version?: string;
  /** V39.0: 灰度入口 URL（灰度发布时使用，与 entry 共存） */
  canaryEntry?: string;
  /** V39.0: 热更新策略：'silent' | 'prompt' | 'force' */
  updateStrategy?: 'silent' | 'prompt' | 'force';
  /** V39.0: 模块关键等级（critical 模块更新时强制刷新） */
  critical?: boolean;
}

/**
 * 从环境变量或默认值获取 remote entry URL
 *
 * 生产环境通过 ENV 注入：
 * VITE_REMOTE_TOPEMS_ERP=https://erp.topems.com/remoteEntry.js
 */
function getRemoteEntry(name: string, defaultValue: string): string {
  const envKey = `VITE_REMOTE_${name.toUpperCase()}`;
  return import.meta.env[envKey] || defaultValue;
}

export const REMOTE_MODULES: RemoteModuleConfig[] = [
  {
    name: 'topems_core',
    entry: getRemoteEntry('topems_core', 'http://localhost:3001/remoteEntry.js'),
    displayName: '核心平台',
    icon: 'Apps',
    routePrefix: '/core',
    isCore: true,
    preload: 'eager',
    updateStrategy: 'force',
    critical: true,
  },
  {
    name: 'topems_erp',
    entry: getRemoteEntry('topems_erp', 'http://localhost:3002/remoteEntry.js'),
    displayName: 'ERP',
    icon: 'AccountBalance',
    routePrefix: '/erp',
    isCore: false,
    preload: 'network',
    permission: 'erp:view',
    updateStrategy: 'prompt',
  },
  {
    name: 'topems_hrm',
    entry: getRemoteEntry('topems_hrm', 'http://localhost:3003/remoteEntry.js'),
    displayName: 'HRM',
    icon: 'People',
    routePrefix: '/hrm',
    isCore: false,
    preload: 'network',
    permission: 'hrm:view',
  },
  {
    name: 'topems_crm',
    entry: getRemoteEntry('topems_crm', 'http://localhost:3004/remoteEntry.js'),
    displayName: 'CRM',
    icon: 'ContactPhone',
    routePrefix: '/crm',
    isCore: false,
    preload: 'network',
    permission: 'crm:view',
  },
  {
    name: 'topems_mes',
    entry: getRemoteEntry('topems_mes', 'http://localhost:3007/remoteEntry.js'),
    displayName: 'MES',
    icon: 'PrecisionManufacturing',
    routePrefix: '/mes',
    isCore: false,
    preload: 'network',
    permission: 'mes:view',
  },
  {
    name: 'topems_scm',
    entry: getRemoteEntry('topems_scm', 'http://localhost:3005/remoteEntry.js'),
    displayName: 'SCM',
    icon: 'LocalShipping',
    routePrefix: '/scm',
    isCore: false,
    preload: 'lazy',
    permission: 'scm:view',
  },
  {
    name: 'topems_wms',
    entry: getRemoteEntry('topems_wms', 'http://localhost:3006/remoteEntry.js'),
    displayName: 'WMS',
    icon: 'Warehouse',
    routePrefix: '/wms',
    isCore: false,
    preload: 'lazy',
    permission: 'wms:view',
  },
  {
    name: 'topems_srm',
    entry: getRemoteEntry('topems_srm', 'http://localhost:3010/remoteEntry.js'),
    displayName: 'SRM',
    icon: 'Handshake',
    routePrefix: '/srm',
    isCore: false,
    preload: 'lazy',
    permission: 'srm:view',
  },
  {
    name: 'topems_pm',
    entry: getRemoteEntry('topems_pm', 'http://localhost:3008/remoteEntry.js'),
    displayName: 'PM',
    icon: 'Assignment',
    routePrefix: '/pm',
    isCore: false,
    preload: 'lazy',
    permission: 'pm:view',
  },
  {
    name: 'topems_finance',
    entry: getRemoteEntry('topems_finance', 'http://localhost:3009/remoteEntry.js'),
    displayName: 'Finance',
    icon: 'Paid',
    routePrefix: '/finance',
    isCore: false,
    preload: 'lazy',
    permission: 'finance:view',
  },
  {
    name: 'topems_pdm',
    entry: getRemoteEntry('topems_pdm', 'http://localhost:3011/remoteEntry.js'),
    displayName: 'PDM',
    icon: 'FolderOpen',
    routePrefix: '/pdm',
    isCore: false,
    preload: 'lazy',
    permission: 'pdm:view',
  },
  {
    name: 'topems_qms',
    entry: getRemoteEntry('topems_qms', 'http://localhost:3012/remoteEntry.js'),
    displayName: 'QMS',
    icon: 'CheckCircle',
    routePrefix: '/qms',
    isCore: false,
    preload: 'lazy',
    permission: 'qms:view',
  },
  {
    name: 'topems_lims',
    entry: getRemoteEntry('topems_lims', 'http://localhost:3013/remoteEntry.js'),
    displayName: 'LIMS',
    icon: 'FlaskConical',
    routePrefix: '/lims',
    isCore: false,
    preload: 'lazy',
    permission: 'lims:view',
  },
  {
    name: 'topems_ehs',
    entry: getRemoteEntry('topems_ehs', 'http://localhost:3014/remoteEntry.js'),
    displayName: 'EHS',
    icon: 'ShieldCheck',
    routePrefix: '/ehs',
    isCore: false,
    preload: 'lazy',
    permission: 'ehs:view',
  },
  {
    name: 'topems_bi',
    entry: getRemoteEntry('topems_bi', 'http://localhost:3015/remoteEntry.js'),
    displayName: 'BI',
    icon: 'BarChart3',
    routePrefix: '/bi',
    isCore: false,
    preload: 'lazy',
    permission: 'bi:view',
  },
  {
    name: 'topems_monitor',
    entry: getRemoteEntry('topems_monitor', 'http://localhost:3016/remoteEntry.js'),
    displayName: 'Monitor',
    icon: 'Activity',
    routePrefix: '/monitor',
    isCore: false,
    preload: 'visible',
    permission: 'monitor:view',
  },
  {
    name: 'topems_ai',
    entry: getRemoteEntry('topems_ai', 'http://localhost:3017/remoteEntry.js'),
    displayName: 'AI',
    icon: 'Sparkles',
    routePrefix: '/ai',
    isCore: false,
    preload: 'lazy',
    permission: 'ai:view',
  },
  {
    name: 'topems_gis',
    entry: getRemoteEntry('topems_gis', 'http://localhost:3018/remoteEntry.js'),
    displayName: 'GIS',
    icon: 'Map',
    routePrefix: '/gis',
    isCore: false,
    preload: 'lazy',
    permission: 'gis:view',
  },
  {
    name: 'topems_doc',
    entry: getRemoteEntry('topems_doc', 'http://localhost:3019/remoteEntry.js'),
    displayName: '文档管理',
    icon: 'FileText',
    routePrefix: '/doc',
    isCore: false,
    preload: 'lazy',
    permission: 'doc:view',
  },
];

/**
 * 获取启用的模块（按权限过滤）
 */
export function getEnabledModules(userPermissions: string[]): RemoteModuleConfig[] {
  return REMOTE_MODULES.filter((m) => {
    // 核心模块始终启用
    if (m.isCore) return true;
    // 无权限要求的模块启用
    if (!m.permission) return true;
    // 检查权限
    return userPermissions.includes(m.permission);
  });
}

/**
 * 按预加载策略分组
 */
export function getModulesByPreloadStrategy(
  strategy: RemoteModuleConfig['preload']
): RemoteModuleConfig[] {
  return REMOTE_MODULES.filter((m) => m.preload === strategy);
}
