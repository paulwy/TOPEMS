import { flattenRoutes, toFlatRouteConfig } from './types';
import type { RouteModuleConfig, RouteConfigV2, RouteConfig } from './types';

const moduleImports: Record<string, () => Promise<{ [key: string]: RouteModuleConfig }>> = {
  iam: () => import('./iam'),
  admin: () => import('./admin'),
  workflow: () => import('./workflow'),
  notification: () => import('./notification'),
  doc: () => import('./doc'),
  report: () => import('./report'),
  monitor: () => import('./monitor'),
  integration: () => import('./integration'),
  ai: () => import('./ai'),
  mobile: () => import('./mobile'),
  hrm: () => import('./hrm'),
  finance: () => import('./finance'),
  crm: () => import('./crm'),
  mes: () => import('./mes'),
  qms: () => import('./qms'),
  lims: () => import('./lims'),
  ehs: () => import('./ehs'),
  scm: () => import('./scm'),
  erp: () => import('./erp'),
  wms: () => import('./wms'),
  pm: () => import('./pm'),
  pdm: () => import('./pdm'),
  srm: () => import('./srm'),
  oa: () => import('./oa'),
  lowcode: () => import('./lowcode'),
  rs: () => import('./rs'),
  asset: () => import('./asset'),
  plugin: () => import('./plugin'),
  im: () => import('./im'),
  bi: () => import('./bi'),
  gis: () => import('./gis'),
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
    .then((module) => {
      const moduleConfig = module[`${moduleCode}ModuleConfig`] as RouteModuleConfig;
      loadedModules.set(moduleCode, moduleConfig);
      return moduleConfig;
    })
    .catch((error) => {
      loadingPromises.delete(moduleCode);
      throw error;
    });

  loadingPromises.set(moduleCode, promise);
  return promise;
}

export async function getAllRoutes(): Promise<RouteConfigV2[]> {
  const allRoutes: RouteConfigV2[] = [];
  for (const moduleCode of Object.keys(moduleImports)) {
    try {
      const moduleConfig = await loadModuleConfig(moduleCode);
      allRoutes.push(...flattenRoutes(moduleConfig.routes));
    } catch (e) {
      console.error(`Failed to load module routes: ${moduleCode}`, e);
    }
  }
  return allRoutes;
}

export async function getModuleRoutes(moduleCode: string): Promise<RouteConfigV2[]> {
  const moduleConfig = await loadModuleConfig(moduleCode);
  return flattenRoutes(moduleConfig.routes);
}

export async function findRouteByPath(path: string): Promise<RouteConfigV2 | undefined> {
  const allRoutes = await getAllRoutes();
  return allRoutes.find((r) => r.path === path);
}

export function findRouteByPathSync(path: string): RouteConfigV2 | undefined {
  for (const moduleConfig of loadedModules.values()) {
    const routes = flattenRoutes(moduleConfig.routes);
    const found = routes.find((r) => r.path === path);
    if (found) return found;
  }
  return undefined;
}

export function getLoadedModules(): string[] {
  return Array.from(loadedModules.keys());
}

export const coreModuleCodes = [
  'iam', 'admin', 'workflow', 'notification', 'doc', 'report', 'monitor',
  'integration', 'ai', 'mobile', 'hrm', 'finance', 'crm', 'mes', 'qms',
  'lims', 'ehs', 'scm', 'erp', 'wms', 'pm', 'pdm', 'srm', 'oa', 'lowcode',
  'rs', 'asset', 'plugin', 'im', 'bi', 'gis',
] as const;
