import { flattenRoutes, toFlatRouteConfig } from './types';
import type { RouteModuleConfig, RouteConfigV2, RouteConfig } from './types';
import { pluginManager } from '../../lib/plugin-loader/PluginManager';
import { apiLogger } from '../../utils/logger';

const moduleImports: Record<string, () => Promise<{ [key: string]: RouteModuleConfig }>> = {
  iam: () => import('@/modules/iam/config').then((m) => ({ iamModuleConfig: m.iamModuleConfig })),
  admin: () =>
    import('@/modules/admin/config').then((m) => ({ adminModuleConfig: m.adminModuleConfig })),
  workflow: () =>
    import('@/modules/workflow/config').then((m) => ({
      workflowModuleConfig: m.workflowModuleConfig,
    })),
  notification: () =>
    import('@/modules/notification/config').then((m) => ({
      notificationModuleConfig: m.notificationModuleConfig,
    })),
  doc: () => import('@/modules/doc/config').then((m) => ({ docModuleConfig: m.docModuleConfig })),
  // report 与 bi 为不同功能页面，但后端均调用 analytics 服务（端口 8060）
  report: () =>
    import('@/modules/report/config').then((m) => ({ reportModuleConfig: m.reportModuleConfig })),
  monitor: () =>
    import('@/modules/monitor/config').then((m) => ({
      monitorModuleConfig: m.monitorModuleConfig,
    })),
  integration: () =>
    import('@/modules/integration/config').then((m) => ({
      integrationModuleConfig: m.integrationModuleConfig,
    })),
  ai: () => import('@/modules/ai/config').then((m) => ({ aiModuleConfig: m.aiModuleConfig })),
  mobile: () =>
    import('@/modules/mobile/config').then((m) => ({ mobileModuleConfig: m.mobileModuleConfig })),
  hrm: () => import('@/modules/hrm/config').then((m) => ({ hrmModuleConfig: m.hrmModuleConfig })),
  finance: () =>
    import('@/modules/finance/config').then((m) => ({
      financeModuleConfig: m.financeModuleConfig,
    })),
  crm: () => import('@/modules/crm/config').then((m) => ({ crmModuleConfig: m.crmModuleConfig })),
  mes: () => import('@/modules/mes/config').then((m) => ({ mesModuleConfig: m.mesModuleConfig })),
  qms: () => import('@/modules/qms/config').then((m) => ({ qmsModuleConfig: m.qmsModuleConfig })),
  lims: () =>
    import('@/modules/lims/config').then((m) => ({ limsModuleConfig: m.limsModuleConfig })),
  ehs: () => import('@/modules/ehs/config').then((m) => ({ ehsModuleConfig: m.ehsModuleConfig })),
  scm: () => import('@/modules/scm/config').then((m) => ({ scmModuleConfig: m.scmModuleConfig })),
  erp: () => import('@/modules/erp/config').then((m) => ({ erpModuleConfig: m.erpModuleConfig })),
  wms: () => import('@/modules/wms/config').then((m) => ({ wmsModuleConfig: m.wmsModuleConfig })),
  pm: () => import('@/modules/pm/config').then((m) => ({ pmModuleConfig: m.pmModuleConfig })),
  pdm: () => import('@/modules/pdm/config').then((m) => ({ pdmModuleConfig: m.pdmModuleConfig })),
  srm: () => import('@/modules/srm/config').then((m) => ({ srmModuleConfig: m.srmModuleConfig })),
  rd: () => import('@/modules/rd/config').then((m) => ({ rdModuleConfig: m.rdModuleConfig })),
  plugin: () =>
    import('@/modules/plugin/config').then((m) => ({ pluginModuleConfig: m.pluginModuleConfig })),
  im: () => import('@/modules/im/config').then((m) => ({ imModuleConfig: m.imModuleConfig })),
  // bi 与 report 为不同功能页面，但后端均调用 analytics 服务（端口 8060）
  bi: () => import('@/modules/bi/config').then((m) => ({ biModuleConfig: m.biModuleConfig })),
  gis: () => import('@/modules/gis/config').then((m) => ({ gisModuleConfig: m.gisModuleConfig })),
  asset: () =>
    import('@/modules/asset/config').then((m) => ({ assetModuleConfig: m.assetModuleConfig })),
  lowcode: () =>
    import('@/modules/lowcode/config').then((m) => ({
      lowcodeModuleConfig: m.lowcodeModuleConfig,
    })),
  oa: () => import('@/modules/oa/config').then((m) => ({ oaModuleConfig: m.oaModuleConfig })),
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

  try {
    await pluginManager.initialize();
    const activePlugins = pluginManager.getActivePlugins();

    for (const plugin of activePlugins) {
      try {
        const moduleConfig = await loadModuleConfig(plugin.code);
        allRoutes.push(...flattenRoutes(moduleConfig.routes));
      } catch (e) {
        apiLogger.warn(`Failed to load routes for active plugin: ${plugin.code}`, e);
      }
    }
  } catch (e) {
    apiLogger.warn('PluginManager not initialized, falling back to loading all modules', e);

    for (const moduleCode of Object.keys(moduleImports)) {
      try {
        const moduleConfig = await loadModuleConfig(moduleCode);
        allRoutes.push(...flattenRoutes(moduleConfig.routes));
      } catch (e) {
        apiLogger.error(`Failed to load module routes: ${moduleCode}`, e);
      }
    }
  }

  return allRoutes;
}

