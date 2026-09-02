interface ModuleBackendMapping {
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
      plugin: {
        service: 'plugin-registry',
        module: 'plugin',
        apiBasePath: '/api/plugin',
      },
      audit: {
        service: 'unified-core',
        module: 'iam',
        apiBasePath: '/api/core/iam',
      },
      monitor: {
        service: 'monitor',
        module: 'monitor',
        apiBasePath: '/api/monitor',
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
    service: 'communication',
    module: 'communication',
    apiBasePath: '/api/communication/notification',
    subModules: {
      notification: {
        service: 'communication',
        module: 'communication',
        apiBasePath: '/api/communication/notification',
      },
    },
  },

  // 文档中心：导航使用 doc（DOC_PATHS.root = '/doc'）。
  // 历史上 moduleMapping 同时存在 document / docs 两个别名，均无任何代码引用
  // （grep moduleMapping['docs'|'document'] / apiClient.docs|document 均 0 命中），
  // 纯属死配置，已删除以避免「docs/document/doc 三个名字」混淆。
  // 后端实际服务为 unified-core 的 doc 模块，路径 /api/core/doc。
  doc: {
    service: 'unified-core',
    module: 'doc',
    apiBasePath: '/api/core/doc',
  },

  monitor: {
    service: 'monitor',
    module: 'monitor',
    apiBasePath: '/api/monitor',
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


  // 自动化编排（V64 新增）：初期落地 unified-core，业务量足够再拆独立服务
  // 自动化 = workflow（流程运行时）+ integration（数据桥接）+ lowcode（UI/表单）的编排层
  automation: {
    service: 'unified-core',
    module: 'automation',
    apiBasePath: '/api/core/automation',
  },

  rs: {
    service: 'rd',
    module: 'rs',
    apiBasePath: '/api/rd',
  },

  // rd 模块（lazy.ts 用 code='rd' 注册，moduleMapping 补映射，与 rs 别名共存）
  rd: {
    service: 'rd',
    module: 'rd',
    apiBasePath: '/api/rd',
  },

  // ticket 模块（工单系统，独立服务）
  ticket: {
    service: 'ticket',
    module: 'ticket',
    apiBasePath: '/api/ticket',
  },

  asset: {
    service: 'erp',
    module: 'asset',
    apiBasePath: '/api/erp',
  },

  plugin: {
    service: 'unified-core',
    module: 'plugin',
    apiBasePath: '/api/core/plugin',
  },

  im: {
    service: 'communication',
    module: 'communication',
    apiBasePath: '/api/communication/im',
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

export const getAllModuleCodes = (): string[] => {
  return Object.keys(moduleMapping);
};
