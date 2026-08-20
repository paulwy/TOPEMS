import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

export interface EmptyRegistryModuleProps {}

const REGISTRY_PATHS = {
  root: '/registry',
  dashboard: '/registry/dashboard',
} as const;

const registryModuleConfig: RouteModuleConfig = {
  code: 'registry',
  name: i18n.t('shared.registry.k0'),
  nameKey: 'shared.registry.k0',
  icon: 'Archive',
  path: REGISTRY_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 24,
  description: i18n.t('shared.registry.k1'),
  permission: 'registry:dashboard:read',
  routes: [],
};
