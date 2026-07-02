import { lazyWithRetry } from './types';
import type { RouteModuleConfig } from './types';

export const oaModuleConfig: RouteModuleConfig = {
  code: 'oa',
  name: '行政办公',
  icon: 'Briefcase',
  path: '/oa',
  source: 'plugin',
  suite: 'enterprise',
  status: 'online',
  order: 15,
  description: '公告管理、会议管理、办公用品、费用报销',
  permission: 'oa:read',
  routes: [
    {
      path: '/oa/dashboard',
      element: lazyWithRetry(
        () => import('../../pages/oa/AdministrationDashboardPage'),
        'AdministrationDashboardPage'
      ),
      module: 'oa',
      title: '办公仪表盘',
      code: 'oa-dashboard',
      requiredPermissions: ['oa:read'],
      template: 'dashboard',
      group: 'overview',
    },
    {
      path: '/oa/announcement',
      element: lazyWithRetry(
        () => import('../../pages/oa/AnnouncementManagementPage'),
        'AnnouncementManagementPage'
      ),
      module: 'oa',
      title: '公告管理',
      code: 'oa-announcement',
      requiredPermissions: ['oa:announcement:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/oa/addressbook',
      element: lazyWithRetry(() => import('../../pages/oa/AddressbookPage'), 'AddressbookPage'),
      module: 'oa',
      title: '通讯录',
      code: 'oa-addressbook',
      requiredPermissions: ['oa:addressbook:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/oa/meeting-room',
      element: lazyWithRetry(
        () => import('../../pages/oa/MeetingRoomManagementPage'),
        'MeetingRoomManagementPage'
      ),
      module: 'oa',
      title: '会议室管理',
      code: 'oa-meeting-room',
      requiredPermissions: ['oa:meeting-room:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/oa/office-supplies',
      element: lazyWithRetry(
        () => import('../../pages/oa/OfficeSuppliesPage'),
        'OfficeSuppliesPage'
      ),
      module: 'oa',
      title: '办公用品',
      code: 'oa-office-supplies',
      requiredPermissions: ['oa:office-supplies:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/oa/vehicle',
      element: lazyWithRetry(
        () => import('../../pages/oa/VehicleManagementPage'),
        'VehicleManagementPage'
      ),
      module: 'oa',
      title: '车辆管理',
      code: 'oa-vehicle',
      requiredPermissions: ['oa:vehicle:read'],
      template: 'list',
      group: 'business',
    },
    {
      path: '/oa/expense-claim',
      element: lazyWithRetry(() => import('../../pages/oa/ExpenseClaimPage'), 'ExpenseClaimPage'),
      module: 'oa',
      title: '费用报销',
      code: 'oa-expense-claim',
      requiredPermissions: ['oa:expense:read'],
      template: 'list',
      group: 'process',
    },
    {
      path: '/oa/budget',
      element: lazyWithRetry(
        () => import('../../pages/oa/BudgetManagementPage'),
        'BudgetManagementPage'
      ),
      module: 'oa',
      title: '预算管理',
      code: 'oa-budget',
      requiredPermissions: ['oa:budget:read'],
      template: 'list',
      group: 'analytics',
    },
  ],
};
