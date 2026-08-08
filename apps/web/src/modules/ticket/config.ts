import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

export const TICKET_PATHS = {
  root: '/ticket',
  dashboard: '/ticket/dashboard',
  center: '/ticket/center',
} as const;

export const ticketModuleConfig: RouteModuleConfig = {
  code: 'ticket',
  name: '工单中心',
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 6,
  description: '统一管理对账差异、审批超时、系统告警等工单',
  permission: 'system:center:read',
  routes: [
    {
      path: TICKET_PATHS.dashboard,
      element: lazyWithRetry(() => import('@/pages/ticket/DashboardPage'), 'DashboardPage'),
      module: 'ticket',
      title: '工单中心概览',
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
      title: '工单中心',
      template: 'list',
      group: 'business',
      requiredPermissions: ['system:center:read'],
      action: 'read',
    },
  ],
};

export const ticketNavConfig: ModuleNavConfig = {
  code: 'ticket',
  name: '工单中心',
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  permission: 'system:center:read',
  source: 'core',
  suite: 'collaboration',
  status: 'online',
  order: 6,
  description: '统一管理对账差异、审批超时、系统告警等工单',
  navItems: [
    {
      code: 'ticket-dashboard',
      label: '工单中心概览',
      icon: 'LayoutDashboard',
      path: TICKET_PATHS.dashboard,
      permission: 'ticket:dashboard:read',
      order: 0,
      group: 'overview',
      showInTabs: true,
      description: '工单中心数据概览',
    },
    {
      code: 'ticket-center',
      label: '工单中心',
      icon: 'Ticket',
      path: TICKET_PATHS.center,
      permission: 'system:center:read',
      order: 1,
      group: 'business',
      showInTabs: true,
      description: '工单列表与管理',
    },
  ],
};
