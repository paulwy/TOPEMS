import type { RouteModuleConfig } from '@/routes/v2/types';

export const REGISTRY_PATHS = {
  root: '/registry',
  dashboard: '/registry/dashboard',
} as const;

export const registryModuleConfig: RouteModuleConfig = {
  code: 'registry',
  name: 'Registry',
  icon: 'Archive',
  path: REGISTRY_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 24,
  description: 'Plugin registry and module index admin',
  permission: 'registry:dashboard:read',
  routes: [],
};
