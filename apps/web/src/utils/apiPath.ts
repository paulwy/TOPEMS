/**
 * API 路径构造工具（V14.0 版本化路由统一契约版）
 *
 *  权威契约参考：docs/superpowers/plans/2026-07-15-route-unification-contract.md
 *  ┌──────────────────────────────────────────────────────────────────────────────┐
 *  │ Group 1 — core 虚拟服务（unified-core:8000 承载） →  /api/v1/core/{svc}/... │
 *  │ Group 2 — 独立进程服务（各有独立 K8s deployment） →  /api/v1/{svc}/...      │
 *  │ 统一版本前缀 /v1（全系统版本策略一致）                                         │
 *  └──────────────────────────────────────────────────────────────────────────────┘
 */

export const API_VERSION = 'v1';

/**
 * Group1 核心虚拟服务（K8s ingress `/api/v1/core/*` 转发到 unified-core:8000）
 * 这些服务的路径必须以 `/api/v1/core/{svc}/` 开头。
 */
export const GROUP1_CORE_SERVICES = new Set<string>([
  'iam',
  'workflow',
  'flow', // workflow 别名
  'file',
  'mail',
  'im',
  'notification',
  'master',
  'migration',
  'comm',
  'communication', // comm 别名
  'core', // umbrella
  'help', // 帮助文档/FAQ 归到 unified-core
]);

/** Group2 独立进程服务列表（作为快速引用，实际所有非 Group1 服务都算 Group2） */
export const GROUP2_INDEPENDENT_SERVICES = new Set<string>([
  'erp',
  'finance',
  'doc',
  'ai',
  'hrm',
  'pm',
  'crm',
  'mes',
  'manufacturing',
  'pdm',
  'scm',
  'wms',
  'srm',
  'qms',
  'qualityAssurance',
  'lims',
  'ehs',
  'rd',
  'rs',
  'bi',
  'analytics',
  'report',
  'monitor',
  'portal',
  'mobile',
  'gis',
  'integration',
]);

export const SERVICE_CODES = {
  iam: 'iam',
  portal: 'portal',
  workflow: 'workflow',
  notification: 'notification',
  mail: 'mail',
  im: 'im',
  file: 'file',
  ai: 'ai',
  doc: 'doc',
  document: 'document',
  erp: 'erp',
  hrm: 'hrm',
  crm: 'crm',
  mes: 'mes',
  wms: 'wms',
  scm: 'scm',
  srm: 'srm',
  qms: 'qms',
  ehs: 'ehs',
  lims: 'lims',
  pm: 'pm',
  pdm: 'pdm',
  bi: 'bi',
  report: 'report',
  gis: 'gis',
  mobile: 'mobile',
  integration: 'integration',
  master: 'master',
  migration: 'migration',
  rs: 'rs',
  finance: 'finance',
  monitor: 'monitor',
  oa: 'oa',
  lowcode: 'lowcode',
  comm: 'comm',
  communication: 'communication',
} as const;

export type ServiceCode = (typeof SERVICE_CODES)[keyof typeof SERVICE_CODES];

export interface ApiPathOptions {
  service: ServiceCode | string;
  path: string;
}

/**
 * 根据服务归属 Group1/Group2 自动选择正确的前缀
 *   Group1（iam/workflow/file/...） →  /api/v1/core/{svc}/{path}
 *   Group2（erp/hrm/pm/...）       →  /api/v1/{svc}/{path}
 */
export function buildApiPath(options: ApiPathOptions): string {
  const { service, path } = options;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const prefix = GROUP1_CORE_SERVICES.has(service) ? '/api/v1/core' : '/api/v1';
  return `${prefix}/${service}${cleanPath}`;
}

/**
 * 无版本路径（V9.0 统一默认风格，等价于 buildApiPath 不带 version）
 */
export function buildUnifiedApiPath(service: string, path: string): string {
  return buildApiPath({ service, path });
}

export function createServiceApi(service: ServiceCode | string) {
  return {
    path: (resourcePath: string) => buildApiPath({ service, path: resourcePath }),
    list: (resource: string) => buildApiPath({ service, path: `/${resource}` }),
    get: (resource: string, id: string) => buildApiPath({ service, path: `/${resource}/${id}` }),
    create: (resource: string) => buildApiPath({ service, path: `/${resource}` }),
    update: (resource: string, id: string) => buildApiPath({ service, path: `/${resource}/${id}` }),
    remove: (resource: string, id: string) => buildApiPath({ service, path: `/${resource}/${id}` }),
    batch: (resource: string, action: string) =>
      buildApiPath({ service, path: `/${resource}/batch/${action}` }),
  };
}

