import type { RouteConfig, RouteModuleConfig } from './types';
import { flattenRoutes, toFlatRouteConfig } from './types';

const moduleImports: Record<string, () => Promise<{ default: RouteModuleConfig }>> = {
  iam: () => import('@/modules/iam/config').then((m) => ({ default: m.iamModuleConfig })),
  admin: () => import('@/modules/admin/config').then((m) => ({ default: m.adminModuleConfig })),
  workflow: () => import('@/modules/workflow/config').then((m) => ({ default: m.workflowModuleConfig })),
  notification: () =>
    import('@/modules/notification/config').then((m) => ({ default: m.notificationModuleConfig })),
  doc: () => import('@/modules/doc/config').then((m) => ({ default: m.docModuleConfig })),
  report: () => import('./report').then((m) => ({ default: m.reportModuleConfig })),
  monitor: () => import('./monitor').then((m) => ({ default: m.monitorModuleConfig })),
  integration: () => import('./integration').then((m) => ({ default: m.integrationModuleConfig })),
  ai: () => import('./ai').then((m) => ({ default: m.aiModuleConfig })),
  mobile: () => import('./mobile').then((m) => ({ default: m.mobileModuleConfig })),
  hrm: () => import('@/modules/hrm/config').then((m) => ({ default: m.hrmModuleConfig })),
  finance: () => import('./finance').then((m) => ({ default: m.financeModuleConfig })),
  crm: () => import('./crm').then((m) => ({ default: m.crmModuleConfig })),
  mes: () => import('./mes').then((m) => ({ default: m.mesModuleConfig })),
  qms: () => import('./qms').then((m) => ({ default: m.qmsModuleConfig })),
  lims: () => import('./lims').then((m) => ({ default: m.limsModuleConfig })),
  ehs: () => import('./ehs').then((m) => ({ default: m.ehsModuleConfig })),
  scm: () => import('./scm').then((m) => ({ default: m.scmModuleConfig })),
  erp: () => import('./erp').then((m) => ({ default: m.erpModuleConfig })),
  wms: () => import('./wms').then((m) => ({ default: m.wmsModuleConfig })),
  pm: () => import('./pm').then((m) => ({ default: m.pmModuleConfig })),
  pdm: () => import('./pdm').then((m) => ({ default: m.pdmModuleConfig })),
  srm: () => import('./srm').then((m) => ({ default: m.srmModuleConfig })),
  oa: () => import('./oa').then((m) => ({ default: m.oaModuleConfig })),
  lowcode: () => import('./lowcode').then((m) => ({ default: m.lowcodeModuleConfig })),
  rs: () => import('./rs').then((m) => ({ default: m.rsModuleConfig })),
  asset: () => import('./asset').then((m) => ({ default: m.assetModuleConfig })),
  plugin: () => import('./plugin').then((m) => ({ default: m.pluginModuleConfig })),
  im: () => import('./im').then((m) => ({ default: m.imModuleConfig })),
  bi: () => import('./bi').then((m) => ({ default: m.biModuleConfig })),
  gis: () => import('./gis').then((m) => ({ default: m.gisModuleConfig })),
};

export const coreModuleCodes = [
  'iam',
  'admin',
  'workflow',
  'notification',
  'doc',
  'report',
  'monitor',
  'integration',
  'ai',
  'mobile',
  'hrm',
  'finance',
  'crm',
  'mes',
  'qms',
  'lims',
  'ehs',
  'scm',
  'erp',
  'wms',
  'pm',
  'pdm',
  'srm',
  'oa',
  'lowcode',
  'rs',
  'asset',
  'plugin',
  'im',
  'bi',
  'gis',
];

const loadedModules: Record<string, RouteModuleConfig> = {};
const loadingPromises: Record<string, Promise<RouteModuleConfig>> = {};

export async function loadModuleRoutes(moduleCode: string): Promise<RouteModuleConfig> {
  if (loadedModules[moduleCode]) {
    return loadedModules[moduleCode];
  }

  const loadingPromise = loadingPromises[moduleCode];
  if (loadingPromise !== undefined) {
    return loadingPromise;
  }

  const importFn = moduleImports[moduleCode];
  if (!importFn) {
    throw new Error(`Module ${moduleCode} not found`);
  }

  const promise = importFn().then((result) => {
    const moduleConfig = result.default;
    loadedModules[moduleCode] = moduleConfig;
    delete loadingPromises[moduleCode];
    return moduleConfig;
  });

  loadingPromises[moduleCode] = promise;
  return promise;
}

export async function loadAllModuleRoutes(): Promise<RouteModuleConfig[]> {
  const promises = coreModuleCodes.map((code) => loadModuleRoutes(code));
  return Promise.all(promises);
}

export async function loadRoutesByModuleCode(moduleCode: string): Promise<RouteConfig[]> {
  const moduleConfig = await loadModuleRoutes(moduleCode);
  return toFlatRouteConfig([moduleConfig]);
}

export function getLoadedModules(): string[] {
  return Object.keys(loadedModules);
}
