/**
 * Plugin Remote Module Configuration
 * 插件远程模块配置文件 - 定义所有可加载的远程模块
 *
 * 端口从 ./ports.ts 的 MF_PORTS 单一信源派生，不再硬编码 30xx 端口。
 * 新增/修改 MF 端口：修改 config/ports.env 后同步更新 apps/web/src/config/ports.ts
 */

import { MF_PORTS } from './ports';
import i18n from '@/i18n';

export interface RemoteModuleConfig {
  name: string;
  code: string;
  description: string;
  port: number;
  url: string;
  category: 'system' | 'business' | 'analytics' | 'infrastructure' | 'quality' | 'rd' | 'supply';
  icon: string;
  required: boolean;
  defaultEnabled: boolean;
  pluginType: 'core' | 'business';
  dependencies?: string[];
}

export interface RemoteModuleEnvConfig {
  [key: string]: {
    url: string;
    enabled: boolean;
  };
}

export const REMOTE_MODULES: RemoteModuleConfig[] = [
  {
    name: 'Core',
    code: 'topems_core',
    description: i18n.t('shared.plugins.config.k0'),
    port: MF_PORTS.topems_core,
    url: `http://localhost:${MF_PORTS.topems_core}`,
    category: 'system',
    icon: 'Settings',
    required: true,
    defaultEnabled: true,
    pluginType: 'core',
  },
  {
    name: 'HRM',
    code: 'topems_hrm',
    description: i18n.t('shared.plugins.config.k1'),
    port: MF_PORTS.topems_hrm,
    url: `http://localhost:${MF_PORTS.topems_hrm}`,
    category: 'business',
    icon: 'Users',
    required: false,
    defaultEnabled: true,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'CRM',
    code: 'topems_crm',
    description: i18n.t('shared.plugins.config.k2'),
    port: MF_PORTS.topems_crm,
    url: `http://localhost:${MF_PORTS.topems_crm}`,
    category: 'business',
    icon: 'Users',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'PM',
    code: 'topems_pm',
    description: i18n.t('shared.plugins.config.k3'),
    port: MF_PORTS.topems_pm,
    url: `http://localhost:${MF_PORTS.topems_pm}`,
    category: 'business',
    icon: 'Target',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'Finance',
    code: 'topems_finance',
    description: i18n.t('shared.plugins.config.k4'),
    port: MF_PORTS.topems_finance,
    url: `http://localhost:${MF_PORTS.topems_finance}`,
    category: 'business',
    icon: 'Building2',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'Supply Chain',
    code: 'topems_scm',
    description: i18n.t('shared.plugins.config.k5'),
    port: MF_PORTS.topems_scm,
    url: `http://localhost:${MF_PORTS.topems_scm}`,
    category: 'supply',
    icon: 'Truck',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'Quality',
    code: 'topems_qms',
    description: i18n.t('shared.plugins.config.k6'),
    port: MF_PORTS.topems_qms,
    url: `http://localhost:${MF_PORTS.topems_qms}`,
    category: 'quality',
    icon: 'Shield',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'BI',
    code: 'topems_bi',
    description: i18n.t('shared.plugins.config.k7'),
    port: MF_PORTS.topems_bi,
    url: `http://localhost:${MF_PORTS.topems_bi}`,
    category: 'analytics',
    icon: 'BarChart3',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'MES',
    code: 'topems_mes',
    description: i18n.t('shared.plugins.config.k8'),
    port: MF_PORTS.topems_mes,
    url: `http://localhost:${MF_PORTS.topems_mes}`,
    category: 'business',
    icon: 'Factory',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'WMS',
    code: 'topems_wms',
    description: i18n.t('shared.plugins.config.k9'),
    port: MF_PORTS.topems_wms,
    url: `http://localhost:${MF_PORTS.topems_wms}`,
    category: 'supply',
    icon: 'Warehouse',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
];

export const getModulesByCategory = (category: string): RemoteModuleConfig[] => {
  return REMOTE_MODULES.filter((m) => m.category === category);
};
