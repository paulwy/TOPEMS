/**
 * Plugin Remote Module Configuration
 * 插件远程模块配置文件 - 定义所有可加载的远程模块
 */

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
    description: '核心模块 - 认证、权限、工作流等基础服务',
    port: 3001,
    url: 'http://localhost:3001',
    category: 'system',
    icon: 'Settings',
    required: true,
    defaultEnabled: true,
    pluginType: 'core',
  },
  {
    name: 'HRM',
    code: 'topems_hrm',
    description: '人力资源管理 - 员工、考勤、薪酬、招聘',
    port: 3002,
    url: 'http://localhost:3002',
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
    description: '客户关系管理 - 客户、销售、商机',
    port: 3003,
    url: 'http://localhost:3003',
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
    description: '项目管理 - 项目计划、任务分配、进度跟踪',
    port: 3004,
    url: 'http://localhost:3004',
    category: 'business',
    icon: 'Target',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'Finance',
    code: 'topems_fin',
    description: '财务管理 - 预算、费用、报表',
    port: 3005,
    url: 'http://localhost:3005',
    category: 'business',
    icon: 'Building2',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
  {
    name: 'Supply Chain',
    code: 'topems_sc',
    description: '供应链管理 - 采购、库存、物流',
    port: 3006,
    url: 'http://localhost:3006',
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
    description: '质量管理 - 质量控制、检验、追溯',
    port: 3007,
    url: 'http://localhost:3007',
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
    description: '商业智能 - 数据分析、可视化',
    port: 3008,
    url: 'http://localhost:3008',
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
    description: '制造执行系统 - 生产跟踪、设备管理',
    port: 3009,
    url: 'http://localhost:3009',
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
    description: '仓储管理系统 - 库存、出入库',
    port: 3010,
    url: 'http://localhost:3010',
    category: 'supply',
    icon: 'Warehouse',
    required: false,
    defaultEnabled: false,
    pluginType: 'business',
    dependencies: ['topems_core'],
  },
];

export const MODULE_CATEGORIES = [
  { id: 'system', name: '系统核心', icon: 'Settings' },
  { id: 'business', name: '业务模块', icon: 'Briefcase' },
  { id: 'analytics', name: '数据分析', icon: 'BarChart3' },
  { id: 'supply', name: '供应链', icon: 'Package' },
  { id: 'quality', name: '质量管理', icon: 'Shield' },
  { id: 'rd', name: '研发管理', icon: 'FlaskConical' },
  { id: 'infrastructure', name: '基础设施', icon: 'Server' },
];

export const getModuleByCode = (code: string): RemoteModuleConfig | undefined => {
  return REMOTE_MODULES.find((m) => m.code === code);
};

export const getModulesByCategory = (category: string): RemoteModuleConfig[] => {
  return REMOTE_MODULES.filter((m) => m.category === category);
};

export const getRequiredModules = (): RemoteModuleConfig[] => {
  return REMOTE_MODULES.filter((m) => m.required);
};

export const getOptionalModules = (): RemoteModuleConfig[] => {
  return REMOTE_MODULES.filter((m) => !m.required);
};

export const getDefaultEnabledModules = (): RemoteModuleConfig[] => {
  return REMOTE_MODULES.filter((m) => m.defaultEnabled);
};

export const buildRemoteConfig = (): Record<string, string> => {
  const config: Record<string, string> = {};
  REMOTE_MODULES.forEach((module) => {
    config[module.code] = `${module.url}/remoteEntry.js`;
  });
  return config;
};

export const buildEnvConfig = (): RemoteModuleEnvConfig => {
  const config: RemoteModuleEnvConfig = {};
  REMOTE_MODULES.forEach((module) => {
    config[module.code] = {
      url: module.url,
      enabled: module.defaultEnabled,
    };
  });
  return config;
};
