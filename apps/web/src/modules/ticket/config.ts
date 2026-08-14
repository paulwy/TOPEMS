import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

export const TICKET_PATHS = {
  root: '/ticket',
  dashboard: '/ticket/dashboard',
  center: '/ticket/center',
} as const;

export const ticketModuleConfig: RouteModuleConfig = {
  code: 'ticket',
  name: i18n.t('shared.config.k0'),
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 6,
  description: i18n.t('shared.config.k1'),
  permission: 'system:center:read',
  routes: [
    {
      path: TICKET_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/ticket/DashboardPage'), 'DashboardPage'),
      module: 'ticket',
      title: i18n.t('shared.config.k2'),
      code: 'ticket-dashboard',
      requiredPermissions: ['ticket:dashboard:read'],
      action: 'read',
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: TICKET_PATHS.center,
      element: lazyWithRetry(() => import('@/pages/ticket/TicketCenterPage'), 'TicketCenterPage'),
      module: 'ticket',
      code: 'ticket-center',
      title: i18n.t('shared.config.k3'),
      template: 'list',
      group: 'business',
      requiredPermissions: ['system:center:read'],
      action: 'read',
    },
  ],
};

export const ticketNavConfig: ModuleNavConfig = {
  code: 'ticket',
  name: i18n.t('shared.config.k4'),
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  permission: 'system:center:read',
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 6,
  description: i18n.t('shared.config.k5'),
  navItems: [
    {
      code: 'ticket-dashboard',
      label: i18n.t('shared.config.k6'),
      icon: 'LayoutDashboard',
      path: TICKET_PATHS.dashboard,
      permission: 'ticket:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('shared.config.k7'),
    },
    {
      code: 'ticket-center',
      label: i18n.t('shared.config.k8'),
      icon: 'Ticket',
      path: TICKET_PATHS.center,
      permission: 'system:center:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('shared.config.k9'),
    },
  ],
};
