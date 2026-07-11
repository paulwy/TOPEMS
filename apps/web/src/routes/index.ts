export { authRoutes } from './auth';
export { dashboardRoutes } from './dashboard';
export { commonRoutes } from './common';

export {
  getAllRoutes,
  getModuleRoutes,
  findRouteByPath,
  findRouteByPathSync,
  coreModuleCodes,
  loadModuleConfig,
  getLoadedModules,
} from './v2';
export { toFlatRouteConfig, lazyWithRetry } from './v2/types';
export type {
  RouteModuleConfig,
  RouteConfigV2,
  RouteConfig,
  PageTemplateType,
  LayoutType,
} from './v2/types';
