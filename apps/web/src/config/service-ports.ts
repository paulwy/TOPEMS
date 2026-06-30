/**
 * Service Port Registry — Single Source of Truth
 * Synced with: config/services.yaml, docker/docker-compose.yml, deploy/nginx/topems.conf
 *
 * Any port change MUST update all three locations above.
 */

export interface ServicePort {
  name: string;
  port: number;
  description: string;
  category: string;
}

export const SERVICE_PORTS: Record<string, ServicePort> = {
  core: { name: 'unified-core', port: 8000, description: '统一核心服务', category: 'core' },
  erp: { name: 'erp', port: 8010, description: '企业资源计划', category: 'business' },
  hrm: { name: 'hrm', port: 8020, description: '人力资源管理', category: 'collaboration' },
  pm: { name: 'pm', port: 8023, description: '项目管理', category: 'collaboration' },
  crm: { name: 'crm', port: 8029, description: '客户关系管理', category: 'collaboration' },
  mes: { name: 'mes', port: 8030, description: '生产执行系统', category: 'manufacturing' },
  pdm: { name: 'pdm', port: 8031, description: '产品数据管理', category: 'manufacturing' },
  scm: { name: 'scm', port: 8040, description: '供应链管理', category: 'supply-chain' },
  wms: { name: 'wms', port: 8041, description: '仓储管理', category: 'supply-chain' },
  srm: { name: 'srm', port: 8042, description: '供应商管理', category: 'supply-chain' },
  qms: { name: 'qms', port: 8050, description: '质量管理', category: 'quality-rd' },
  lims: { name: 'lims', port: 8051, description: '实验室信息管理', category: 'quality-rd' },
  ehs: { name: 'ehs', port: 8052, description: '环境健康安全', category: 'quality-rd' },
  rs: { name: 'rs', port: 8053, description: '研发管理', category: 'quality-rd' },
  bi: { name: 'bi', port: 8060, description: '商业智能', category: 'analytics' },
  report: { name: 'report', port: 8061, description: '报表服务', category: 'analytics' },
  monitor: { name: 'monitor', port: 8062, description: '系统监控', category: 'analytics' },
  portal: { name: 'portal', port: 8063, description: '企业门户', category: 'analytics' },
  ai: { name: 'ai', port: 8064, description: 'AI智能服务', category: 'analytics' },
  mobile: { name: 'mobile', port: 8070, description: '移动服务', category: 'infrastructure' },
  gis: { name: 'gis', port: 8071, description: '地理信息服务', category: 'infrastructure' },
  integration: {
    name: 'integration',
    port: 8072,
    description: '集成服务',
    category: 'infrastructure',
  },
};

/** Generate Vite dev proxy config for all services */
export function generateServiceProxies(): Record<string, any> {
  const proxies: Record<string, any> = {};

  for (const [key, service] of Object.entries(SERVICE_PORTS)) {
    const target = `http://localhost:${service.port}`;

    // Standard API proxy: /{service}/api -> http://localhost:{port}/api/{service}/
    proxies[`/${key}/api`] = {
      target,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(new RegExp(`^/${key}`), ''),
    };

    // Health check proxy
    proxies[`/${key}/health`] = {
      target,
      changeOrigin: true,
    };

    // Plugin health proxy
    proxies[`/plugin-health/${key}`] = {
      target,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(new RegExp(`^/plugin-health/${key}`), ''),
    };
  }

  return proxies;
}
