export type NavGroup =
  | 'overview'
  | 'business'
  | 'process'
  | 'analytics'
  | 'settings'
  | 'chat'
  | 'tools'
  | 'knowledge'
  | 'templates'
  | 'documents'
  | 'connections'
  | 'mappings'
  | 'logs'
  | 'scenarios'
  | 'home'
  | 'attendance'
  | 'tasks'
  | 'alerts'
  | 'metrics'
  | 'messages'
  | 'design'
  | 'runtime';

export type ModuleSource = 'core' | 'plugin';
export type ModuleSuite =
  | 'finance'
  | 'hr'
  | 'manufacturing'
  | 'supply'
  | 'crm'
  | 'enterprise'
  | 'quality'
  | 'project'
  | 'gis'
  | 'erp';
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
  crossModuleRef?: boolean;
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
  chat: { label: '对话', icon: 'MessageSquare', order: 5 },
  tools: { label: '工具', icon: 'Wrench', order: 15 },
  knowledge: { label: '知识库', icon: 'BookOpen', order: 25 },
  templates: { label: '模板', icon: 'LayoutTemplate', order: 35 },
  documents: { label: '文档', icon: 'FileText', order: 15 },
  connections: { label: '连接', icon: 'Link', order: 5 },
  mappings: { label: '映射', icon: 'ArrowsLeftRight', order: 10 },
  logs: { label: '日志', icon: 'FileText', order: 15 },
  scenarios: { label: '场景', icon: 'Zap', order: 20 },
  home: { label: '首页', icon: 'Home', order: 0 },
  attendance: { label: '考勤', icon: 'Calendar', order: 10 },
  tasks: { label: '任务', icon: 'CheckSquare', order: 20 },
  alerts: { label: '告警', icon: 'AlertTriangle', order: 5 },
  metrics: { label: '指标', icon: 'Activity', order: 10 },
  messages: { label: '消息', icon: 'Bell', order: 5 },
  design: { label: '设计', icon: 'Palette', order: 5 },
  runtime: { label: '运行', icon: 'Play', order: 10 },
};

export const SUITE_GROUPS: Record<ModuleSuite | 'other' | 'platform', { label: string; icon: string; order: number }> = {
  platform: { label: '平台中心', icon: 'LayoutDashboard', order: 0 },
  finance: { label: '财务领域', icon: 'Wallet', order: 10 },
  hr: { label: '人力领域', icon: 'Users', order: 20 },
  manufacturing: { label: '制造领域', icon: 'Factory', order: 30 },
  supply: { label: '供应链领域', icon: 'Truck', order: 40 },
  crm: { label: '客户领域', icon: 'Users', order: 50 },
  quality: { label: '质量领域', icon: 'ShieldCheck', order: 60 },
  project: { label: '项目领域', icon: 'Briefcase', order: 70 },
  gis: { label: '地理信息', icon: 'Map', order: 80 },
  enterprise: { label: '企业管理', icon: 'Building2', order: 90 },
  erp: { label: '资源计划', icon: 'Grid3X3', order: 100 },
  other: { label: '其他应用', icon: 'MoreHorizontal', order: 999 },
};
