/**
 * 微服务注册表 — 统一管理所有后端服务配置
 *
 * 用途:
 * 1. api/client.ts 的 service getter 从此处读取配置
 * 2. vite.config.ts 的代理配置通过 services 数组程序化生成
 * 3. 新增模块需同时在本文件和 vite.config.ts 的 services 数组中注册
 *
 * 注意：端口配置必须与 vite.config.ts 和 scripts/topems.sh 保持一致
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
    code: 'finance',
    name: 'Finance',
    devPath: '/finance/api',
    healthPath: '/finance/health',
    core: false,
    plugin: true,
    envVar: 'VITE_FINANCE_URL',
  },
  {
    code: 'hrm',
    name: 'HRM',
    devPath: '/hrm/api',
    healthPath: '/hrm/health',
    core: false,
    plugin: true,
    envVar: 'VITE_HRM_URL',
  },
  {
    code: 'mes',
    name: 'MES',
    devPath: '/mes/api',
    healthPath: '/mes/health',
    core: false,
    plugin: true,
    envVar: 'VITE_MES_URL',
  },
  {
    code: 'flow',
    name: '工作流',
    devPath: '/flow/api',
    healthPath: '/flow/health',
    core: true,
    plugin: false,
    envVar: 'VITE_FLOW_URL',
  },
  {
    code: 'doc',
    name: '文档',
    devPath: '/doc/api',
    healthPath: '/doc/health',
    core: false,
    plugin: true,
    envVar: 'VITE_DOC_URL',
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
    code: 'report',
    name: '报表',
    devPath: '/report/api',
    healthPath: '/report/health',
    core: false,
    plugin: true,
    envVar: 'VITE_REPORT_URL',
  },
  {
    code: 'ai',
    name: 'AI',
    devPath: '/ai/api',
    healthPath: '/ai/health',
    core: false,
    plugin: true,
    envVar: 'VITE_AI_URL',
  },
  {
    code: 'monitor',
    name: '监控',
    devPath: '/monitor/api',
    healthPath: '/monitor/health',
    core: false,
    plugin: true,
    envVar: 'VITE_MONITOR_URL',
  },
  {
    code: 'bi',
    name: 'BI',
    devPath: '/bi/api',
    healthPath: '/bi/health',
    core: false,
    plugin: true,
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
  {
    code: 'comm',
    name: '通信',
    devPath: '/comm/api',
    healthPath: '/comm/health',
    core: true,
    plugin: false,
    envVar: 'VITE_COMM_URL',
  },
  {
    code: 'mail',
    name: '邮件',
    devPath: '/mail/api',
    healthPath: '/mail/health',
    core: true,
    plugin: false,
    envVar: 'VITE_MAIL_URL',
  },
  {
    code: 'master',
    name: '主服务',
    devPath: '/master/api',
    healthPath: '/master/health',
    core: true,
    plugin: false,
    envVar: 'VITE_MASTER_URL',
  },
  {
    code: 'integration',
    name: '集成',
    devPath: '/integration/api',
    healthPath: '/integration/health',
    core: false,
    plugin: true,
    envVar: 'VITE_INTEGRATION_URL',
  },
  // 插件服务
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
  {
    code: 'portal',
    name: '门户',
    devPath: '/portal/api',
    healthPath: '/portal/health',
    core: false,
    plugin: true,
    envVar: 'VITE_PORTAL_URL',
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

/** 生成 Vite 代理配置 */
export function generateViteProxyConfig(): string {
  const lines: string[] = [];
  for (const svc of SERVICES) {
    const target = svc.core
      ? 'http://localhost:8000'
      : `http://localhost:${getServicePort(svc.code)}`;
    lines.push(`    '${svc.devPath}': { target: '${target}', changeOrigin: true },`);
    lines.push(`    '${svc.healthPath}': { target: '${target}', changeOrigin: true },`);
  }
  return lines.join('\n');
}

/** 获取服务端口（与 vite.config.ts 中的 services 数组一致） */
export function getServicePort(code: string): number {
  const portMap: Record<string, number> = {
    erp: 8010,
    finance: 8011,
    doc: 8012,
    ai: 8013,
    hrm: 8020,
    pm: 8023,
    crm: 8029,
    mes: 8030,
    pdm: 8031,
    scm: 8040,
    wms: 8041,
    srm: 8042,
    qms: 8050,
    lims: 8051,
    ehs: 8052,
    rs: 8053,
    bi: 8060,
    report: 8060,
    monitor: 8062,
    portal: 8063,
    mobile: 8070,
    gis: 8071,
    integration: 8072,
  };
  return portMap[code] || 8000;
}
