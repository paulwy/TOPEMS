import { lazy } from 'react';
import type { RouteConfig } from './utils';

const EhsAccidentPage = lazy(() => import('../pages/ehs/EhsAccidentPage'));
const DocumentsPage = lazy(() => import('../pages/docs/DocumentsPage'));
const V4DemoPage = lazy(() => import('../pages/shared/V4DemoPage'));

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
