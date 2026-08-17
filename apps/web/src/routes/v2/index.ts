import type { RouteModuleConfig, RouteConfigV2, RouteConfig } from './types';
import { flattenRoutes, toFlatRouteConfig } from './types';
import { pluginManager } from '../../lib/plugin-loader/PluginManager.ts';
import { apiLogger } from '../../utils/logger';
import { ensureNamespacesLoaded } from '@/i18n';

const moduleImports: Record<string, () => Promise<{ [key: string]: RouteModuleConfig }>> = {
  iam: () => import('@/modules/iam/config').then((m) => ({ iamModuleConfig: m.iamModuleConfig })),
  admin: () =>
    import('@/modules/admin/config').then((m) => ({ adminModuleConfig: m.adminModuleConfig })),
  // 自动化模块（V64 新增，第 33 个模块，order 70）
  automation: () =>
    import('@/modules/automation/config').then((m) => ({
      automationModuleConfig: m.automationModuleConfig,
    })),
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
  tms: () => import('@/modules/tms/config').then((m) => ({ tmsModuleConfig: m.tmsModuleConfig })),
  aps: () => import('@/modules/aps/config').then((m) => ({ apsModuleConfig: m.apsModuleConfig })),
  gis: () => import('@/modules/gis/config').then((m) => ({ gisModuleConfig: m.gisModuleConfig })),
  asset: () =>
    import('@/modules/asset/config').then((m) => ({ assetModuleConfig: m.assetModuleConfig })),
  lowcode: () =>
    import('@/modules/lowcode/config').then((m) => ({
      lowcodeModuleConfig: m.lowcodeModuleConfig,
    })),
  oa: () => import('@/modules/oa/config').then((m) => ({ oaModuleConfig: m.oaModuleConfig })),
  ticket: () =>
    import('@/modules/ticket/config').then((m) => ({
      ticketModuleConfig: m.ticketModuleConfig,
    })),
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

  // ✨ 按命名空间按需加载：与模块代码 import 并行触发业务 NS 加载。
  // 不 await 加载结果（避免阻塞模块代码），只做 Promise 链式错误隔离。
  // 加载组件/templates/schemas/services/pages（与业务 NS 同时预热），
  // 这会与 DynamicRoutes / useRouteNamespacePreload 形成多入口幂等保障。
  ensureNamespacesLoaded([
    moduleCode, // 业务模块专属 NS（如 wms, crm, mes）
    'components',
    'templates',
    'schemas',
    'services',
    'pages',
  ]).catch((e) => {
    apiLogger.warn(`[i18n] preload ns for module ${moduleCode} skipped`, e);
  });

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

export const coreModuleCodes = Object.keys(moduleImports) as Array<keyof typeof moduleImports>;

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
