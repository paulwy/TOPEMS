/**
 * Plugin Remote Module Configuration
 * 插件远程模块配置文件 - 定义所有可加载的远程模块
 *
 * 新增/修改 MF 端口：修改 config/ports.env 后同步更新 apps/web/src/config/ports.ts
 */

import i18n from '@/i18n';

export interface RemoteModuleConfig {
  name: string;
  code: string;
  description: string;
  category: 'system' | 'business' | 'analytics' | 'infrastructure' | 'quality' | 'rd' | 'supply';
  icon: string;
  required: boolean;
  defaultEnabled: boolean;
  pluginType: 'core' | 'business';
  dependencies?: string[];
}

export const REMOTE_MODULES: RemoteModuleConfig[] = [
  {
    name: i18n.t('shared.plugins.config.core_name'),
    code: 'topems_core',
    description: i18n.t('shared.plugins.config.k0'),
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
    category: 'supply',
    icon: 'Warehouse',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
];
