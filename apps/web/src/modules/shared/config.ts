import type { RouteModuleConfig } from '@/routes/v2/types';

export const SHARED_PATHS = {
  root: '/shared',
  dashboard: '/shared/dashboard',
} as const;

export const sharedModuleConfig: RouteModuleConfig = {
  code: 'shared',
  name: 'Shared',
  icon: 'Share2',
  path: SHARED_PATHS.root,
  source: 'core',
  suite: 'enterprise',
  status: 'online',
  order: 25,
  description: 'Cross-module shared state and utilities',
  permission: 'shared:dashboard:read',
  routes: [],
};
