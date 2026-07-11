import type { RouteModuleConfig, RouteConfig } from './types';
import { flattenRoutes, toFlatRouteConfig } from './types';

const moduleImports: Record<
  string,
  () => Promise<{ default: RouteModuleConfig | { [key: string]: RouteModuleConfig } }>
> = {
  iam: () => import('@/modules/iam/config').then((m) => ({ default: m.iamModuleConfig })),
  admin: () => import('@/modules/admin/config').then((m) => ({ default: m.adminModuleConfig })),
  workflow: () => import('@/modules/workflow/config').then((m) => ({ default: m.workflowModuleConfig })),
  notification: () =>
    import('@/modules/notification/config').then((m) => ({ default: m.notificationModuleConfig })),
  doc: () => import('@/modules/doc/config').then((m) => ({ default: m.docModuleConfig })),
  report: () => import('@/modules/report/config').then((m) => ({ default: m.reportModuleConfig })),
  monitor: () => import('@/modules/monitor/config').then((m) => ({ default: m.monitorModuleConfig })),
  integration: () => import('@/modules/integration/config').then((m) => ({ default: m.integrationModuleConfig })),
  ai: () => import('@/modules/ai/config').then((m) => ({ default: m.aiModuleConfig })),
  mobile: () => import('@/modules/mobile/config').then((m) => ({ default: m.mobileModuleConfig })),
  hrm: () => import('@/modules/hrm/config').then((m) => ({ default: m.hrmModuleConfig })),
  finance: () => import('./finance').then((m) => ({ default: m.financeModuleConfig })),
  crm: () => import('@/modules/crm/config').then((m) => ({ default: m.crmModuleConfig })),
  mes: () => import('./mes').then((m) => ({ default: m.mesModuleConfig })),
  qms: () => import('./qms').then((m) => ({ default: m.qmsModuleConfig })),
  lims: () => import('./lims').then((m) => ({ default: m.limsModuleConfig })),
  ehs: () => import('./ehs').then((m) => ({ default: m.ehsModuleConfig })),
  scm: () => import('@/modules/scm/config').then((m) => ({ default: m.scmModuleConfig })),
  erp: () => import('./erp').then((m) => ({ default: m.erpModuleConfig })),
  wms: () => import('@/modules/wms/config').then((m) => ({ default: m.wmsModuleConfig })),
  pm: () => import('@/modules/pm/config').then((m) => ({ default: m.pmModuleConfig })),
  pdm: () => import('@/modules/pdm/config').then((m) => ({ default: m.pdmModuleConfig })),
  srm: () => import('@/modules/srm/config').then((m) => ({ default: m.srmModuleConfig })),
  oa: () => import('./oa').then((m) => ({ default: m.oaModuleConfig })),
  lowcode: () => import('./lowcode').then((m) => ({ default: m.lowcodeModuleConfig })),
  rs: () => import('@/modules/rs/config').then((m) => ({ default: m.rsModuleConfig })),
  asset: () => import('./asset').then((m) => ({ default: m.assetModuleConfig })),
  plugin: () => import('./plugin').then((m) => ({ default: m.pluginModuleConfig })),
  im: () => import('./im').then((m) => ({ default: m.imModuleConfig })),
  bi: () => import('./bi').then((m) => ({ default: m.biModuleConfig })),
  gis: () => import('./gis').then((m) => ({ default: m.gisModuleConfig })),
};

const loadedModules = new Map<string, RouteModuleConfig>();
const loadingPromises = new Map<string, Promise<RouteModuleConfig>>();

export async function loadModuleConfig(moduleCode: string): Promise<RouteModuleConfig> {
  if (loadedModules.has(moduleCode)) {
    return loadedModules.get(moduleCode)!;
  }

  if (loadingPromises.has(moduleCode)) {
    return loadingPromises.get(moduleCode)!;
  }

  const importFn = moduleImports[moduleCode];
  if (!importFn) {
    throw new Error(`Module ${moduleCode} not found`);
  }

  const promise = importFn()
    .then((result) => {
      const config = result.default as RouteModuleConfig;
      loadedModules.set(moduleCode, config);
      return config;
    })
    .catch((error) => {
      loadingPromises.delete(moduleCode);
      throw error;
    });

  loadingPromises.set(moduleCode, promise);
  return promise;
}

export async function getModuleRoutes(moduleCode: string): Promise<RouteConfig[]> {
  const config = await loadModuleConfig(moduleCode);
  const flatRoutes = flattenRoutes(config.routes);
  return toFlatRouteConfig([config]);
}

export async function preloadModule(moduleCode: string): Promise<void> {
  await loadModuleConfig(moduleCode);
}

export function getLoadedModules(): string[] {
  return Array.from(loadedModules.keys());
}

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
] as const;