export async function getActiveRoutes(): Promise<RouteConfigV2[]> {
  const allRoutes: RouteConfigV2[] = [];

  try {
    await pluginManager.initialize();
    const activePlugins = pluginManager.getActivePlugins();

    for (const plugin of activePlugins) {
      try {
        const moduleConfig = await loadModuleConfig(plugin.code);
        allRoutes.push(...flattenRoutes(moduleConfig.routes));
      } catch (e) {
        apiLogger.warn(`Failed to load routes for active plugin: ${plugin.code}`, e);
      }
    }
  } catch (e) {
    apiLogger.warn('Failed to get active routes from PluginManager', e);
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

export async function getActiveModuleCodes(): Promise<string[]> {
  try {
    await pluginManager.initialize();
    return pluginManager.getActivePlugins().map((p) => p.code);
  } catch {
    return Object.keys(moduleImports);
  }
}

export async function getActiveModuleConfigs(): Promise<RouteModuleConfig[]> {
  const configs: RouteModuleConfig[] = [];

  try {
    await pluginManager.initialize();
    const activePlugins = pluginManager.getActivePlugins();

    for (const plugin of activePlugins) {
      try {
        const moduleConfig = await loadModuleConfig(plugin.code);
        configs.push(moduleConfig);
      } catch (e) {
        apiLogger.warn(`Failed to load config for active plugin: ${plugin.code}`, e);
      }
    }
  } catch (e) {
    apiLogger.warn('Failed to get active module configs', e);
  }

  return configs;
}

export async function getActiveRouteConfigs(): Promise<RouteConfig[]> {
  const configs = await getActiveModuleConfigs();
  return toFlatRouteConfig(configs);
}

export const coreModuleCodes = [
  // 核心模块
  'iam',
  'admin',
  'workflow',
  'communication',
  'file',
  'tenant',
  'billing',
  'plugin',
  'sync',
  'dict',
  'help',
  'migration',
  // 核心轻量版（基础功能随核心提供）
  'erp',
  'pm',
  'mobile',
  'portal',
] as const;

export const coreModuleRoutes = Object.keys(moduleImports).map((code) => ({
  code,
}));

export async function reloadRoutesOnPluginChange(): Promise<void> {
  apiLogger.info('[Router] Reloading routes due to plugin change');
  loadedModules.clear();
  loadingPromises.clear();
}

pluginManager.emitter.on('pluginInstalled', async (pluginCode) => {
  apiLogger.info(`[Router] Plugin installed: ${pluginCode}, reloading routes...`);
  await reloadRoutesOnPluginChange();
});

pluginManager.emitter.on('pluginUninstalled', async (pluginCode) => {
  apiLogger.info(`[Router] Plugin uninstalled: ${pluginCode}, reloading routes...`);
  await reloadRoutesOnPluginChange();
});

pluginManager.emitter.on('pluginActivated', async (pluginCode) => {
  apiLogger.info(`[Router] Plugin activated: ${pluginCode}, reloading routes...`);
  await reloadRoutesOnPluginChange();
});

pluginManager.emitter.on('pluginDeactivated', async (pluginCode) => {
  apiLogger.info(`[Router] Plugin deactivated: ${pluginCode}, reloading routes...`);
  await reloadRoutesOnPluginChange();
});

pluginManager.emitter.on('pluginsUpdated', async () => {
  apiLogger.info('[Router] Plugins updated, reloading routes...');
  await reloadRoutesOnPluginChange();
});
