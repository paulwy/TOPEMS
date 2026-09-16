/**
 * 微前端模块配置中心
 *
 * 每个 remote 对应一个可独立部署的业务域。
 * 核心域（portal）始终加载，业务域按需加载。
 */

import { VITEDeploymentMode, isDev } from '@/config/env';
import { getMfPort } from '@/config/ports';
import i18n from '@/i18n';

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
 * V64 CORS 修复：
 *   - 开发环境（DEV === true）：**无论何种 deployment mode**，一律走 Vite 代理
 *     路径 `/remote/${name}/remoteEntry.js`，由 vite.config.ts 中 buildServiceProxies()
 *     统一代理到 `http://localhost:${port}`，从根本上避免浏览器跨端口 CORS。
 *   - 生产环境：先读 VITE_REMOTE_<NAME>_URL 完整 URL；static 模式返回空（不加载）；
 *     module-federation / hybrid 模式走同源路径（由网关/Nginx 统一分发，不再写死端口）。
 *
 * 生产环境通过 ENV 注入完整 URL：
 *   VITE_REMOTE_TOPEMS_ERP=https://erp.topems.com/remoteEntry.js
 */
function getRemoteEntry(name: string, _port: number): string {
  const envKey = `VITE_REMOTE_${name.toUpperCase()}`;
  const envUrl = import.meta.env[envKey];

  // 1. 显式环境变量（生产入口）优先级最高
  if (envUrl) {
    return envUrl;
  }

  // 2. 部署模式判定（单一真相源）
  const deploymentMode = VITEDeploymentMode();

  // static 模式：**无论开发/生产**，所有远程模块一律不加载
  // （主应用已将业务代码静态打包进本地 pages/ 目录，无需 MF 远程）
  if (deploymentMode === 'static') {
    return '';
  }

  // 3. module-federation 模式：
  //    - 开发环境：Vite 同源代理 /remote/<name> -> localhost:<port>
  //    - 生产环境：  同源路径，由网关/Nginx 分发到对应子应用
  //                  （如生产为独立子域名，用 VITE_REMOTE_<NAME> 环境变量覆盖）
  if (isDev()) {
    return `/remote/${name}/remoteEntry.js`;
  }
  if (deploymentMode === 'module-federation') {
    return `/remote/${name}/remoteEntry.js`;
  }

  // 其它/未识别模式：保守返回空
  return '';
}

