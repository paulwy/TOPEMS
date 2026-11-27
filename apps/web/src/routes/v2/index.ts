import type { RouteModuleConfig, RouteConfigV2 } from './types';
import { flattenRoutes } from './types';
import { pluginManager } from '../../lib/plugin-loader/pluginManager';
import { apiLogger } from '../../utils/logger';
import { ensureNamespacesLoaded } from '@/i18n';

const moduleImports: Record<string, () => Promise<{ [key: string]: RouteModuleConfig }>> = {
  iam: () =>
    import('@/module-configs/iam/config').then((m) => ({ iamModuleConfig: m.iamModuleConfig })),
  admin: () =>
    import('@/module-configs/admin/config').then((m) => ({
      adminModuleConfig: m.adminModuleConfig,
    })),
  // 自动化模块（V64 新增，第 33 个模块，order 70）
  automation: () =>
    import('@/module-configs/automation/config').then((m) => ({
      automationModuleConfig: m.automationModuleConfig,
    })),
  workflow: () =>
    import('@/module-configs/workflow/config').then((m) => ({
      workflowModuleConfig: m.workflowModuleConfig,
    })),
  notification: () =>
    import('@/module-configs/notification/config').then((m) => ({
      notificationModuleConfig: m.notificationModuleConfig,
    })),
  doc: () =>
    import('@/module-configs/doc/config').then((m) => ({ docModuleConfig: m.docModuleConfig })),
  // report 与 bi 为不同功能页面，但后端均调用 analytics 服务（端口 8060）
  report: () =>
    import('@/module-configs/report/config').then((m) => ({
      reportModuleConfig: m.reportModuleConfig,
    })),
  monitor: () =>
    import('@/module-configs/monitor/config').then((m) => ({
      monitorModuleConfig: m.monitorModuleConfig,
    })),
  integration: () =>
    import('@/module-configs/integration/config').then((m) => ({
      integrationModuleConfig: m.integrationModuleConfig,
    })),
  ai: () =>
    import('@/module-configs/ai/config').then((m) => ({ aiModuleConfig: m.aiModuleConfig })),
  mobile: () =>
    import('@/module-configs/mobile/config').then((m) => ({
      mobileModuleConfig: m.mobileModuleConfig,
    })),
  hrm: () =>
    import('@/module-configs/hrm/config').then((m) => ({ hrmModuleConfig: m.hrmModuleConfig })),
  finance: () =>
    import('@/module-configs/finance/config').then((m) => ({
      financeModuleConfig: m.financeModuleConfig,
    })),
  crm: () =>
    import('@/module-configs/crm/config').then((m) => ({ crmModuleConfig: m.crmModuleConfig })),
  mes: () =>
    import('@/module-configs/mes/config').then((m) => ({ mesModuleConfig: m.mesModuleConfig })),
  qms: () =>
    import('@/module-configs/qms/config').then((m) => ({ qmsModuleConfig: m.qmsModuleConfig })),
  lims: () =>
    import('@/module-configs/lims/config').then((m) => ({ limsModuleConfig: m.limsModuleConfig })),
  ehs: () =>
    import('@/module-configs/ehs/config').then((m) => ({ ehsModuleConfig: m.ehsModuleConfig })),
  scm: () =>
    import('@/module-configs/scm/config').then((m) => ({ scmModuleConfig: m.scmModuleConfig })),
  erp: () =>
    import('@/module-configs/erp/config').then((m) => ({ erpModuleConfig: m.erpModuleConfig })),
  wms: () =>
    import('@/module-configs/wms/config').then((m) => ({ wmsModuleConfig: m.wmsModuleConfig })),
  pm: () =>
    import('@/module-configs/pm/config').then((m) => ({ pmModuleConfig: m.pmModuleConfig })),
  pdm: () =>
    import('@/module-configs/pdm/config').then((m) => ({ pdmModuleConfig: m.pdmModuleConfig })),
  srm: () =>
    import('@/module-configs/srm/config').then((m) => ({ srmModuleConfig: m.srmModuleConfig })),
  rd: () =>
    import('@/module-configs/rd/config').then((m) => ({ rdModuleConfig: m.rdModuleConfig })),
  plugin: () =>
    import('@/module-configs/plugin/config').then((m) => ({
      pluginModuleConfig: m.pluginModuleConfig,
    })),
  im: () =>
    import('@/module-configs/im/config').then((m) => ({ imModuleConfig: m.imModuleConfig })),
  // bi 与 report 为不同功能页面，但后端均调用 analytics 服务（端口 8060）
  bi: () =>
    import('@/module-configs/bi/config').then((m) => ({ biModuleConfig: m.biModuleConfig })),
  tms: () =>
    import('@/module-configs/tms/config').then((m) => ({ tmsModuleConfig: m.tmsModuleConfig })),
  aps: () =>
    import('@/module-configs/aps/config').then((m) => ({ apsModuleConfig: m.apsModuleConfig })),
  gis: () =>
    import('@/module-configs/gis/config').then((m) => ({ gisModuleConfig: m.gisModuleConfig })),
  asset: () =>
    import('@/module-configs/asset/config').then((m) => ({
      assetModuleConfig: m.assetModuleConfig,
    })),
  oa: () =>
    import('@/module-configs/oa/config').then((m) => ({ oaModuleConfig: m.oaModuleConfig })),
  ticket: () =>
    import('@/module-configs/ticket/config').then((m) => ({
      ticketModuleConfig: m.ticketModuleConfig,
    })),
  // 主数据治理模块（V66 数据资产目录试点，2026-09-10）
  master: () =>
    import('@/module-configs/master/config').then((m) => ({
      masterModuleConfig: m.masterModuleConfig,
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
  // 加载组件/templates/schemas/services/pages（与业务 NS 同时预热），
  // 这会与 DynamicRoutes / useRouteNamespacePreload 形成多入口幂等保障。
  const baseNamespaces = [moduleCode, 'components', 'templates', 'schemas', 'services', 'pages'];

  const promise = (async () => {
    // Phase 1: 先加载基础命名空间（必须 await 完成，避免模块 config 顶层
    // 求值 i18n.t(...) 时业务命名空间尚未注入 → 页面标题显示原始 i18n 键）
    await ensureNamespacesLoaded(baseNamespaces).catch((e) => {
      apiLogger.warn(`[i18n] preload ns for module ${moduleCode} skipped`, e);
    });

    // Phase 2: 加载模块代码
    const module = await importFn();
    const moduleConfig = module[`${moduleCode}ModuleConfig`] as RouteModuleConfig;

    // Phase 3: 如果模块配置了额外的 preloadNamespaces，等待它们加载完成
    const preloadNamespaces = moduleConfig.preloadNamespaces;
    if (preloadNamespaces && preloadNamespaces.length > 0) {
      await ensureNamespacesLoaded(preloadNamespaces).catch((e) => {
        apiLogger.warn(
          `[i18n] preload extra ns [${preloadNamespaces.join(',')}] for module ${moduleCode} skipped`,
          e
        );
      });
    }

    loadedModules.set(moduleCode, moduleConfig);
    return moduleConfig;
  })().catch((error) => {
    loadingPromises.delete(moduleCode);
    throw error;
  });

  loadingPromises.set(moduleCode, promise);
  return promise;
}

/**
 * 并发受限地批量加载模块配置。
 *
 * 历史实现是「for + await」，37 个模块 × 6 个 i18n 命名空间串成一条长链：
 * 每个模块要等自己的命名空间 + config chunk 落地才轮到下一个，经 CF 隧道
 * 每跳约 500ms，整条链十几秒（实测 /crm/sales-funnel 首屏 15.9s，其中业务
 * API 只占 1–3s）。改成有限并发：默认 6 路，既能压平串行等待，又不会把
 * 上百个 chunk 一次性打满出口带宽。
 */
async function loadModuleConfigsInParallel(
  moduleCodes: string[],
  concurrency = 6
): Promise<Array<{ code: string; config?: RouteModuleConfig; error?: unknown }>> {
  const results: Array<{ code: string; config?: RouteModuleConfig; error?: unknown }> = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, moduleCodes.length) }, async () => {
    while (cursor < moduleCodes.length) {
      const index = cursor++;
      const code = moduleCodes[index];
      try {
        const config = await loadModuleConfig(code);
        results[index] = { code, config };
      } catch (error) {
        results[index] = { code, error };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export async function getAllRoutes(): Promise<RouteConfigV2[]> {
  const allRoutes: RouteConfigV2[] = [];

  try {
    await pluginManager.initialize();
    const activePlugins = pluginManager.getActivePlugins();

    // 并行加载：原串行 for-await 是首屏十几秒的主因（每模块 ~2 次往返叠加）
    const loaded = await loadModuleConfigsInParallel(
      activePlugins.map((plugin) => plugin.code)
    );
    for (const item of loaded) {
      if (item.error) {
        apiLogger.warn(`Failed to load routes for active plugin: ${item.code}`, item.error);
        continue;
      }
      if (item.config) allRoutes.push(...flattenRoutes(item.config.routes));
    }
  } catch (e) {
    apiLogger.warn('PluginManager not initialized, falling back to loading all modules', e);

    const loaded = await loadModuleConfigsInParallel(Object.keys(moduleImports));
    for (const item of loaded) {
      if (item.error) {
        apiLogger.error(`Failed to load module routes: ${item.code}`, item.error);
        continue;
      }
      if (item.config) allRoutes.push(...flattenRoutes(item.config.routes));
    }
  }

  return allRoutes;
}

export async function getModuleRoutes(moduleCode: string): Promise<RouteConfigV2[]> {
  const moduleConfig = await loadModuleConfig(moduleCode);
  return flattenRoutes(moduleConfig.routes);
}

export function findRouteByPathSync(path: string): RouteConfigV2 | undefined {
  for (const moduleConfig of loadedModules.values()) {
    const routes = flattenRoutes(moduleConfig.routes);
    const found = routes.find((r) => r.path === path);
    if (found) return found;
  }
  return undefined;
}

export async function getActiveModuleConfigs(): Promise<RouteModuleConfig[]> {
  const configs: RouteModuleConfig[] = [];

  try {
    await pluginManager.initialize();
    const activePlugins = pluginManager.getActivePlugins();

    const loaded = await loadModuleConfigsInParallel(
      activePlugins.map((plugin) => plugin.code)
    );
    for (const item of loaded) {
      if (item.error) {
        apiLogger.warn(`Failed to load config for active plugin: ${item.code}`, item.error);
        continue;
      }
      if (item.config) configs.push(item.config);
    }
  } catch (e) {
    apiLogger.warn('Failed to get active module configs', e);
  }

  return configs;
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
