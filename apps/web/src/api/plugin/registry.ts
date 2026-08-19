import axios from 'axios';
import { apiLogger } from '@/utils/logger';
import { PLUGIN_TIMEOUT } from '@topems/shared-constants';
import type { PluginRuntimeInfo, SuiteInfo } from './types';
import i18n from '@/i18n';

export const getSuites = (): SuiteInfo[] => [
  {
    id: 'finance',
    code: 'finance',
    name: i18n.t('shared.registry.k0'),
    description: i18n.t('shared.registry.k1'),
    icon: 'DollarSign',
    plugins: ['finance'],
    category: 'finance',
    price_cents: 99900,
  },
  {
    id: 'hr',
    code: 'hr',
    name: i18n.t('shared.registry.k2'),
    description: i18n.t('shared.registry.k3'),
    icon: 'Users',
    plugins: ['hrm'],
    category: 'hr',
    price_cents: 79900,
  },
  {
    id: 'manufacturing',
    code: 'manufacturing',
    name: i18n.t('shared.registry.k4'),
    description: i18n.t('shared.registry.k5'),
    icon: 'Factory',
    plugins: ['mes', 'pdm', 'wms'],
    category: 'manufacturing',
    price_cents: 129900,
  },
  {
    id: 'quality',
    code: 'quality',
    name: i18n.t('shared.registry.k6'),
    description: i18n.t('shared.registry.k7'),
    icon: 'ShieldCheck',
    plugins: ['qms', 'lims', 'ehs'],
    category: 'quality',
    price_cents: 89900,
  },
  {
    id: 'supply',
    code: 'supply',
    name: i18n.t('shared.registry.k8'),
    description: i18n.t('shared.registry.k9'),
    icon: 'Truck',
    plugins: ['scm', 'srm'],
    category: 'supply',
    price_cents: 89900,
  },
  {
    id: 'crm',
    code: 'crm',
    name: i18n.t('shared.registry.k10'),
    description: i18n.t('shared.registry.k11'),
    icon: 'Target',
    plugins: ['crm', 'bi'],
    category: 'crm',
    price_cents: 69900,
  },
  {
    id: 'project',
    code: 'project',
    name: i18n.t('shared.registry.k12'),
    description: i18n.t('shared.registry.k13'),
    icon: 'FolderKanban',
    plugins: ['pm', 'rd'],
    category: 'project',
    price_cents: 79900,
  },
  {
    id: 'gis',
    code: 'gis',
    name: i18n.t('shared.registry.k14'),
    description: i18n.t('shared.registry.k15'),
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
  rd: 'project',
  gis: 'gis',
};

export const getPluginRegistry = (): Record<
  string,
  { url: string; port: number; name: string; icon: string }
> => ({
  workflow: { url: '/api/core/flow', port: 8000, name: i18n.t('shared.registry.k16'), icon: 'GitBranch' },
  erp: { url: '/api/erp', port: 8010, name: 'ERP', icon: 'Building2' },
  hrm: { url: '/api/hrm', port: 8020, name: i18n.t('shared.registry.k17'), icon: 'Users' },
  pm: { url: '/api/pm', port: 8023, name: i18n.t('shared.registry.k18'), icon: 'Target' },
  crm: { url: '/api/crm', port: 8029, name: i18n.t('shared.registry.k19'), icon: 'Users' },
  mes: { url: '/api/mes', port: 8030, name: i18n.t('shared.registry.k20'), icon: 'Factory' },
  pdm: { url: '/api/pdm', port: 8031, name: i18n.t('shared.registry.k21'), icon: 'Layers' },
  scm: { url: '/api/scm', port: 8040, name: i18n.t('shared.registry.k22'), icon: 'Truck' },
  wms: { url: '/api/wms', port: 8041, name: i18n.t('shared.registry.k23'), icon: 'Warehouse' },
  srm: { url: '/api/srm', port: 8042, name: i18n.t('shared.registry.k24'), icon: 'Handshake' },
  qms: { url: '/api/qms', port: 8050, name: i18n.t('shared.registry.k25'), icon: 'Shield' },
  lims: { url: '/api/lims', port: 8051, name: i18n.t('shared.registry.k26'), icon: 'FlaskConical' },
  ehs: { url: '/api/ehs', port: 8052, name: i18n.t('shared.registry.k27'), icon: 'Leaf' },
  rd: { url: '/api/rd', port: 8053, name: i18n.t('shared.registry.k28'), icon: 'FlaskRound' },
  bi: { url: '/api/bi', port: 8060, name: i18n.t('shared.registry.k29'), icon: 'BarChart3' },
  portal: { url: '/api/portal', port: 8063, name: i18n.t('shared.registry.k30'), icon: 'LayoutDashboard' },
  mobile: { url: '/api/mobile', port: 8070, name: i18n.t('shared.registry.k31'), icon: 'Smartphone' },
  gis: { url: '/api/gis', port: 8071, name: i18n.t('shared.registry.k32'), icon: 'Map' },
  integration: { url: '/api/integration', port: 8072, name: i18n.t('shared.registry.k33'), icon: 'Network' },
});

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
  const config = getPluginRegistry()[code];
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
    Object.keys(getPluginRegistry()).map((code) => fetchPluginInfo(code))
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
  const config = getPluginRegistry()[code];
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
    const axiosError = error as { code?: string; response?: { status?: number } };
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      return { healthy: false };
    }
    if (axiosError.response?.status === 404) {
      try {
        const latency = Date.now() - startTime;
        return { healthy: true, status: 'running', latency };
      } catch {
        return { healthy: false };
      }
    }
    return { healthy: false };
  }
};

export const checkAllPluginsHealth = async (): Promise<
  Record<string, { healthy: boolean; status?: string; latency?: number }>
> => {
  const results = await Promise.allSettled(
    Object.keys(getPluginRegistry()).map(async (code) => {
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
