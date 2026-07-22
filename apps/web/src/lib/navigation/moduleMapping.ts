export interface ModuleBackendMapping {
  service: string;
  module: string;
  apiBasePath?: string;
  subModules?: Record<string, { service: string; module: string; apiBasePath?: string }>;
}

export const moduleMapping: Record<string, ModuleBackendMapping> = {
  iam: {
    service: 'unified-core',
    module: 'iam',
    apiBasePath: '/api/v1/core/iam',
  },

  admin: {
    service: 'unified-core',
    module: 'tenant',
    apiBasePath: '/api/v1/core/tenant',
    subModules: {
      tenant: {
        service: 'unified-core',
        module: 'tenant',
        apiBasePath: '/api/v1/core/tenant',
      },
      user: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/v1/core/iam',
      },
      role: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/v1/core/iam',
      },
      permission: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/v1/core/iam',
      },
      billing: {
        service: 'unified-core',
        module: 'billing',
        apiBasePath: '/api/v1/core/billing',
      },
      plugin: {
        service: 'unified-core',
        module: 'plugin',
        apiBasePath: '/api/v1/core/plugin',
      },
      audit: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/v1/core/iam',
      },
      monitor: {
        service: 'monitor',
        module: 'monitor',
        apiBasePath: '/api/v1/monitor',
      },
      dictionary: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/v1/core/iam',
      },
      system: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/v1/core/iam',
      },
    },
  },

  workflow: {
    service: 'unified-core',
    module: 'flow',
    apiBasePath: '/api/v1/core/flow',
  },

  notification: {
    service: 'unified-core',
    module: 'communication',
    apiBasePath: '/api/v1/core/comm',
    subModules: {
      notification: {
        service: 'unified-core',
        module: 'communication',
        apiBasePath: '/api/v1/core/comm',
      },
    },
  },

  document: {
    service: 'doc',
    module: 'doc',
    apiBasePath: '/api/v1/doc',
  },

  monitor: {
    service: 'monitor',
    module: 'monitor',
    apiBasePath: '/api/v1/monitor',
  },

  integration: {
    service: 'integration',
    module: 'integration',
    apiBasePath: '/api/v1/integration',
  },

  ai: {
    service: 'ai',
    module: 'ai',
    apiBasePath: '/api/v1/ai',
  },

  mobile: {
    service: 'mobile',
    module: 'mobile',
    apiBasePath: '/api/v1/mobile',
  },

  hrm: {
    service: 'hrm',
    module: 'hrm',
    apiBasePath: '/api/v1/hrm',
  },

  finance: {
    service: 'finance',
    module: 'finance',
    apiBasePath: '/api/v1/finance',
  },

  crm: {
    service: 'crm',
    module: 'crm',
    apiBasePath: '/api/v1/crm',
  },

  mes: {
    service: 'mes',
    module: 'mes',
    apiBasePath: '/api/v1/mes',
  },

  qms: {
    service: 'qms',
    module: 'qms',
    apiBasePath: '/api/v1/qms',
  },

  scm: {
    service: 'scm',
    module: 'scm',
    apiBasePath: '/api/v1/scm',
  },

  erp: {
    service: 'erp',
    module: 'erp',
    apiBasePath: '/api/v1/erp',
  },

  wms: {
    service: 'wms',
    module: 'wms',
    apiBasePath: '/api/v1/wms',
  },

  pm: {
    service: 'pm',
    module: 'pm',
    apiBasePath: '/api/v1/pm',
  },

  pdm: {
    service: 'pdm',
    module: 'pdm',
    apiBasePath: '/api/v1/pdm',
  },

  srm: {
    service: 'srm',
    module: 'srm',
    apiBasePath: '/api/v1/srm',
  },

  oa: {
    service: 'erp',
    module: 'oa',
    apiBasePath: '/api/v1/erp',
  },

  lowcode: {
    service: 'unified-core',
    module: 'plugin',
    apiBasePath: '/api/v1/core/plugin',
  },

  rs: {
    service: 'rs',
    module: 'rs',
    apiBasePath: '/api/v1/rs',
  },

  asset: {
    service: 'erp',
    module: 'asset',
    apiBasePath: '/api/v1/erp',
  },

  docs: {
    service: 'doc',
    module: 'doc',
    apiBasePath: '/api/v1/doc',
  },

  plugin: {
    service: 'unified-core',
    module: 'plugin',
    apiBasePath: '/api/v1/core/plugin',
  },

  im: {
    service: 'unified-core',
    module: 'communication',
    apiBasePath: '/api/v1/core/comm/im',
  },

  bi: {
    service: 'analytics',
    module: 'bi',
    apiBasePath: '/api/v1/bi',
  },

  gis: {
    service: 'gis',
    module: 'gis',
    apiBasePath: '/api/v1/gis',
  },

  report: {
    service: 'report',
    module: 'report',
    apiBasePath: '/api/v1/bi',
  },

  lims: {
    service: 'lims',
    module: 'lims',
    apiBasePath: '/api/v1/lims',
  },

  ehs: {
    service: 'ehs',
    module: 'ehs',
    apiBasePath: '/api/v1/ehs',
  },
};

export const getModuleMapping = (moduleCode: string): ModuleBackendMapping | undefined => {
  return moduleMapping[moduleCode];
};

export const getModuleApiBasePath = (moduleCode: string): string | undefined => {
  return moduleMapping[moduleCode]?.apiBasePath;
};

export const getModuleService = (moduleCode: string): string | undefined => {
  return moduleMapping[moduleCode]?.service;
};

export const getAllModuleCodes = (): string[] => {
  return Object.keys(moduleMapping);
};