/**
 * 微服务注册表 — 统一管理所有后端服务配置
 *
 * 用途:
 * 1. api/client.ts 的 service getter 从此处读取配置
 * 2. vite.config.ts 的代理配置可从此处自动生成
 * 3. 新增模块只需在此处注册一次
 */
export interface ServiceConfig {
  /** 服务标识 */
  code: string;
  /** 服务名称 */
  name: string;
  /** API 基础路径 (开发环境) */
  devPath: string;
  /** 健康检查路径 */
  healthPath: string;
  /** 是否为核心服务 */
  core: boolean;
  /** 是否为插件服务 */
  plugin: boolean;
  /** Vite 代理目标 URL 环境变量 */
  envVar: string;
}

export const SERVICES: ServiceConfig[] = [
  // 核心服务
  {
    code: 'iam',
    name: '身份认证',
    devPath: '/iam/api',
    healthPath: '/iam/health',
    core: true,
    plugin: false,
    envVar: 'VITE_IAM_URL',
  },
  {
    code: 'erp',
    name: 'ERP',
    devPath: '/erp/api',
    healthPath: '/erp/health',
    core: true,
    plugin: false,
    envVar: 'VITE_ERP_URL',
  },
  {
    code: 'hrm',
    name: 'HRM',
    devPath: '/iam/api',
    healthPath: '/iam/health',
    core: true,
    plugin: false,
    envVar: 'VITE_HRM_URL',
  },
  {
    code: 'mes',
    name: 'MES',
    devPath: '/mes/api',
    healthPath: '/mes/health',
    core: true,
    plugin: false,
    envVar: 'VITE_MES_URL',
  },
  {
    code: 'workflow',
    name: '工作流',
    devPath: '/workflow/api',
    healthPath: '/workflow/health',
    core: true,
    plugin: false,
    envVar: 'VITE_WORKFLOW_URL',
  },
  {
    code: 'docs',
    name: '文档',
    devPath: '/docs/api',
    healthPath: '/docs/health',
    core: true,
    plugin: false,
    envVar: 'VITE_DOCS_URL',
  },
  {
    code: 'im',
    name: 'IM',
    devPath: '/im/api',
    healthPath: '/im/health',
    core: true,
    plugin: false,
    envVar: 'VITE_IM_URL',
  },
  {
    code: 'notification',
    name: '通知',
    devPath: '/notification/api',
    healthPath: '/notification/health',
    core: true,
    plugin: false,
    envVar: 'VITE_NOTIFICATION_URL',
  },
  {
    code: 'lowcode',
    name: '低代码',
    devPath: '/lowcode/api',
    healthPath: '/lowcode/health',
    core: true,
    plugin: false,
    envVar: 'VITE_LOWCODE_URL',
  },
  {
    code: 'report',
    name: '报表',
    devPath: '/report/api',
    healthPath: '/report/health',
    core: true,
    plugin: false,
    envVar: 'VITE_REPORT_URL',
  },
  {
    code: 'ai',
    name: 'AI',
    devPath: '/ai/api',
    healthPath: '/ai/health',
    core: true,
    plugin: false,
    envVar: 'VITE_AI_URL',
  },
  {
    code: 'monitor',
    name: '监控',
    devPath: '/monitor/api',
    healthPath: '/monitor/health',
    core: true,
    plugin: false,
    envVar: 'VITE_MONITOR_URL',
  },
  {
    code: 'plugin',
    name: '插件管理',
    devPath: '/plugin/api',
    healthPath: '/plugin/health',
    core: true,
    plugin: false,
    envVar: 'VITE_PLUGIN_URL',
  },
  {
    code: 'tenant',
    name: '租户',
    devPath: '/tenant/api',
    healthPath: '/tenant/health',
    core: true,
    plugin: false,
    envVar: 'VITE_TENANT_URL',
  },
  {
    code: 'bi',
    name: 'BI',
    devPath: '/bi/api',
    healthPath: '/bi/health',
    core: true,
    plugin: false,
    envVar: 'VITE_BI_URL',
  },
  {
    code: 'file',
    name: '文件',
    devPath: '/file/api',
    healthPath: '/file/health',
    core: true,
    plugin: false,
    envVar: 'VITE_FILE_URL',
  },
  // 插件服务
  {
    code: 'finance',
    name: '财务',
    devPath: '/finance/api',
    healthPath: '/finance/health',
    core: false,
    plugin: true,
    envVar: 'VITE_FINANCE_URL',
  },
  {
    code: 'crm',
    name: 'CRM',
    devPath: '/crm/api',
    healthPath: '/crm/health',
    core: false,
    plugin: true,
    envVar: 'VITE_CRM_URL',
  },
  {
    code: 'wms',
    name: 'WMS',
    devPath: '/wms/api',
    healthPath: '/wms/health',
    core: false,
    plugin: true,
    envVar: 'VITE_WMS_URL',
  },
  {
    code: 'scm',
    name: 'SCM',
    devPath: '/scm/api',
    healthPath: '/scm/health',
    core: false,
    plugin: true,
    envVar: 'VITE_SCM_URL',
  },
  {
    code: 'srm',
    name: 'SRM',
    devPath: '/srm/api',
    healthPath: '/srm/health',
    core: false,
    plugin: true,
    envVar: 'VITE_SRM_URL',
  },
  {
    code: 'qms',
    name: 'QMS',
    devPath: '/qms/api',
    healthPath: '/qms/health',
    core: false,
    plugin: true,
    envVar: 'VITE_QMS_URL',
  },
  {
    code: 'ehs',
    name: 'EHS',
    devPath: '/ehs/api',
    healthPath: '/ehs/health',
    core: false,
    plugin: true,
    envVar: 'VITE_EHS_URL',
  },
  {
    code: 'lims',
    name: 'LIMS',
    devPath: '/lims/api',
    healthPath: '/lims/health',
    core: false,
    plugin: true,
    envVar: 'VITE_LIMS_URL',
  },
  {
    code: 'pdm',
    name: 'PDM',
    devPath: '/pdm/api',
    healthPath: '/pdm/health',
    core: false,
    plugin: true,
    envVar: 'VITE_PDM_URL',
  },
  {
    code: 'gis',
    name: 'GIS',
    devPath: '/gis/api',
    healthPath: '/gis/health',
    core: false,
    plugin: true,
    envVar: 'VITE_GIS_URL',
  },
  {
    code: 'rs',
    name: '研发',
    devPath: '/rs/api',
    healthPath: '/rs/health',
    core: false,
    plugin: true,
    envVar: 'VITE_RS_URL',
  },
  {
    code: 'pm',
    name: 'PM',
    devPath: '/pm/api',
    healthPath: '/pm/health',
    core: false,
    plugin: true,
    envVar: 'VITE_PM_URL',
  },
  {
    code: 'mobile',
    name: '移动',
    devPath: '/mobile/api',
    healthPath: '/mobile/health',
    core: false,
    plugin: true,
    envVar: 'VITE_MOBILE_URL',
  },
];

/** 获取服务配置 */
export function getService(code: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.code === code);
}

/** 获取所有核心服务 */
export function getCoreServices(): ServiceConfig[] {
  return SERVICES.filter((s) => s.core);
}

/** 获取所有插件服务 */
export function getPluginServices(): ServiceConfig[] {
  return SERVICES.filter((s) => s.plugin);
}

/** 生成 Vite 代理配置 (可用于 scripts/generate-vite-proxy.ts) */
export function generateViteProxyConfig(): string {
  const lines: string[] = [];
  for (const svc of SERVICES) {
    lines.push(
      `    '${svc.devPath}': { target: process.env.${svc.envVar} || 'http://localhost:3001', changeOrigin: true },`
    );
    lines.push(
      `    '${svc.healthPath}': { target: process.env.${svc.envVar} || 'http://localhost:3001', changeOrigin: true },`
    );
  }
  return lines.join('\n');
}
