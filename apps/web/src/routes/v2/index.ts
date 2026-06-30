import { aiModuleConfig } from './ai';
import { adminModuleConfig } from './admin';
import { assetModuleConfig } from './asset';
import { biModuleConfig } from './bi';
import { crmModuleConfig } from './crm';
import { documentModuleConfig } from './document';
import { docsModuleConfig } from './docs';
import { ehsModuleConfig } from './ehs';
import { erpModuleConfig } from './erp';
import { financeModuleConfig } from './finance';
import { gisModuleConfig } from './gis';
import { hrmModuleConfig } from './hrm';
import { iamModuleConfig } from './iam';
import { imModuleConfig } from './im';
import { integrationModuleConfig } from './integration';
import { limsModuleConfig } from './lims';
import { lowcodeModuleConfig } from './lowcode';
import { mesModuleConfig } from './mes';
import { mobileModuleConfig } from './mobile';
import { monitorModuleConfig } from './monitor';
import { notificationModuleConfig } from './notification';
import { oaModuleConfig } from './oa';
import { pdmModuleConfig } from './pdm';
import { pluginModuleConfig } from './plugin';
import { pmModuleConfig } from './pm';
import { qmsModuleConfig } from './qms';
import { reportModuleConfig } from './report';
import { rsModuleConfig } from './rs';
import { scmModuleConfig } from './scm';
import { srmModuleConfig } from './srm';
import { wmsModuleConfig } from './wms';
import { workflowModuleConfig } from './workflow';
import { flattenRoutes } from './types';
import type { RouteModuleConfig, RouteConfigV2 } from './types';

export const coreModuleRoutes: RouteModuleConfig[] = [
  iamModuleConfig,
  adminModuleConfig,
  workflowModuleConfig,
  notificationModuleConfig,
  documentModuleConfig,
  reportModuleConfig,
  monitorModuleConfig,
  integrationModuleConfig,
  aiModuleConfig,
  mobileModuleConfig,
  hrmModuleConfig,
  financeModuleConfig,
  crmModuleConfig,
  mesModuleConfig,
  qmsModuleConfig,
  limsModuleConfig,
  ehsModuleConfig,
  scmModuleConfig,
  erpModuleConfig,
  wmsModuleConfig,
  pmModuleConfig,
  pdmModuleConfig,
  srmModuleConfig,
  oaModuleConfig,
  lowcodeModuleConfig,
  rsModuleConfig,
  assetModuleConfig,
  docsModuleConfig,
  pluginModuleConfig,
  imModuleConfig,
  biModuleConfig,
  gisModuleConfig,
];

export function getAllRoutes(): RouteConfigV2[] {
  const allRoutes: RouteConfigV2[] = [];
  coreModuleRoutes.forEach((moduleConfig) => {
    allRoutes.push(...flattenRoutes(moduleConfig.routes));
  });
  return allRoutes;
}

export function getModuleRoutes(moduleCode: string): RouteConfigV2[] {
  const moduleConfig = coreModuleRoutes.find((m) => m.code === moduleCode);
  if (!moduleConfig) return [];
  return flattenRoutes(moduleConfig.routes);
}

export function findRouteByPath(path: string): RouteConfigV2 | undefined {
  const allRoutes = getAllRoutes();
  return allRoutes.find((r) => r.path === path);
}

export { iamModuleConfig };
export type { RouteModuleConfig, RouteConfigV2 } from './types';
