import { lazy } from 'react';
import { createSafeLazy, type RouteConfig } from './utils';
import { EHS_PATHS } from '@/modules/ehs/config';
import { DOC_PATHS } from '@/modules/doc/config';

export const COMMON_PATHS = {
  v4Demo: '/v4-demo',
} as const;

const safeLazy = createSafeLazy();

const EhsAccidentPage = safeLazy(() => import('../pages/ehs/EhsAccidentPage'));
const DocumentsPage = safeLazy(() => import('../pages/doc/DocumentsPage'));
const V4DemoPage = safeLazy(() => import('../pages/shared/V4DemoPage'));

export const commonRoutes: RouteConfig[] = [
  {
    path: EHS_PATHS.accident,
    element: EhsAccidentPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: DOC_PATHS.documents,
    element: DocumentsPage,
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: COMMON_PATHS.v4Demo,
    element: V4DemoPage,
    requiredPermissions: [],
    module: 'common',
    action: 'read',
  },
];
