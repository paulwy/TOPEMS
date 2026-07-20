import type { ModuleNavConfig } from '../types';

type ModuleConfigLoader = () => Promise<{ default: ModuleNavConfig }>;

const lazyLoaders: Record<string, ModuleConfigLoader> = {
  ai: () => import('@/modules/ai/config').then((m) => ({ default: m.aiNavConfig })),
  admin: () => import('@/modules/admin/config').then((m) => ({ default: m.adminNavConfig })),
  asset: () => import('@/modules/asset/config').then((m) => ({ default: m.assetNavConfig })),
  bi: () => import('@/modules/bi/config').then((m) => ({ default: m.biNavConfig })),
  crm: () => import('@/modules/crm/config').then((m) => ({ default: m.crmNavConfig })),
  doc: () => import('@/modules/doc/config').then((m) => ({ default: m.docNavConfig })),
  ehs: () => import('@/modules/ehs/config').then((m) => ({ default: m.ehsNavConfig })),
  erp: () => import('@/modules/erp/config').then((m) => ({ default: m.erpNavConfig })),
  finance: () => import('@/modules/finance/config').then((m) => ({ default: m.financeNavConfig })),
  gis: () => import('@/modules/gis/config').then((m) => ({ default: m.gisNavConfig })),
  hrm: () => import('@/modules/hrm/config').then((m) => ({ default: m.hrmNavConfig })),
  iam: () => import('@/modules/iam/config').then((m) => ({ default: m.iamNavConfig })),
  im: () => import('@/modules/im/config').then((m) => ({ default: m.imNavConfig })),
  integration: () => import('@/modules/integration/config').then((m) => ({ default: m.integrationNavConfig })),
  lims: () => import('@/modules/lims/config').then((m) => ({ default: m.limsNavConfig })),
  lowcode: () => import('@/modules/lowcode/config').then((m) => ({ default: m.lowcodeNavConfig })),
  mes: () => import('@/modules/mes/config').then((m) => ({ default: m.mesNavConfig })),
  mobile: () => import('@/modules/mobile/config').then((m) => ({ default: m.mobileNavConfig })),
  monitor: () => import('@/modules/monitor/config').then((m) => ({ default: m.monitorNavConfig })),
  notification: () => import('@/modules/notification/config').then((m) => ({ default: m.notificationNavConfig })),
  oa: () => import('@/modules/oa/config').then((m) => ({ default: m.oaNavConfig })),
  pdm: () => import('@/modules/pdm/config').then((m) => ({ default: m.pdmNavConfig })),
  pm: () => import('@/modules/pm/config').then((m) => ({ default: m.pmNavConfig })),
  plugin: () => import('@/modules/plugin/config').then((m) => ({ default: m.pluginNavConfig })),
  qms: () => import('@/modules/qms/config').then((m) => ({ default: m.qmsNavConfig })),
  report: () => import('@/modules/report/config').then((m) => ({ default: m.reportNavConfig })),
  rd: () => import('@/modules/rd/config').then((m) => ({ default: m.rdNavConfig })),
  scm: () => import('@/modules/scm/config').then((m) => ({ default: m.scmNavConfig })),
  srm: () => import('@/modules/srm/config').then((m) => ({ default: m.srmNavConfig })),
  wms: () => import('@/modules/wms/config').then((m) => ({ default: m.wmsNavConfig })),
  workflow: () => import('@/modules/workflow/config').then((m) => ({ default: m.workflowNavConfig })),
};

export const lazyLoadModuleConfig = async (moduleCode: string): Promise<ModuleNavConfig | null> => {
  const loader = lazyLoaders[moduleCode];
  if (!loader) {
    return null;
  }
  try {
    const result = await loader();
    return result.default;
  } catch {
    return null;
  }
};

export const preloadModuleConfigs = async (moduleCodes: string[]): Promise<void> => {
  const loaders = moduleCodes.map((code) => lazyLoadModuleConfig(code));
  await Promise.allSettled(loaders);
};

export const getAvailableModuleCodes = (): string[] => Object.keys(lazyLoaders);