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
 * 开发模式（module-federation）下，使用 Vite 代理路径避免 CORS 问题
 * 生产环境通过 ENV 注入完整 URL：
 * VITE_REMOTE_TOPEMS_ERP=https://erp.topems.com/remoteEntry.js
 */
function getRemoteEntry(name: string, port: number): string {
  const envKey = `VITE_REMOTE_${name.toUpperCase()}`;
  const envUrl = import.meta.env[envKey];

  // 如果环境变量设置了完整 URL，直接使用（生产环境）
  if (envUrl) {
    return envUrl;
  }

  // 开发模式：使用 Vite 代理路径避免 CORS
  // 主应用 (localhost:3000) 代理到远程模块 (localhost:{port})
  const deploymentMode = import.meta.env.VITEDeploymentMode || 'static';
  if (deploymentMode === 'module-federation') {
    return `/remote/${name}/remoteEntry.js`;
  }

  // 默认：直接访问（可能会有 CORS 问题）
  return `http://localhost:${port}/remoteEntry.js`;
}

export const REMOTE_MODULES: RemoteModuleConfig[] = [
  {
    name: 'topems_core',
    entry: getRemoteEntry('topems_core', 3001),
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
    entry: getRemoteEntry('topems_erp', 3002),
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
    entry: getRemoteEntry('topems_hrm', 3003),
    displayName: 'HRM',
    icon: 'People',
    routePrefix: '/hrm',
    isCore: false,
    preload: 'network',
    permission: 'hrm:view',
  },
  {
    name: 'topems_crm',
    entry: getRemoteEntry('topems_crm', 3004),
    displayName: 'CRM',
    icon: 'ContactPhone',
    routePrefix: '/crm',
    isCore: false,
    preload: 'network',
    permission: 'crm:view',
  },
  {
    name: 'topems_mes',
    entry: getRemoteEntry('topems_mes', 3007),
    displayName: 'MES',
    icon: 'PrecisionManufacturing',
    routePrefix: '/mes',
    isCore: false,
    preload: 'network',
    permission: 'mes:view',
  },
  {
    name: 'topems_scm',
    entry: getRemoteEntry('topems_scm', 3005),
    displayName: 'SCM',
    icon: 'LocalShipping',
    routePrefix: '/scm',
    isCore: false,
    preload: 'lazy',
    permission: 'scm:view',
  },
  {
    name: 'topems_wms',
    entry: getRemoteEntry('topems_wms', 3006),
    displayName: 'WMS',
    icon: 'Warehouse',
    routePrefix: '/wms',
    isCore: false,
    preload: 'lazy',
    permission: 'wms:view',
  },
  {
    name: 'topems_srm',
    entry: getRemoteEntry('topems_srm', 3010),
    displayName: 'SRM',
    icon: 'Handshake',
    routePrefix: '/srm',
    isCore: false,
    preload: 'lazy',
    permission: 'srm:view',
  },
  {
    name: 'topems_pm',
    entry: getRemoteEntry('topems_pm', 3008),
    displayName: 'PM',
    icon: 'Assignment',
    routePrefix: '/pm',
    isCore: false,
    preload: 'lazy',
    permission: 'pm:view',
  },
  {
    name: 'topems_finance',
    entry: getRemoteEntry('topems_finance', 3009),
    displayName: 'Finance',
    icon: 'Paid',
    routePrefix: '/finance',
    isCore: false,
    preload: 'lazy',
    permission: 'finance:view',
  },
  {
    name: 'topems_pdm',
    entry: getRemoteEntry('topems_pdm', 3011),
    displayName: 'PDM',
    icon: 'FolderOpen',
    routePrefix: '/pdm',
    isCore: false,
    preload: 'lazy',
    permission: 'pdm:view',
  },
  {
    name: 'topems_qms',
    entry: getRemoteEntry('topems_qms', 3012),
    displayName: 'QMS',
    icon: 'CheckCircle',
    routePrefix: '/qms',
    isCore: false,
    preload: 'lazy',
    permission: 'qms:view',
  },
  {
    name: 'topems_lims',
    entry: getRemoteEntry('topems_lims', 3013),
    displayName: 'LIMS',
    icon: 'FlaskConical',
    routePrefix: '/lims',
    isCore: false,
    preload: 'lazy',
    permission: 'lims:view',
  },
  {
    name: 'topems_ehs',
    entry: getRemoteEntry('topems_ehs', 3014),
    displayName: 'EHS',
    icon: 'ShieldCheck',
    routePrefix: '/ehs',
    isCore: false,
    preload: 'lazy',
    permission: 'ehs:view',
  },
  {
    name: 'topems_bi',
    entry: getRemoteEntry('topems_bi', 3015),
    displayName: 'BI',
    icon: 'BarChart3',
    routePrefix: '/bi',
    isCore: false,
    preload: 'lazy',
    permission: 'bi:view',
  },
  {
    name: 'topems_monitor',
    entry: getRemoteEntry('topems_monitor', 3016),
    displayName: 'Monitor',
    icon: 'Activity',
    routePrefix: '/monitor',
    isCore: false,
    preload: 'visible',
    permission: 'monitor:view',
  },
  {
    name: 'topems_ai',
    entry: getRemoteEntry('topems_ai', 3017),
    displayName: 'AI',
    icon: 'Sparkles',
    routePrefix: '/ai',
    isCore: false,
    preload: 'lazy',
    permission: 'ai:view',
  },
  {
    name: 'topems_gis',
    entry: getRemoteEntry('topems_gis', 3018),
    displayName: 'GIS',
    icon: 'Map',
    routePrefix: '/gis',
    isCore: false,
    preload: 'lazy',
    permission: 'gis:view',
  },
  {
    name: 'topems_doc',
    entry: getRemoteEntry('topems_doc', 3019),
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
