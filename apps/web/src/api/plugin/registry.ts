import axios from 'axios';
import { apiLogger } from '@/utils/logger';
import { PLUGIN_TIMEOUT } from '@/constants/timeouts';
import type { PluginRuntimeInfo, SuiteInfo } from './types';

export const SUITES: SuiteInfo[] = [
  {
    id: 'production',
    code: 'production',
    name: '生产套件',
    description: '离散/流程制造管理',
    icon: 'Factory',
    plugins: ['mes', 'pdm'],
    category: 'manufacturing',
    price_cents: 99999,
  },
  {
    id: 'quality',
    code: 'quality',
    name: '质量套件',
    description: '质量管控、实验室、环保安全',
    icon: 'Shield',
    plugins: ['qms', 'lims', 'ehs'],
    category: 'quality',
    price_cents: 79999,
  },
  {
    id: 'rd',
    code: 'rd',
    name: '研发套件',
    description: '研发项目管理',
    icon: 'FlaskConical',
    plugins: ['rs'],
    category: 'rd',
    price_cents: 59999,
  },
  {
    id: 'collab',
    code: 'collab',
    name: '协同套件',
    description: '人力、客户、项目管理',
    icon: 'Users',
    plugins: ['hrm', 'crm', 'pm'],
    category: 'collaboration',
    price_cents: 69999,
  },
  {
    id: 'business',
    code: 'business',
    name: '经营套件',
    description: '财务管理、采购销售',
    icon: 'Building2',
    plugins: ['erp'],
    category: 'business',
    price_cents: 89999,
  },
  {
    id: 'supply',
    code: 'supply',
    name: '供应链套件',
    description: '供应链、仓储、供应商',
    icon: 'Package',
    plugins: ['scm', 'wms', 'srm'],
    category: 'supply',
    price_cents: 89999,
  },
  {
    id: 'analytics',
    code: 'analytics',
    name: '分析套件',
    description: '数据分析、报表',
    icon: 'BarChart3',
    plugins: ['bi', 'report'],
    category: 'analytics',
    price_cents: 49999,
  },
  {
    id: 'portal',
    code: 'portal',
    name: '门户套件',
    description: '企业工作台',
    icon: 'LayoutDashboard',
    plugins: ['portal'],
    category: 'portal',
    is_free: true,
  },
  {
    id: 'infrastructure',
    code: 'infrastructure',
    name: '基础设施',
    description: '移动端、IoT、数据交换',
    icon: 'Network',
    plugins: ['mobile', 'gis', 'integration'],
    category: 'infrastructure',
    price_cents: 39999,
  },
];

export const PLUGIN_SUITE_MAP: Record<string, string> = {
  mes: 'production',
  pdm: 'production',
  qms: 'quality',
  lims: 'quality',
  ehs: 'quality',
  rs: 'rd',
  hrm: 'collab',
  crm: 'collab',
  pm: 'collab',
  erp: 'business',
  scm: 'supply',
  wms: 'supply',
  srm: 'supply',
  bi: 'analytics',
  report: 'analytics',
  portal: 'portal',
  mobile: 'infrastructure',
  gis: 'infrastructure',
  integration: 'infrastructure',
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
