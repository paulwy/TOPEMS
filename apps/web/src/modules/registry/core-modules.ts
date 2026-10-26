import type { ModuleConfig } from './index';
import i18n from '@/i18n';

export const CORE_MODULES_CONFIG: ModuleConfig[] = [
  {
    id: 'topems_core',
    name: i18n.t('shared.core-modules.k0'),
    description: i18n.t('shared.core-modules.k0'),
    category: 'core',
    version: '1.0.0',
    entry: 'topems_core',
    icon: 'Settings',
    isDefault: true,
    permissions: ['core:view'],
    routes: [
      {
        path: '/core/users',
        name: i18n.t('shared.core-modules.k1'),
        component: () => import('@/pages/iam/UserManagementPage'),
        componentPath: './pages/UserManagement',
        icon: 'Users',
        permissions: ['core:user:view'],
      },
      {
        path: '/core/roles',
        name: i18n.t('shared.core-modules.k2'),
        component: () => import('@/pages/iam/RoleManagementPage'),
        componentPath: './pages/RoleManagement',
        icon: 'Shield',
        permissions: ['core:role:view'],
      },
    ],
  },
  {
    id: 'topems_finance',
    name: i18n.t('shared.core-modules.k26'),
    description: i18n.t('shared.core-modules.k27'),
    category: 'business',
    version: '1.0.0',
    entry: 'topems_finance',
    icon: 'Landmark',
    isDefault: true,
    permissions: ['finance:dashboard:view'],
    routes: [
      {
        path: '/finance/accounts',
        name: i18n.t('shared.core-modules.k29'),
        component: () => import('@/pages/finance/FinanceLedgerPage'),
        componentPath: './pages/FinanceAccountPage',
        icon: 'BookOpen',
        permissions: ['finance:account:view'],
      },
    ],
  },
  {
    id: 'topems_mes',
    name: i18n.t('shared.core-modules.k53'),
    description: i18n.t('shared.core-modules.k54'),
    category: 'business',
    version: '1.0.0',
    entry: 'topems_mes',
    icon: 'Factory',
    isDefault: true,
    permissions: ['mes:view'],
    routes: [
      {
        path: '/mes/workstations',
        name: i18n.t('shared.core-modules.k58'),
        component: () => import('@/pages/mes/WorkStationPage'),
        componentPath: './pages/WorkStationPage',
        icon: 'Monitor',
        permissions: ['mes:workstation:view'],
      },
    ],
  },
];
