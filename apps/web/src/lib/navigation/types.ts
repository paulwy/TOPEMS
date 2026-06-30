export type NavGroup = 'overview' | 'business' | 'process' | 'analytics' | 'settings';

export type ModuleSource = 'core' | 'plugin';
export type ModuleSuite =
  | 'finance'
  | 'hr'
  | 'manufacturing'
  | 'supply'
  | 'crm'
  | 'quality'
  | 'project'
  | 'gis';
export type ModuleStatus = 'online' | 'beta' | 'plan' | 'new';

export interface NavItemConfig {
  code: string;
  label: string;
  icon?: string;
  path: string;
  permission?: string;
  order?: number;
  group?: NavGroup;
  children?: NavItemConfig[];
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
  description?: string;
  showInSidebar?: boolean;
  showInBreadcrumb?: boolean;
  showInTabs?: boolean;
}

export interface ModuleNavConfig {
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  source: ModuleSource;
  suite?: ModuleSuite;
  status?: ModuleStatus;
  order?: number;
  description?: string;
  navItems: NavItemConfig[];
}

export interface NavItem extends NavItemConfig {
  moduleCode?: string;
  moduleName?: string;
}

export interface ModuleCardConfig {
  code: string;
  name: string;
  icon: string;
  path: string;
  permission?: string;
  status?: ModuleStatus;
  source: ModuleSource;
  suite?: ModuleSuite;
  order?: number;
  description?: string;
}

export const NAV_GROUPS: Record<NavGroup, { label: string; icon: string; order: number }> = {
  overview: { label: '概览', icon: 'LayoutDashboard', order: 0 },
  business: { label: '业务管理', icon: 'Briefcase', order: 10 },
  process: { label: '流程管理', icon: 'Workflow', order: 20 },
  analytics: { label: '分析报表', icon: 'BarChart3', order: 30 },
  settings: { label: '基础设置', icon: 'Settings', order: 40 },
};
