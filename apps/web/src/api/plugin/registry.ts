import axios from 'axios';
import { apiLogger } from '@/utils/logger';
import { PLUGIN_TIMEOUT } from '@/constants/timeouts';
import type { PluginRuntimeInfo, SuiteInfo } from './types';

export const SUITES: SuiteInfo[] = [
  {
    id: 'finance',
    code: 'finance',
    name: '财务套件',
    description: '完整财务管理解决方案',
    icon: 'DollarSign',
    plugins: ['finance'],
    category: 'finance',
    price_cents: 99900,
  },
  {
    id: 'hr',
    code: 'hr',
    name: '人力套件',
    description: '人力资源全生命周期管理',
    icon: 'Users',
    plugins: ['hrm'],
    category: 'hr',
    price_cents: 79900,
  },
  {
    id: 'manufacturing',
    code: 'manufacturing',
    name: '制造套件',
    description: '智能制造执行系统',
    icon: 'Factory',
    plugins: ['mes', 'pdm', 'wms'],
    category: 'manufacturing',
    price_cents: 129900,
  },
  {
    id: 'quality',
    code: 'quality',
    name: '质量套件',
    description: '质量管控与实验室管理',
    icon: 'ShieldCheck',
    plugins: ['qms', 'lims', 'ehs'],
    category: 'quality',
    price_cents: 89900,
  },
  {
    id: 'supply',
    code: 'supply',
    name: '供应链套件',
    description: '采购与供应商管理',
    icon: 'Truck',
    plugins: ['scm', 'srm'],
    category: 'supply',
    price_cents: 89900,
  },
  {
    id: 'crm',
    code: 'crm',
    name: '客户套件',
    description: '客户关系与销售管理',
    icon: 'Target',
    plugins: ['crm', 'bi'],
    category: 'crm',
    price_cents: 69900,
  },
  {
    id: 'project',
    code: 'project',
    name: '项目套件',
    description: '项目与研发过程管理',
    icon: 'FolderKanban',
    plugins: ['pm', 'rs'],
    category: 'project',
    price_cents: 79900,
  },
  {
    id: 'gis',
    code: 'gis',
    name: '地理套件',
    description: '地理信息与空间分析',
    icon: 'Map',
    plugins: ['gis'],
    category: 'gis',
    price_cents: 59900,
  },
];

export const PLUGIN_SUITE_MAP: Record<string, string> = {
  finance: 'finance',
  hrm: 'hr',
  mes: 'manufacturing',
  pdm: 'manufacturing',
  wms: 'manufacturing',
  qms: 'quality',
  lims: 'quality',
  ehs: 'quality',
  scm: 'supply',
  srm: 'supply',
  crm: 'crm',
  bi: 'crm',
  pm: 'project',
  rs: 'project',
  gis: 'gis',
};

export const PLUGIN_REGISTRY: Record<
  string,
  { url: string; port: number; name: string; icon: string }
> = {
  workflow: { url: 'http://localhost:8000', port: 8000, name: '工作流', icon: 'GitBranch' },
  erp: { url: 'http://localhost:8010', port: 8010, name: 'ERP', icon: 'Building2' },
  hrm: { url: 'http://localhost:8020', port: 8020, name: '人力资源', icon: 'Users' },
  pm: { url: 'http://localhost:8023', port: 8023, name: '项目管理', icon: 'Target' },
  crm: { url: 'http://localhost:8029', port: 8029, name: '客户管理', icon: 'Users' },
  mes: { url: 'http://localhost:8030', port: 8030, name: '生产执行', icon: 'Factory' },
  pdm: { url: 'http://localhost:8031', port: 8031, name: '产品数据', icon: 'Layers' },
  scm: { url: 'http://localhost:8040', port: 8040, name: '供应链', icon: 'Truck' },
  wms: { url: 'http://localhost:8041', port: 8041, name: '仓储管理', icon: 'Warehouse' },
  srm: { url: 'http://localhost:8042', port: 8042, name: '供应商', icon: 'Handshake' },
  qms: { url: 'http://localhost:8050', port: 8050, name: '质量管理', icon: 'Shield' },
  lims: { url: 'http://localhost:8051', port: 8051, name: '实验室', icon: 'FlaskConical' },
  ehs: { url: 'http://localhost:8052', port: 8052, name: '环境安全', icon: 'Leaf' },
  rs: { url: 'http://localhost:8053', port: 8053, name: '研发管理', icon: 'FlaskRound' },
  bi: { url: 'http://localhost:8060', port: 8060, name: '商业智能', icon: 'BarChart3' },
  report: { url: 'http://localhost:8061', port: 8061, name: '报表服务', icon: 'FileText' },
  monitor: { url: 'http://localhost:8062', port: 8062, name: '系统监控', icon: 'Activity' },
  portal: { url: 'http://localhost:8063', port: 8063, name: '企业门户', icon: 'LayoutDashboard' },
  mobile: { url: 'http://localhost:8070', port: 8070, name: '移动端', icon: 'Smartphone' },
  gis: { url: 'http://localhost:8071', port: 8071, name: '地理信息', icon: 'Map' },
  integration: { url: 'http://localhost:8072', port: 8072, name: '数据交换', icon: 'Network' },
};

const runtimeAxios = axios.create({
  timeout: PLUGIN_TIMEOUT.DEFAULT,
});

runtimeAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId && !config.headers['X-Tenant-ID']) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  return config;
});

export const fetchPluginInfo = async (code: string): Promise<PluginRuntimeInfo | null> => {
  const config = PLUGIN_REGISTRY[code];
  if (!config) return null;

  try {
    const response = await runtimeAxios.get(`/plugin-health/${code}/api/plugins/info`);
    if (response.data?.data) {
      return response.data.data;
    }
    return null;
  } catch (error: unknown) {
    apiLogger.warn(`Failed to fetch plugin info for ${code}:`, error);
    return null;
  }
};

export const fetchAllPluginInfo = async (): Promise<PluginRuntimeInfo[]> => {
  const results = await Promise.allSettled(
    Object.keys(PLUGIN_REGISTRY).map((code) => fetchPluginInfo(code))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<PluginRuntimeInfo> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value);
};

export const checkPluginHealth = async (
  code: string
): Promise<{ healthy: boolean; status?: string; latency?: number }> => {
  const config = PLUGIN_REGISTRY[code];
  if (!config) return { healthy: false };

  const startTime = Date.now();
  try {
    const response = await runtimeAxios.get(`/plugin-health/${code}/api/plugins/health`);
    const latency = Date.now() - startTime;
    if (response.data?.data?.status) {
      return { healthy: true, status: response.data.data.status, latency };
    }
    return { healthy: true, status: 'running', latency };
  } catch (error: unknown) {
    try {
      const response = await runtimeAxios.get(`/plugin-health/${code}/health`);
      const latency = Date.now() - startTime;
      return { healthy: true, status: 'running', latency };
    } catch {
      return { healthy: false };
    }
  }
};

export const checkAllPluginsHealth = async (): Promise<
  Record<string, { healthy: boolean; status?: string; latency?: number }>
> => {
  const results = await Promise.allSettled(
    Object.keys(PLUGIN_REGISTRY).map(async (code) => {
      const health = await checkPluginHealth(code);
      return { code, ...health };
    })
  );

  const healthMap: Record<string, { healthy: boolean; status?: string; latency?: number }> = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      healthMap[r.value.code] = {
        healthy: r.value.healthy,
        status: r.value.status,
        latency: r.value.latency,
      };
    }
  });
  return healthMap;
};
