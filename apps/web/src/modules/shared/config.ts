import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import i18n from '@/i18n';

export interface EmptySharedModuleProps {}

const SHARED_PATHS = {
  root: '/shared',
  dashboard: '/shared/dashboard',
} as const;

const sharedModuleConfig: RouteModuleConfig = {
  code: 'shared',
  name: i18n.t('shared.shared_mod.k0'),
  nameKey: 'shared.shared_mod.k0',
  icon: 'Share2',
  path: SHARED_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 25,
  description: i18n.t('shared.shared_mod.k1'),
  permission: 'shared:dashboard:read',
  routes: [],
};
