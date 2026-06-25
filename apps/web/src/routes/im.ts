import React from 'react';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const Impage = lazy(() => import('../pages/shared/Impage'));
const MailPage = lazy(() => import('../pages/common/MailPage'));

export const imRoutes: RouteConfig[] = [
  {
    path: '/im',
    element: Impage,
    requiredPermissions: ['im:read'],
    module: 'im',
    action: 'read',
  },
  {
    path: '/mail',
    element: MailPage,
    requiredPermissions: ['mail:read'],
    module: 'im',
    action: 'read',
  },
];
