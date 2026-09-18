import { lazyWithRetry } from '@/routes/utils';
import type { RouteConfigV2, RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';
import i18n from '@/i18n';

const TICKET_PATHS = {
  root: '/ticket',
  dashboard: '/ticket/dashboard',
  center: '/ticket/center',
} as const;

export interface DashboardPageProps {}

interface TicketCenterPageProps {
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

const dashboardRoute: RouteConfigV2<DashboardPageProps> = {
  path: TICKET_PATHS.dashboard,
  element: lazyWithRetry(() => import('@/pages/ticket/DashboardPage'), 'DashboardPage'),
  module: 'ticket',
  title: i18n.t('ticket.nav.ticket-dashboard'),
  titleKey: 'ticket.nav.ticket-dashboard',
  code: 'ticket-dashboard',
  requiredPermissions: ['ticket:dashboard:read'],
  action: 'read',
  template: 'dashboard',
  group: 'overview',
};

const ticketCenterRoute: RouteConfigV2<TicketCenterPageProps> = {
  path: TICKET_PATHS.center,
  element: lazyWithRetry(() => import('@/pages/ticket/TicketCenterPage'), 'TicketCenterPage'),
  module: 'ticket',
  code: 'ticket-center',
  title: i18n.t('ticket.nav.ticket-center'),
  titleKey: 'ticket.nav.ticket-center',
  template: 'list',
  group: 'business',
  requiredPermissions: ['system:center:read'],
  action: 'read',
};

export const ticketModuleConfig: RouteModuleConfig = {
  code: 'ticket',
  name: i18n.t('shared.config.ticket_name'),
  nameKey: 'shared.config.ticket_name',
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 6,
  description: i18n.t('ticket.nav.module_name_desc'),
  permission: 'system:center:read',
  routes: [dashboardRoute, ticketCenterRoute],
};

export const ticketNavConfig: ModuleNavConfig = {
  code: 'ticket',
  name: i18n.t('ticket.nav.module_name'),
  nameKey: 'ticket.nav.module_name',
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  permission: 'system:center:read',
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 6,
  description: i18n.t('ticket.nav.module_name_desc'),
  navItems: [
    {
      code: 'ticket-dashboard',
      label: i18n.t('ticket.nav.ticket-dashboard'),
      labelKey: 'ticket.nav.ticket-dashboard',
      icon: 'LayoutDashboard',
      path: TICKET_PATHS.dashboard,
      permission: 'ticket:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: i18n.t('ticket.nav.ticket-dashboard_desc'),
    },
    {
      code: 'ticket-center',
      label: i18n.t('ticket.nav.ticket-center'),
      labelKey: 'ticket.nav.ticket-center',
      icon: 'Ticket',
      path: TICKET_PATHS.center,
      permission: 'system:center:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: i18n.t('ticket.nav.ticket-center_desc'),
    },
  ],
};