export const SERVICES = {
  iam: createServiceApi('iam'),
  workflow: createServiceApi('workflow'),
  notification: createServiceApi('notification'),
  document: createServiceApi('document'),
  erp: createServiceApi('erp'),
  hrm: createServiceApi('hrm'),
  crm: createServiceApi('crm'),
  mes: createServiceApi('mes'),
  wms: createServiceApi('wms'),
  scm: createServiceApi('scm'),
  srm: createServiceApi('srm'),
  qms: createServiceApi('qms'),
  ehs: createServiceApi('ehs'),
  lims: createServiceApi('lims'),
  pm: createServiceApi('pm'),
  pdm: createServiceApi('pdm'),
  bi: createServiceApi('bi'),
  report: createServiceApi('report'),
  gis: createServiceApi('gis'),
  mobile: createServiceApi('mobile'),
  integration: createServiceApi('integration'),
  rs: createServiceApi('rs'),
  finance: createServiceApi('finance'),
  monitor: createServiceApi('monitor'),
  oa: createServiceApi('oa'),
  file: createServiceApi('file'),
  ai: createServiceApi('ai'),
  lowcode: createServiceApi('lowcode'),
} as const;

/* =============================================================
 * API_PATHS：前端业务用到的"规范化路径常量集合"
 * 按 V9.0 契约：auth 走 Group1；hrm/pm/wms/erp/scm/qms 走 Group2；file/ai/file/mail/notification... 各自 Group 对应
 * ============================================================= */

