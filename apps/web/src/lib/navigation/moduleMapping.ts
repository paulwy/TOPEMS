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
    apiBasePath: '/api/core/iam',
  },

  admin: {
    service: 'unified-core',
    module: 'tenant',
    apiBasePath: '/api/core/tenant',
    subModules: {
      tenant: {
        service: 'unified-core',
        module: 'tenant',
        apiBasePath: '/api/core/tenant',
      },
      user: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
      role: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
      permission: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
      billing: {
        service: 'unified-core',
        module: 'billing',
        apiBasePath: '/api/core/billing',
      },
      plugin: {
        service: 'unified-core',
        module: 'plugin',
        apiBasePath: '/api/core/plugin',
      },
      audit: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
      monitor: {
        service: 'unified-core',
        module: 'monitor',
        apiBasePath: '/api/core/monitor',
      },
      dictionary: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
      system: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
    },
  },

  workflow: {
    service: 'unified-core',
    module: 'flow',
    apiBasePath: '/api/core/flow',
  },

  notification: {
    service: 'unified-core',
    module: 'communication',
    apiBasePath: '/api/core/comm',
    subModules: {
      notification: {
        service: 'unified-core',
        module: 'communication',
        apiBasePath: '/api/core/comm',
      },
    },
  },

  document: {
    service: 'unified-core',
    module: 'doc',
    apiBasePath: '/api/core/doc',
  },

  monitor: {
    service: 'unified-core',
    module: 'monitor',
    apiBasePath: '/api/core/monitor',
  },

  integration: {
    service: 'integration',
    module: 'integration',
    apiBasePath: '/api/integration',
  },

  ai: {
    service: 'ai',
    module: 'ai',
    apiBasePath: '/api/ai',
  },

  mobile: {
    service: 'mobile',
    module: 'mobile',
    apiBasePath: '/api/mobile',
  },

  hrm: {
    service: 'hrm',
    module: 'hrm',
    apiBasePath: '/api/hrm',
  },

  finance: {
    service: 'finance',
    module: 'finance',
    apiBasePath: '/api/finance',
  },

  crm: {
    service: 'crm',
    module: 'crm',
    apiBasePath: '/api/crm',
  },

  mes: {
    service: 'mes',
    module: 'mes',
    apiBasePath: '/api/mes',
  },

  qms: {
    service: 'qms',
    module: 'qms',
    apiBasePath: '/api/qms',
  },

  scm: {
    service: 'scm',
    module: 'scm',
    apiBasePath: '/api/scm',
  },

  erp: {
    service: 'erp',
    module: 'erp',
    apiBasePath: '/api/erp',
  },

  wms: {
    service: 'wms',
    module: 'wms',
    apiBasePath: '/api/wms',
  },

  pm: {
    service: 'pm',
    module: 'pm',
    apiBasePath: '/api/pm',
  },

  pdm: {
    service: 'pdm',
    module: 'pdm',
    apiBasePath: '/api/pdm',
  },

  srm: {
    service: 'srm',
    module: 'srm',
    apiBasePath: '/api/srm',
  },

  oa: {
    service: 'erp',
    module: 'oa',
    apiBasePath: '/api/erp',
  },

  lowcode: {
    service: 'unified-core',
    module: 'plugin',
    apiBasePath: '/api/core/plugin',
  },

  rs: {
    service: 'rd',
    module: 'rs',
    apiBasePath: '/api/rd',
  },

  asset: {
    service: 'erp',
    module: 'asset',
    apiBasePath: '/api/erp',
  },

  docs: {
    service: 'unified-core',
    module: 'doc',
    apiBasePath: '/api/core/doc',
  },

  plugin: {
    service: 'unified-core',
    module: 'plugin',
    apiBasePath: '/api/core/plugin',
  },

  im: {
    service: 'unified-core',
    module: 'communication',
    apiBasePath: '/api/core/comm/im',
  },

  bi: {
    service: 'analytics',
    module: 'bi',
    apiBasePath: '/api/bi',
  },

  gis: {
    service: 'gis',
    module: 'gis',
    apiBasePath: '/api/gis',
  },

  report: {
    service: 'analytics',
    module: 'report',
    apiBasePath: '/api/bi',
  },

  lims: {
    service: 'lims',
    module: 'lims',
    apiBasePath: '/api/lims',
  },

  ehs: {
    service: 'ehs',
    module: 'ehs',
    apiBasePath: '/api/ehs',
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