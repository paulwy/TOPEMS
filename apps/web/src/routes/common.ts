import { lazy } from 'react';
import { createSafeLazy, type RouteConfig } from './utils';

const safeLazy = createSafeLazy();

const EhsAccidentPage = safeLazy(() => import('../pages/ehs/EhsAccidentPage'));
const DocumentsPage = safeLazy(() => import('../pages/doc/DocumentsPage'));
const V4DemoPage = safeLazy(() => import('../pages/shared/V4DemoPage'));

export const commonRoutes: RouteConfig[] = [
  {
    path: '/ehs/accidents',
    element: EhsAccidentPage,
    requiredPermissions: ['ehs:read'],
    module: 'ehs',
    action: 'read',
  },
  {
    path: '/common/documents',
    element: DocumentsPage,
    requiredPermissions: ['doc:read'],
    module: 'doc',
    action: 'read',
  },
  {
    path: '/v4-demo',
    element: V4DemoPage,
    requiredPermissions: [],
    module: 'common',
    action: 'read',
  },
];
