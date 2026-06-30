export const API_VERSION = 'v1';

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
} as const;

export type ServiceCode = (typeof SERVICE_CODES)[keyof typeof SERVICE_CODES];

export interface ApiPathOptions {
  service: ServiceCode | string;
  version?: string;
  path: string;
}

export function buildApiPath(options: ApiPathOptions): string {
  const { service, version = API_VERSION, path } = options;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/api/${service}/${version}${cleanPath}`;
}

export function buildLegacyApiPath(service: string, path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/api/${service}${cleanPath}`;
}

export function buildV1Path(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `/api/v1${cleanPath}`;
}

export function createServiceApi(service: ServiceCode | string, version: string = API_VERSION) {
  return {
    path: (resourcePath: string) => buildApiPath({ service, version, path: resourcePath }),
    list: (resource: string) => buildApiPath({ service, version, path: `/${resource}` }),
    get: (resource: string, id: string) =>
      buildApiPath({ service, version, path: `/${resource}/${id}` }),
    create: (resource: string) => buildApiPath({ service, version, path: `/${resource}` }),
    update: (resource: string, id: string) =>
      buildApiPath({ service, version, path: `/${resource}/${id}` }),
    remove: (resource: string, id: string) =>
      buildApiPath({ service, version, path: `/${resource}/${id}` }),
    batch: (resource: string, action: string) =>
      buildApiPath({ service, version, path: `/${resource}/batch/${action}` }),
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

export function normalizeApiPath(url: string): string {
  const legacyPattern = /^\/api\/([a-z]+)(\/.*)$/;
  const versionedPattern = /^\/api\/([a-z]+)\/v\d+(\/.*)$/;

  if (versionedPattern.test(url)) {
    return url;
  }

  const match = url.match(legacyPattern);
  if (match) {
    const [, service, path] = match;
    if (Object.values(SERVICE_CODES).includes(service as ServiceCode)) {
      return `/api/${service}/${API_VERSION}${path}`;
    }
  }

  return url;
}

export const API_PATHS = {
  auth: {
    login: buildV1Path('/auth/login'),
    logout: buildV1Path('/auth/logout'),
    refresh: buildV1Path('/auth/refresh'),
    me: buildV1Path('/auth/me'),
    register: buildV1Path('/auth/register'),
    resetPassword: buildV1Path('/auth/reset-password'),
    setNewPassword: buildV1Path('/auth/set-new-password'),
    passwordPolicy: buildV1Path('/auth/password-policy'),
  },
  iam: {
    users: buildLegacyApiPath('iam', '/users'),
    user: (id: string) => buildLegacyApiPath('iam', `/users/${id}`),
    roles: buildLegacyApiPath('iam', '/roles'),
    role: (id: string) => buildLegacyApiPath('iam', `/roles/${id}`),
    permissions: buildLegacyApiPath('iam', '/permissions'),
    departments: buildLegacyApiPath('iam', '/departments'),
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
    definitions: buildLegacyApiPath('workflow', '/definitions'),
    definition: (id: string) => buildLegacyApiPath('workflow', `/definitions/${id}`),
    instances: buildLegacyApiPath('workflow', '/instances'),
    instance: (id: string) => buildLegacyApiPath('workflow', `/instances/${id}`),
    tasks: buildLegacyApiPath('workflow', '/tasks'),
    task: (id: string) => buildLegacyApiPath('workflow', `/tasks/${id}`),
    approve: (id: string) => buildLegacyApiPath('workflow', `/tasks/${id}/approve`),
    reject: (id: string) => buildLegacyApiPath('workflow', `/tasks/${id}/reject`),
    start: buildLegacyApiPath('workflow', '/instances/start'),
    history: (instanceId: string) =>
      buildLegacyApiPath('workflow', `/instances/${instanceId}/history`),
  },
  hrm: {
    employees: buildLegacyApiPath('hrm', '/employees'),
    employee: (id: string) => buildLegacyApiPath('hrm', `/employees/${id}`),
    departments: buildLegacyApiPath('hrm', '/departments'),
    attendance: buildLegacyApiPath('hrm', '/attendance'),
    leave: buildLegacyApiPath('hrm', '/leave'),
    contracts: buildLegacyApiPath('hrm', '/contracts'),
    payroll: buildLegacyApiPath('hrm', '/payroll'),
    performance: buildLegacyApiPath('hrm', '/performance'),
    recruitment: buildLegacyApiPath('hrm', '/recruitment'),
    training: buildLegacyApiPath('hrm', '/training'),
    company: buildLegacyApiPath('hrm', '/company'),
  },
  qms: {
    standards: buildLegacyApiPath('qms', '/quality-standards'),
    standard: (id: string) => buildLegacyApiPath('qms', `/quality-standards/${id}`),
    inspections: buildLegacyApiPath('qms', '/quality-inspections'),
    inspection: (id: string) => buildLegacyApiPath('qms', `/quality-inspections/${id}`),
    issues: buildLegacyApiPath('qms', '/quality-issues'),
    issue: (id: string) => buildLegacyApiPath('qms', `/quality-issues/${id}`),
    correctiveActions: buildLegacyApiPath('qms', '/corrective-actions'),
    audits: buildLegacyApiPath('qms', '/quality-audits'),
    dashboard: buildLegacyApiPath('qms', '/dashboard'),
    spc: buildLegacyApiPath('qms', '/spc'),
    fmea: buildLegacyApiPath('qms', '/fmea'),
    eightD: buildLegacyApiPath('qms', '/8d'),
    apqp: buildLegacyApiPath('qms', '/apqp'),
    qualityCost: buildLegacyApiPath('qms', '/quality-cost'),
  },
  mes: {
    productionOrders: buildLegacyApiPath('mes', '/production-orders'),
    productionOrder: (id: string) => buildLegacyApiPath('mes', `/production-orders/${id}`),
    workStations: buildLegacyApiPath('mes', '/work-stations'),
    equipment: buildLegacyApiPath('mes', '/equipment'),
    materials: buildLegacyApiPath('mes', '/materials'),
    wip: buildLegacyApiPath('mes', '/wip'),
    qualityTraceability: buildLegacyApiPath('mes', '/quality-traceability'),
    productionRecords: buildLegacyApiPath('mes', '/production-records'),
  },
  erp: {
    customers: buildLegacyApiPath('erp', '/customers'),
    customer: (id: string) => buildLegacyApiPath('erp', `/customers/${id}`),
    suppliers: buildLegacyApiPath('erp', '/suppliers'),
    supplier: (id: string) => buildLegacyApiPath('erp', `/suppliers/${id}`),
    materials: buildLegacyApiPath('erp', '/materials'),
    inventory: buildLegacyApiPath('erp', '/inventory'),
    purchaseOrders: buildLegacyApiPath('erp', '/purchase-orders'),
    salesOrders: buildLegacyApiPath('erp', '/sales-orders'),
    vouchers: buildLegacyApiPath('erp', '/vouchers'),
    assets: buildLegacyApiPath('erp', '/assets'),
  },
  file: {
    upload: buildLegacyApiPath('file', '/upload'),
    files: buildLegacyApiPath('file', '/files'),
    file: (id: string) => buildLegacyApiPath('file', `/files/${id}`),
    folders: buildLegacyApiPath('file', '/folders'),
    download: (id: string) => buildLegacyApiPath('file', `/files/${id}/download`),
    presignedUrl: buildLegacyApiPath('file', '/presigned-url'),
  },
  ai: {
    chat: buildLegacyApiPath('ai', '/chat'),
    qa: buildLegacyApiPath('ai', '/qa'),
    analysis: buildLegacyApiPath('ai', '/analysis'),
    documents: buildLegacyApiPath('ai', '/documents'),
    code: buildLegacyApiPath('ai', '/code'),
    recommendation: buildLegacyApiPath('ai', '/recommendation'),
    vector: buildLegacyApiPath('ai', '/vector'),
  },
  pm: {
    projects: buildLegacyApiPath('pm', '/projects'),
    project: (id: string) => buildLegacyApiPath('pm', `/projects/${id}`),
    phases: buildLegacyApiPath('pm', '/phases'),
    milestones: buildLegacyApiPath('pm', '/milestones'),
    tasks: buildLegacyApiPath('pm', '/tasks'),
    members: buildLegacyApiPath('pm', '/members'),
    budget: buildLegacyApiPath('pm', '/budget'),
    risks: buildLegacyApiPath('pm', '/risks'),
    issues: buildLegacyApiPath('pm', '/issues'),
    documents: buildLegacyApiPath('pm', '/documents'),
  },
  wms: {
    warehouses: buildLegacyApiPath('wms', '/warehouses'),
    locations: buildLegacyApiPath('wms', '/locations'),
    inventory: buildLegacyApiPath('wms', '/inventory'),
    inbound: buildLegacyApiPath('wms', '/inbound-orders'),
    outbound: buildLegacyApiPath('wms', '/outbound-orders'),
    transfers: buildLegacyApiPath('wms', '/transfers'),
    stocktake: buildLegacyApiPath('wms', '/stocktake'),
  },
  scm: {
    suppliers: buildLegacyApiPath('scm', '/suppliers'),
    purchaseOrders: buildLegacyApiPath('scm', '/purchase-orders'),
    purchaseItems: buildLegacyApiPath('scm', '/purchase-items'),
    mrpPlans: buildLegacyApiPath('scm', '/mrp-plans'),
    mrpSuggestions: buildLegacyApiPath('scm', '/mrp-suggestions'),
    incomingInspection: buildLegacyApiPath('scm', '/incoming-inspection'),
    priceComparison: buildLegacyApiPath('scm', '/price-comparison'),
    supplierEvaluation: buildLegacyApiPath('scm', '/supplier-evaluation'),
    dashboard: buildLegacyApiPath('scm', '/dashboard'),
  },
} as const;

export default {
  API_VERSION,
  SERVICE_CODES,
  buildApiPath,
  buildLegacyApiPath,
  buildV1Path,
  normalizeApiPath,
  API_PATHS,
};