export const API_PATHS = {
  auth: {
    login: buildApiPath({ service: 'iam', path: '/auth/login' }),
    logout: buildApiPath({ service: 'iam', path: '/auth/logout' }),
    refresh: buildApiPath({ service: 'iam', path: '/auth/refresh' }),
    me: buildApiPath({ service: 'iam', path: '/auth/me' }),
    register: buildApiPath({ service: 'iam', path: '/auth/register' }),
    resetPassword: buildApiPath({ service: 'iam', path: '/auth/reset-password' }),
    setNewPassword: buildApiPath({ service: 'iam', path: '/auth/set-new-password' }),
    passwordPolicy: buildApiPath({ service: 'iam', path: '/auth/password-policy' }),
  },
  iam: {
    users: buildApiPath({ service: 'iam', path: '/users' }),
    user: (id: string) => buildApiPath({ service: 'iam', path: `/users/${id}` }),
    roles: buildApiPath({ service: 'iam', path: '/roles' }),
    role: (id: string) => buildApiPath({ service: 'iam', path: `/roles/${id}` }),
    permissions: buildApiPath({ service: 'iam', path: '/permissions' }),
    departments: buildApiPath({ service: 'iam', path: '/departments' }),
  },
  notification: {
    list: (page = 1, pageSize = 20, notificationType?: string) => {
      let path = `/notifications?page=${page}&pagesize=${pageSize}`;
      if (notificationType) path += `&notification_type=${notificationType}`;
      return buildApiPath({ service: 'notification', path });
    },
    unread: buildApiPath({ service: 'notification', path: '/notifications/unread' }),
    unreadCount: buildApiPath({ service: 'notification', path: '/notifications/unread-count' }),
    markRead: (id: string) =>
      buildApiPath({ service: 'notification', path: `/notifications/${id}` }),
    markAllRead: buildApiPath({ service: 'notification', path: '/notifications/read-all' }),
    stats: buildApiPath({ service: 'notification', path: '/notifications/stats' }),
    archive: buildApiPath({ service: 'notification', path: '/notifications/archive' }),
    templates: buildApiPath({ service: 'notification', path: '/notification-templates' }),
  },
  workflow: {
    definitions: buildApiPath({ service: 'workflow', path: '/definitions' }),
    definition: (id: string) => buildApiPath({ service: 'workflow', path: `/definitions/${id}` }),
    instances: buildApiPath({ service: 'workflow', path: '/instances' }),
    instance: (id: string) => buildApiPath({ service: 'workflow', path: `/instances/${id}` }),
    tasks: buildApiPath({ service: 'workflow', path: '/tasks' }),
    task: (id: string) => buildApiPath({ service: 'workflow', path: `/tasks/${id}` }),
    approve: (id: string) => buildApiPath({ service: 'workflow', path: `/tasks/${id}/approve` }),
    reject: (id: string) => buildApiPath({ service: 'workflow', path: `/tasks/${id}/reject` }),
    start: buildApiPath({ service: 'workflow', path: '/instances/start' }),
    history: (instanceId: string) =>
      buildApiPath({ service: 'workflow', path: `/instances/${instanceId}/history` }),
  },
  help: {
    faqs: buildApiPath({ service: 'help', path: '/faqs' }),
    faq: (id: string) => buildApiPath({ service: 'help', path: `/faqs/${id}` }),
    faqCategories: buildApiPath({ service: 'help', path: '/faqs/categories' }),
    guides: buildApiPath({ service: 'help', path: '/guides' }),
    guide: (id: string) => buildApiPath({ service: 'help', path: `/guides/${id}` }),
    guideCategories: buildApiPath({ service: 'help', path: '/guides/categories' }),
    lessons: buildApiPath({ service: 'help', path: '/lessons' }),
    lesson: (id: string) => buildApiPath({ service: 'help', path: `/lessons/${id}` }),
  },
  hrm: {
    employees: buildApiPath({ service: 'hrm', path: '/employees' }),
    employee: (id: string) => buildApiPath({ service: 'hrm', path: `/employees/${id}` }),
    departments: buildApiPath({ service: 'hrm', path: '/departments' }),
    attendance: buildApiPath({ service: 'hrm', path: '/attendance' }),
    leave: buildApiPath({ service: 'hrm', path: '/leave' }),
    contracts: buildApiPath({ service: 'hrm', path: '/contracts' }),
    payroll: buildApiPath({ service: 'hrm', path: '/payroll' }),
    performance: buildApiPath({ service: 'hrm', path: '/performance' }),
    recruitment: buildApiPath({ service: 'hrm', path: '/recruitment' }),
    training: buildApiPath({ service: 'hrm', path: '/training' }),
    company: buildApiPath({ service: 'hrm', path: '/company' }),
  },
  qms: {
    standards: buildApiPath({ service: 'qms', path: '/quality-standards' }),
    standard: (id: string) => buildApiPath({ service: 'qms', path: `/quality-standards/${id}` }),
    inspections: buildApiPath({ service: 'qms', path: '/quality-inspections' }),
    inspection: (id: string) =>
      buildApiPath({ service: 'qms', path: `/quality-inspections/${id}` }),
    issues: buildApiPath({ service: 'qms', path: '/quality-issues' }),
    issue: (id: string) => buildApiPath({ service: 'qms', path: `/quality-issues/${id}` }),
    correctiveActions: buildApiPath({ service: 'qms', path: '/corrective-actions' }),
    audits: buildApiPath({ service: 'qms', path: '/quality-audits' }),
    dashboard: buildApiPath({ service: 'qms', path: '/dashboard' }),
    spc: buildApiPath({ service: 'qms', path: '/spc' }),
    fmea: buildApiPath({ service: 'qms', path: '/fmea' }),
    eightD: buildApiPath({ service: 'qms', path: '/8d' }),
    apqp: buildApiPath({ service: 'qms', path: '/apqp' }),
    qualityCost: buildApiPath({ service: 'qms', path: '/quality-cost' }),
  },
  mes: {
    productionOrders: buildApiPath({ service: 'mes', path: '/production-orders' }),
    productionOrder: (id: string) =>
      buildApiPath({ service: 'mes', path: `/production-orders/${id}` }),
    workStations: buildApiPath({ service: 'mes', path: '/work-stations' }),
    equipment: buildApiPath({ service: 'mes', path: '/equipment' }),
    materials: buildApiPath({ service: 'mes', path: '/materials' }),
    wip: buildApiPath({ service: 'mes', path: '/wip' }),
    qualityTraceability: buildApiPath({ service: 'mes', path: '/quality-traceability' }),
    productionRecords: buildApiPath({ service: 'mes', path: '/production-records' }),
  },
  erp: {
    customers: buildApiPath({ service: 'erp', path: '/customers' }),
    customer: (id: string) => buildApiPath({ service: 'erp', path: `/customers/${id}` }),
    suppliers: buildApiPath({ service: 'erp', path: '/suppliers' }),
    supplier: (id: string) => buildApiPath({ service: 'erp', path: `/suppliers/${id}` }),
    materials: buildApiPath({ service: 'erp', path: '/materials' }),
    inventory: buildApiPath({ service: 'erp', path: '/inventory' }),
    purchaseOrders: buildApiPath({ service: 'erp', path: '/purchase-orders' }),
    salesOrders: buildApiPath({ service: 'erp', path: '/sales-orders' }),
    vouchers: buildApiPath({ service: 'erp', path: '/vouchers' }),
    assets: buildApiPath({ service: 'erp', path: '/assets' }),
  },
  file: {
    upload: buildApiPath({ service: 'file', path: '/upload' }),
    files: buildApiPath({ service: 'file', path: '/files' }),
    file: (id: string) => buildApiPath({ service: 'file', path: `/files/${id}` }),
    folders: buildApiPath({ service: 'file', path: '/folders' }),
    download: (id: string) => buildApiPath({ service: 'file', path: `/files/${id}/download` }),
    presignedUrl: buildApiPath({ service: 'file', path: '/presigned-url' }),
  },
  ai: {
    chat: buildApiPath({ service: 'ai', path: '/chat' }),
    qa: buildApiPath({ service: 'ai', path: '/qa' }),
    analysis: buildApiPath({ service: 'ai', path: '/analysis' }),
    documents: buildApiPath({ service: 'ai', path: '/documents' }),
    code: buildApiPath({ service: 'ai', path: '/code' }),
    recommendation: buildApiPath({ service: 'ai', path: '/recommendation' }),
    vector: buildApiPath({ service: 'ai', path: '/vector' }),
  },
  pm: {
    projects: buildApiPath({ service: 'pm', path: '/projects' }),
    project: (id: string) => buildApiPath({ service: 'pm', path: `/projects/${id}` }),
    phases: buildApiPath({ service: 'pm', path: '/phases' }),
    milestones: buildApiPath({ service: 'pm', path: '/milestones' }),
    tasks: buildApiPath({ service: 'pm', path: '/tasks' }),
    members: buildApiPath({ service: 'pm', path: '/members' }),
    budget: buildApiPath({ service: 'pm', path: '/budget' }),
    risks: buildApiPath({ service: 'pm', path: '/risks' }),
    issues: buildApiPath({ service: 'pm', path: '/issues' }),
    documents: buildApiPath({ service: 'pm', path: '/documents' }),
  },
  wms: {
    warehouses: buildApiPath({ service: 'wms', path: '/warehouses' }),
    locations: buildApiPath({ service: 'wms', path: '/locations' }),
    inventory: buildApiPath({ service: 'wms', path: '/inventory' }),
    inbound: buildApiPath({ service: 'wms', path: '/inbound-orders' }),
    outbound: buildApiPath({ service: 'wms', path: '/outbound-orders' }),
    transfers: buildApiPath({ service: 'wms', path: '/transfers' }),
    stocktake: buildApiPath({ service: 'wms', path: '/stocktake' }),
  },
  scm: {
    suppliers: buildApiPath({ service: 'scm', path: '/suppliers' }),
    purchaseOrders: buildApiPath({ service: 'scm', path: '/purchase-orders' }),
    purchaseItems: buildApiPath({ service: 'scm', path: '/purchase-items' }),
    mrpPlans: buildApiPath({ service: 'scm', path: '/mrp-plans' }),
    mrpSuggestions: buildApiPath({ service: 'scm', path: '/mrp-suggestions' }),
    incomingInspection: buildApiPath({ service: 'scm', path: '/incoming-inspection' }),
    priceComparison: buildApiPath({ service: 'scm', path: '/price-comparison' }),
    supplierEvaluation: buildApiPath({ service: 'scm', path: '/supplier-evaluation' }),
    dashboard: buildApiPath({ service: 'scm', path: '/dashboard' }),
  },
} as const;

export default {
  API_VERSION,
  GROUP1_CORE_SERVICES,
  GROUP2_INDEPENDENT_SERVICES,
  SERVICE_CODES,
  buildApiPath,
  buildUnifiedApiPath,
  createServiceApi,
  API_PATHS,
};
