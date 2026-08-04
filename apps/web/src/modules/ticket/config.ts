import { lazyWithRetry } from '@/routes/utils';
import type { RouteModuleConfig } from '@/routes/v2/types';
import type { ModuleNavConfig } from '@/lib/navigation/types';

export const TICKET_PATHS = {
  root: '/ticket',
  center: '/ticket/center',
} as const;

export const ticketModuleConfig: RouteModuleConfig = {
  code: 'ticket',
  name: '工单中心',
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  source: 'core',
  status: 'online',
  order: 6,
  description: '统一管理对账差异、审批超时、系统告警等工单',
  permission: 'system:read',
  routes: [
    {
      path: TICKET_PATHS.center,
      element: lazyWithRetry(() => import('@/pages/ticket/TicketCenterPage'), 'TicketCenterPage'),
      module: 'ticket',
      code: 'ticket-center',
      title: '工单中心',
      template: 'list',
      group: 'tasks',
      requiredPermissions: ['system:read'],
      action: 'read',
    },
  ],
};

export const ticketNavConfig: ModuleNavConfig = {
  code: 'ticket',
  name: '工单中心',
  icon: 'Ticket',
  path: TICKET_PATHS.root,
  permission: 'system:read',
  source: 'core',
  status: 'online',
  order: 6,
  description: '统一管理对账差异、审批超时、系统告警等工单',
  navItems: [
    {
      code: 'ticket-center',
      label: '工单中心',
      icon: 'Ticket',
      path: TICKET_PATHS.center,
      permission: 'system:read',
      order: 0,
      group: 'tasks',
      showInTabs: true,
      description: '工单列表与管理',
    },
  ],
};
