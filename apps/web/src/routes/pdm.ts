import React from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteConfig } from './utils';
import { lazyWithRetry } from './utils';

const lazy = lazyWithRetry;

const PdmStatsPage = lazy(() => import('../pages/pdm/PdmStatsPage'));
const PdmFormulaPage = lazy(() => import('../pages/pdm/PdmFormulaPage'));
const PdmProcessPage = lazy(() => import('../pages/pdm/PdmProcessPage'));
const PdmBatchPage = lazy(() => import('../pages/pdm/PdmBatchPage'));
const PdmStepPage = lazy(() => import('../pages/pdm/PdmStepPage'));
const PdmBomPage = lazy(() => import('../pages/pdm/PdmBomPage'));
const BomPage = lazy(() => import('../pages/pdm/BomPage'));
const PdmVersionPage = lazy(() => import('../pages/pdm/PdmVersionPage'));
const PdmProjectPage = lazy(() => import('../pages/pdm/PdmProjectPage'));
const DocumentPage = lazy(() => import('../pages/pdm/DocumentPage'));
const PdmProductConfigPage = lazy(() => import('../pages/pdm/PdmProductConfigPage'));
const ProductPage = lazy(() => import('../pages/pdm/ProductPage'));
const MaterialPage = lazy(() => import('../pages/pdm/MaterialPage'));
const ChangePage = lazy(() => import('../pages/pdm/ChangePage'));

export const pdmRoutes: RouteConfig[] = [
  {
    path: '/pdm',
    element: React.createElement(Navigate, {
      to: '/pdm/stats',
      replace: true,
    }),
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/stats',
    element: PdmStatsPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/formula',
    element: PdmFormulaPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/process',
    element: PdmProcessPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/batch',
    element: PdmBatchPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/step',
    element: PdmStepPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/bom',
    element: PdmBomPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/bom-management',
    element: BomPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/version',
    element: PdmVersionPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/projects',
    element: PdmProjectPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/documents',
    element: DocumentPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/product-config',
    element: PdmProductConfigPage,
    requiredPermissions: ['pdm:admin'],
    module: 'pdm',
    action: 'admin',
  },
  {
    path: '/pdm/products',
    element: ProductPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/materials',
    element: MaterialPage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
  {
    path: '/pdm/changes',
    element: ChangePage,
    requiredPermissions: ['pdm:read'],
    module: 'pdm',
    action: 'read',
  },
];
