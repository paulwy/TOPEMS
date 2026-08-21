export interface RouteConfig {
  id: string;
  path: string;
  name: string;
  icon?: string;
}

export const routes: RouteConfig[] = [
  { id: 'dashboard', path: '/dashboard', name: '仪表盘', icon: 'LayoutDashboard' },
  { id: 'hr', path: '/hr', name: '人力资源', icon: 'Users' },
  { id: 'crm', path: '/crm', name: '客户管理', icon: 'UserCircle' },
  { id: 'erp', path: '/erp', name: '企业资源', icon: 'Briefcase' },
  { id: 'reports', path: '/reports', name: '报表分析', icon: 'BarChart3' },
  { id: 'audit', path: '/audit', name: '审计日志', icon: 'ShieldCheck' },
  { id: 'settings', path: '/settings', name: '系统设置', icon: 'Settings' },
];

export default routes;