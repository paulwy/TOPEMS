import React, { lazy } from 'react';
import type { RouteConfig } from './utils';

const AIPage = lazy(() => import('../pages/AIPage'));

export const aiRoutes: RouteConfig[] = [
  {
    path: '/ai',
    element: React.createElement(AIPage),
    requiredPermissions: ['ai:read'],
    module: 'ai',
    action: 'read',
  },
];