export const REMOTE_MODULES: RemoteModuleConfig[] = [
  {
    name: 'topems_core',
    entry: getRemoteEntry('topems_core', getMfPort('topems_core')),
    displayName: i18n.t('microfrontend.config.k0'),
    icon: 'Apps',
    routePrefix: '/core',
    isCore: true,
    preload: 'eager',
    updateStrategy: 'force',
    critical: true,
  },
  {
    name: 'topems_erp',
    entry: getRemoteEntry('topems_erp', getMfPort('topems_erp')),
    displayName: 'ERP',
    icon: 'AccountBalance',
    routePrefix: '/erp',
    isCore: false,
    preload: 'network',
    permission: 'erp:dashboard:view',
    updateStrategy: 'prompt',
  },
  {
    name: 'topems_hrm',
    entry: getRemoteEntry('topems_hrm', getMfPort('topems_hrm')),
    displayName: 'HRM',
    icon: 'People',
    routePrefix: '/hrm',
    isCore: false,
    preload: 'network',
    permission: 'hrm:view',
  },
  {
    name: 'topems_crm',
    entry: getRemoteEntry('topems_crm', getMfPort('topems_crm')),
    displayName: 'CRM',
    icon: 'ContactPhone',
    routePrefix: '/crm',
    isCore: false,
    preload: 'network',
    permission: 'crm:dashboard:view',
  },
  {
    name: 'topems_mes',
    entry: getRemoteEntry('topems_mes', getMfPort('topems_mes')),
    displayName: 'MES',
    icon: 'PrecisionManufacturing',
    routePrefix: '/mes',
    isCore: false,
    preload: 'network',
    permission: 'mes:view',
  },
  {
    name: 'topems_scm',
    entry: getRemoteEntry('topems_scm', getMfPort('topems_scm')),
    displayName: 'SCM',
    icon: 'LocalShipping',
    routePrefix: '/scm',
    isCore: false,
    preload: 'lazy',
    permission: 'scm:view',
  },
  {
    name: 'topems_wms',
    entry: getRemoteEntry('topems_wms', getMfPort('topems_wms')),
    displayName: 'WMS',
    icon: 'Warehouse',
    routePrefix: '/wms',
    isCore: false,
    preload: 'lazy',
    permission: 'wms:view',
  },
  {
    name: 'topems_srm',
    entry: getRemoteEntry('topems_srm', getMfPort('topems_srm')),
    displayName: 'SRM',
    icon: 'Handshake',
    routePrefix: '/srm',
    isCore: false,
    preload: 'lazy',
    permission: 'srm:dashboard:view',
  },
  {
    name: 'topems_pm',
    entry: getRemoteEntry('topems_pm', getMfPort('topems_pm')),
    displayName: 'PM',
    icon: 'Assignment',
    routePrefix: '/pm',
    isCore: false,
    preload: 'lazy',
    permission: 'pm:dashboard:view',
  },
  {
    name: 'topems_finance',
    entry: getRemoteEntry('topems_finance', getMfPort('topems_finance')),
    displayName: 'Finance',
    icon: 'Paid',
    routePrefix: '/finance',
    isCore: false,
    preload: 'lazy',
    permission: 'finance:dashboard:view',
  },
  {
    name: 'topems_pdm',
    entry: getRemoteEntry('topems_pdm', getMfPort('topems_pdm')),
    displayName: 'PDM',
    icon: 'FolderOpen',
    routePrefix: '/pdm',
    isCore: false,
    preload: 'lazy',
    permission: 'pdm:view',
  },
  {
    name: 'topems_qms',
    entry: getRemoteEntry('topems_qms', getMfPort('topems_qms')),
    displayName: 'QMS',
    icon: 'CheckCircle',
    routePrefix: '/qms',
    isCore: false,
    preload: 'lazy',
    permission: 'qms:dashboard:view',
  },
  {
    name: 'topems_lims',
    entry: getRemoteEntry('topems_lims', getMfPort('topems_lims')),
    displayName: 'LIMS',
    icon: 'FlaskConical',
    routePrefix: '/lims',
    isCore: false,
    preload: 'lazy',
    permission: 'lims:dashboard:view',
  },
  {
    name: 'topems_ehs',
    entry: getRemoteEntry('topems_ehs', getMfPort('topems_ehs')),
    displayName: 'EHS',
    icon: 'ShieldCheck',
    routePrefix: '/ehs',
    isCore: false,
    preload: 'lazy',
    permission: 'ehs:dashboard:view',
  },
  {
    name: 'topems_bi',
    entry: getRemoteEntry('topems_bi', getMfPort('topems_bi')),
    displayName: 'BI',
    icon: 'BarChart3',
    routePrefix: '/bi',
    isCore: false,
    preload: 'lazy',
    permission: 'bi:dashboard:view',
  },
  {
    name: 'topems_monitor',
    entry: getRemoteEntry('topems_monitor', getMfPort('topems_monitor')),
    displayName: 'Monitor',
    icon: 'Activity',
    routePrefix: '/monitor',
    isCore: false,
    preload: 'visible',
    permission: 'monitor:dashboard:view',
  },
  {
    name: 'topems_ai',
    entry: getRemoteEntry('topems_ai', getMfPort('topems_ai')),
    displayName: 'AI',
    icon: 'Sparkles',
    routePrefix: '/ai',
    isCore: false,
    preload: 'lazy',
    permission: 'ai:dashboard:view',
  },
  {
    name: 'topems_gis',
    entry: getRemoteEntry('topems_gis', getMfPort('topems_gis')),
    displayName: 'GIS',
    icon: 'Map',
    routePrefix: '/gis',
    isCore: false,
    preload: 'lazy',
    permission: 'gis:dashboard:view',
  },
  {
    name: 'topems_doc',
    entry: getRemoteEntry('topems_doc', getMfPort('topems_doc')),
    displayName: i18n.t('microfrontend.config.k1'),
    icon: 'FileText',
    routePrefix: '/doc',
    isCore: false,
    preload: 'lazy',
    permission: 'doc:dashboard:view',
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
