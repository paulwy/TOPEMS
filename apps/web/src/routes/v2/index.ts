import { iamModuleConfig } from './iam';
import { workflowModuleConfig } from './workflow';
import { notificationModuleConfig } from './notification';
import { documentModuleConfig } from './document';
import { monitorModuleConfig } from './monitor';
import { integrationModuleConfig } from './integration';
import { aiModuleConfig } from './ai';
import { mobileModuleConfig } from './mobile';
import { generateNavFromRoutes, flattenRoutes } from './types';
import { navigationRegistryV2 } from '../../lib/navigation/NavigationRegistryV2';
import type { RouteModuleConfig, RouteConfigV2 } from './types';

export const coreModuleRoutes: RouteModuleConfig[] = [
  iamModuleConfig,
  workflowModuleConfig,
  notificationModuleConfig,
  documentModuleConfig,
  monitorModuleConfig,
  integrationModuleConfig,
  aiModuleConfig,
  mobileModuleConfig,
];

export function registerRoutesToNavigation() {
  coreModuleRoutes.forEach((moduleConfig) => {
    const navConfig = generateNavFromRoutes(moduleConfig);
    navigationRegistryV2.registerModule(navConfig);
  });
}

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
