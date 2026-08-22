import type { NavItemConfig } from '@topems/app-shell';

export type RouteConfig = NavItemConfig;

export const routes: RouteConfig[] = [
  { code: 'dashboard', path: '/dashboard', label: 'Dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard', group: 'overview', permission: 'system:dashboard:read', showInSidebar: true },
  { code: 'hr', path: '/hr', label: 'Human Resources', labelKey: 'nav.hr', icon: 'Users', group: 'master', permission: 'hrm:read', showInSidebar: true },
  { code: 'crm', path: '/crm', label: 'Customer Management', labelKey: 'nav.crm', icon: 'UserCircle', group: 'business', permission: 'crm:dashboard:read', showInSidebar: true },
  { code: 'erp', path: '/erp', label: 'Enterprise Resources', labelKey: 'nav.erp', icon: 'Briefcase', group: 'business', permission: 'erp:dashboard:read', showInSidebar: true },
  { code: 'reports', path: '/reports', label: 'Reports & Analytics', labelKey: 'nav.reports', icon: 'BarChart3', group: 'analytics', permission: 'report:dashboard:read', showInSidebar: true },
  { code: 'audit', path: '/audit', label: 'Audit Log', labelKey: 'nav.audit', icon: 'ShieldCheck', group: 'setting', permission: 'admin:audit:read', showInSidebar: true },
  { code: 'settings', path: '/settings', label: 'System Settings', labelKey: 'nav.settings', icon: 'Settings', group: 'setting', permission: 'system:read', showInSidebar: true },
];

export default routes;
