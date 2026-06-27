import { lazy } from 'react';
import type { RouteConfig } from './utils';

const EhsAccidentPage = lazy(() => import('../pages/ehs/EhsAccidentPage'));
const DocumentsPage = lazy(() => import('../pages/docs/DocumentsPage'));

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
];
