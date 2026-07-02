export { authRoutes } from './auth';
export { dashboardRoutes } from './dashboard';
export { commonRoutes } from './common';
export { legacyRedirects } from './compatibility';

export {
  coreModuleRoutes,
  getAllRoutes,
  getModuleRoutes,
  findRouteByPath,
  toFlatRouteConfig,
  allV2FlatRoutes,
} from './v2';
export type {
  RouteModuleConfig,
  RouteConfigV2,
  RouteConfig,
  PageTemplateType,
  LayoutType,
} from './v2/types';
export { lazyWithRetry } from './v2/types';
