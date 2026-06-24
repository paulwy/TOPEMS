/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Use `NavigationRegistry` from `@/lib/NavigationRegistry` instead.
 *
 * Migration guide:
 * - Static navigation items: Use `navigationRegistry.register()` instead
 * - `topNavItems`: Use `navigationRegistry.getTopNavItems()` instead
 * - `coreNavigation`: Register as separate plugin nav config
 * - `suiteNavigation`: Register as separate plugin nav config
 * - `adminNavigation`: Register as separate plugin nav config
 * - `getNavigationForPlugin`: Use `navigationRegistry.getSidebarNavItems()` instead
 *
 * See: docs/guides/ui/ui-navigation-design.md for more details.
 */

import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  Factory,
  Layers,
  Shield,
  FlaskConical,
  Leaf,
  FlaskRound,
  BarChart3,
  FileText,
  Activity,
  Map,
  Network,
  Smartphone,
  Package,
  Warehouse,
  Truck,
  Handshake,
  ShoppingCart,
  Settings,
  Wrench,
  Plus,
  Grid3X3,
  AlertTriangle,
  AlertCircle,
  Database,
  Link,
  GitBranch,
  BookOpen,
  Mail,
  Navigation,
  Lock,
  Award,
  Bell,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  title: string;
  path?: string;
  icon?: typeof LayoutDashboard;
  badge?: number | string;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error';
  children?: NavigationItem[];
  pluginCode?: string;
  suiteCode?: string;
  permissions?: string[];
  isGroup?: boolean;
}

export interface NavigationGroup {
  id: string;
  title: string;
  items: NavigationItem[];
  suiteCode?: string;
}

export const pluginNavigation: Record<string, NavigationItem[]> = {
  erp: [
    {
      id: 'erp-dashboard',
      title: 'ERP 首页',
      path: '/erp/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'erp-finance',
      title: '财务管理',
      icon: Building2,
      children: [
        {
          id: 'erp-finance-voucher',
          title: '凭证管理',
          path: '/erp/finance/voucher',
        },
        {
          id: 'erp-finance-invoice',
          title: '发票管理',
          path: '/erp/finance/invoice',
        },
        {
          id: 'erp-finance-budget',
          title: '预算管理',
          path: '/erp/finance/budget',
        },
        {
          id: 'erp-finance-reports',
          title: '财务报表',
          path: '/erp/finance/reports',
        },
      ],
    },
    {
      id: 'erp-purchase',
      title: '采购管理',
      icon: ShoppingCart,
      children: [
        {
          id: 'erp-purchase-order',
          title: '采购订单',
          path: '/erp/purchase/order',
        },
        {
          id: 'erp-purchase-receipt',
          title: '采购收货',
          path: '/erp/purchase/receipt',
        },
      ],
    },
    {
      id: 'erp-sales',
      title: '销售管理',
      icon: Truck,
      children: [
        { id: 'erp-sales-order', title: '销售订单', path: '/erp/sales/order' },
        {
          id: 'erp-sales-delivery',
          title: '销售发货',
          path: '/erp/sales/delivery',
        },
      ],
    },
  ],
  hrm: [
    {
      id: 'hrm-dashboard',
      title: 'HRM 首页',
      path: '/hrm/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'hrm-employee',
      title: '员工管理',
      icon: Users,
      children: [
        { id: 'hrm-employee-list', title: '员工列表', path: '/hrm/employee' },
        {
          id: 'hrm-employee-create',
          title: '新增员工',
          path: '/hrm/employee/create',
        },
        { id: 'hrm-department', title: '部门管理', path: '/hrm/department' },
      ],
    },
    {
      id: 'hrm-attendance',
      title: '考勤管理',
      icon: Activity,
      children: [
        {
          id: 'hrm-attendance-record',
          title: '考勤记录',
          path: '/hrm/attendance',
        },
        { id: 'hrm-leave', title: '请假管理', path: '/hrm/leave' },
      ],
    },
    {
      id: 'hrm-payroll',
      title: '薪酬管理',
      icon: FileText,
      path: '/hrm/payroll',
    },
    {
      id: 'hrm-performance',
      title: '绩效管理',
      icon: Target,
      path: '/hrm/performance',
    },
    {
      id: 'hrm-recruitment',
      title: '招聘管理',
      icon: Plus,
      path: '/hrm/recruitment',
    },
  ],
  crm: [
    {
      id: 'crm-dashboard',
      title: 'CRM 首页',
      path: '/crm/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'crm-customer',
      title: '客户管理',
      icon: Users,
      children: [
        { id: 'crm-customer-list', title: '客户列表', path: '/crm/customer' },
        { id: 'crm-contact', title: '联系人', path: '/crm/contact' },
      ],
    },
    {
      id: 'crm-opportunity',
      title: '商机管理',
      icon: Target,
      path: '/crm/opportunity',
    },
    {
      id: 'crm-interaction',
      title: '互动管理',
      icon: Activity,
      path: '/crm/interaction',
    },
  ],
  pm: [
    {
      id: 'pm-dashboard',
      title: '项目管理',
      path: '/pm/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'pm-project',
      title: '项目列表',
      icon: Grid3X3,
      path: '/pm/project',
    },
    {
      id: 'pm-contract',
      title: '合同管理',
      icon: FileText,
      path: '/pm/contract',
    },
    {
      id: 'pm-report',
      title: '项目报表',
      icon: BarChart3,
      path: '/pm/report',
    },
  ],
  mes: [
    {
      id: 'mes-dashboard',
      title: 'MES 首页',
      path: '/mes/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'mes-production',
      title: '生产管理',
      icon: Factory,
      children: [
        { id: 'mes-order', title: '生产工单', path: '/mes/production/order' },
        {
          id: 'mes-process',
          title: '生产工艺',
          path: '/mes/production/process',
        },
        { id: 'mes-record', title: '生产记录', path: '/mes/production/record' },
      ],
    },
    {
      id: 'mes-workstation',
      title: '工位管理',
      icon: Wrench,
      path: '/mes/workstation',
    },
    {
      id: 'mes-mobile',
      title: '移动端',
      icon: Smartphone,
      path: '/mes/mobile',
    },
  ],
  pdm: [
    {
      id: 'pdm-stats',
      title: '产品数据',
      path: '/pdm/stats',
      icon: LayoutDashboard,
    },
    {
      id: 'pdm-formula',
      title: '配方管理',
      icon: FlaskConical,
      path: '/pdm/formula',
    },
    {
      id: 'pdm-process',
      title: '工艺管理',
      icon: Layers,
      path: '/pdm/process',
    },
    {
      id: 'pdm-batch',
      title: '批次管理',
      icon: Package,
      path: '/pdm/batch',
    },
    {
      id: 'pdm-bom',
      title: '物料清单',
      icon: Package,
      path: '/pdm/bom',
    },
    {
      id: 'pdm-version',
      title: '版本管理',
      icon: GitBranch,
      path: '/pdm/version',
    },
    {
      id: 'pdm-product-config',
      title: '产品配置',
      icon: Settings,
      path: '/pdm/product-config',
    },
  ],
  qms: [
    {
      id: 'qms-inspection',
      title: '质量检验',
      path: '/qms/inspection',
      icon: Shield,
    },
    {
      id: 'qms-nonconformance',
      title: '不合格品',
      path: '/qms/nonconformance',
      icon: Activity,
    },
    {
      id: 'qms-audit',
      title: '审核管理',
      path: '/qms/audit',
      icon: FileText,
    },
    {
      id: 'qms-standard',
      title: '质量标准',
      path: '/qms/standard',
      icon: Target,
    },
  ],
  lims: [
    {
      id: 'lims-sample',
      title: '样品管理',
      path: '/lims/sample',
      icon: FlaskConical,
    },
    {
      id: 'lims-task',
      title: '检验任务',
      path: '/lims/task',
      icon: Activity,
    },
    {
      id: 'lims-instrument',
      title: '仪器管理',
      path: '/lims/instrument',
      icon: Wrench,
    },
  ],
  ehs: [
    {
      id: 'ehs-hazard',
      title: '危险源',
      path: '/ehs/hazard',
      icon: AlertTriangle,
    },
    {
      id: 'ehs-check',
      title: '安全检查',
      path: '/ehs/check',
      icon: Shield,
    },
    {
      id: 'ehs-accident',
      title: '事故管理',
      path: '/ehs/accident',
      icon: AlertCircle,
    },
    {
      id: 'ehs-plan',
      title: '应急预案',
      path: '/ehs/plan',
      icon: FileText,
    },
  ],
  rs: [
    {
      id: 'rs-dashboard',
      title: '研发首页',
      path: '/rs/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'rs-experiment',
      title: '实验管理',
      icon: FlaskRound,
      path: '/rs/experiment',
    },
    {
      id: 'rs-formula',
      title: '配方管理',
      icon: FlaskConical,
      path: '/rs/formula',
    },
    {
      id: 'rs-project',
      title: '项目管理',
      icon: Target,
      path: '/rs/project',
    },
  ],
  scm: [
    {
      id: 'scm-dashboard',
      title: '供应链',
      path: '/scm/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'scm-purchase',
      title: '采购管理',
      icon: ShoppingCart,
      path: '/scm/purchase',
    },
    {
      id: 'scm-sales',
      title: '销售管理',
      icon: Truck,
      path: '/scm/sales',
    },
  ],
  wms: [
    {
      id: 'wms-inventory',
      title: '库存管理',
      path: '/wms/inventory',
      icon: Warehouse,
    },
    {
      id: 'wms-inbound',
      title: '入库管理',
      icon: Package,
      path: '/wms/inbound',
    },
    {
      id: 'wms-outbound',
      title: '出库管理',
      icon: Truck,
      path: '/wms/outbound',
    },
  ],
  srm: [
    {
      id: 'srm-supplier',
      title: '供应商管理',
      path: '/srm/supplier',
      icon: Handshake,
    },
    {
      id: 'srm-evaluation',
      title: '供应商评估',
      icon: Award,
      path: '/srm/evaluation',
    },
    {
      id: 'srm-performance',
      title: '绩效报表',
      icon: BarChart3,
      path: '/srm/performance',
    },
    {
      id: 'srm-sourcing',
      title: '寻源管理',
      icon: Target,
      path: '/srm/sourcing',
    },
    {
      id: 'srm-contract',
      title: '合同管理',
      icon: FileText,
      path: '/srm/contract',
    },
  ],
  bi: [
    {
      id: 'bi-dashboard',
      title: 'BI 首页',
      path: '/bi/dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'bi-analytics',
      title: '数据分析',
      icon: BarChart3,
      path: '/bi/analytics',
    },
    {
      id: 'bi-datasource',
      title: '数据源',
      icon: Database,
      path: '/bi/datasource',
    },
  ],
  report: [
    {
      id: 'report-list',
      title: '报表中心',
      path: '/report/list',
      icon: FileText,
    },
    {
      id: 'report-design',
      title: '报表设计',
      path: '/report/design',
      icon: LayoutDashboard,
    },
    {
      id: 'report-schedule',
      title: '定时任务',
      path: '/report/schedules',
      icon: Activity,
    },
    {
      id: 'report-subscription',
      title: '订阅管理',
      path: '/report/subscriptions',
      icon: Mail,
    },
  ],
  monitor: [
    {
      id: 'monitor-dashboard',
      title: '监控首页',
      path: '/monitor',
      icon: Activity,
    },
    {
      id: 'monitor-metrics',
      title: '性能指标',
      path: '/monitor/metrics',
      icon: BarChart3,
    },
    {
      id: 'monitor-alerts',
      title: '告警通知',
      path: '/monitor/alerts',
      icon: AlertTriangle,
    },
  ],
  portal: [
    {
      id: 'portal-home',
      title: '企业门户',
      path: '/portal/home',
      icon: LayoutDashboard,
    },
  ],
  mobile: [
    {
      id: 'mobile-settings',
      title: '移动端设置',
      path: '/mobile',
      icon: Smartphone,
    },
    {
      id: 'mobile-offline-sync',
      title: '离线数据同步',
      path: '/mobile/offline-sync',
      icon: Database,
    },
    {
      id: 'mobile-scan',
      title: '扫码功能',
      path: '/mobile/scan',
      icon: Grid3X3,
    },
    {
      id: 'mobile-notifications',
      title: '通知推送',
      path: '/mobile/notifications',
      icon: Bell,
    },
  ],
  gis: [
    {
      id: 'gis-dashboard',
      title: 'GIS 首页',
      path: '/gis',
      icon: Map,
    },
    {
      id: 'gis-fence',
      title: '地理围栏',
      path: '/gis/fence',
      icon: Shield,
    },
    {
      id: 'gis-tracking',
      title: '轨迹追踪',
      path: '/gis/tracking',
      icon: Navigation,
    },
  ],
  integration: [
    {
      id: 'integration-dashboard',
      title: '集成管理',
      path: '/integration/dashboard',
      icon: Network,
    },
    {
      id: 'integration-connections',
      title: '外部连接',
      path: '/integration/connections',
      icon: Link,
    },
    {
      id: 'integration-mapping',
      title: '数据映射',
      path: '/integration/mapping',
      icon: GitBranch,
    },
  ],
};

export const coreNavigation: NavigationGroup[] = [
  {
    id: 'core-dashboard',
    title: '工作台',
    items: [
      {
        id: 'dashboard',
        title: '总览',
        path: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        id: 'document-center',
        title: '文档中心',
        path: '/documents',
        icon: FileText,
      },
      {
        id: 'knowledge-base',
        title: '知识库',
        path: '/knowledge',
        icon: BookOpen,
      },
      {
        id: 'help-center',
        title: '帮助中心',
        path: '/help',
        icon: BookOpen,
      },
      {
        id: 'mail',
        title: '邮件',
        path: '/mail',
        icon: Mail,
      },
    ],
  },
  {
    id: 'core-workflow',
    title: '工作流',
    items: [
      {
        id: 'flow-approval',
        title: '审批中心',
        path: '/flow/approval',
        icon: GitBranch,
      },
      {
        id: 'flow-design',
        title: '流程设计',
        path: '/flow/designer',
        icon: Settings,
      },
      {
        id: 'flow-template',
        title: '流程模板',
        path: '/flow/template',
        icon: FileText,
      },
    ],
  },
  {
    id: 'core-system',
    title: '系统管理',
    items: [
      {
        id: 'system-settings',
        title: '系统设置',
        path: '/admin/system',
        icon: Settings,
      },
      {
        id: 'user-management',
        title: '用户管理',
        path: '/admin/users',
        icon: Users,
      },
      {
        id: 'role-management',
        title: '角色管理',
        path: '/admin/roles',
        icon: Shield,
      },
      {
        id: 'permission-management',
        title: '权限管理',
        path: '/admin/permissions',
        icon: Lock,
      },
      {
        id: 'audit-log',
        title: '审计日志',
        path: '/admin/audit',
        icon: FileText,
      },
    ],
  },
];

export const suiteNavigation: Record<string, NavigationGroup> = {
  production: {
    id: 'suite-production',
    title: '生产套件',
    suiteCode: 'production',
    items: [
      {
        id: 'mes',
        title: '生产执行',
        path: '/mes/dashboard',
        icon: Factory,
        pluginCode: 'mes',
      },
      {
        id: 'pdm',
        title: '产品数据',
        path: '/pdm/stats',
        icon: Layers,
        pluginCode: 'pdm',
      },
    ],
  },
  quality: {
    id: 'suite-quality',
    title: '质量套件',
    suiteCode: 'quality',
    items: [
      {
        id: 'qms',
        title: '质量管理',
        path: '/qms/inspection',
        icon: Shield,
        pluginCode: 'qms',
      },
      {
        id: 'lims',
        title: '实验室',
        path: '/lims/sample',
        icon: FlaskConical,
        pluginCode: 'lims',
      },
      {
        id: 'ehs',
        title: '环境安全',
        path: '/ehs/hazard',
        icon: Leaf,
        pluginCode: 'ehs',
      },
    ],
  },
  rd: {
    id: 'suite-rd',
    title: '研发套件',
    suiteCode: 'rd',
    items: [
      {
        id: 'rs',
        title: '研发管理',
        path: '/rs/dashboard',
        icon: FlaskRound,
        pluginCode: 'rs',
      },
    ],
  },
  collab: {
    id: 'suite-collab',
    title: '协同套件',
    suiteCode: 'collab',
    items: [
      {
        id: 'hrm',
        title: '人力资源',
        path: '/hrm/dashboard',
        icon: Users,
        pluginCode: 'hrm',
      },
      {
        id: 'crm',
        title: '客户管理',
        path: '/crm/dashboard',
        icon: Users,
        pluginCode: 'crm',
      },
      {
        id: 'pm',
        title: '项目管理',
        path: '/pm/dashboard',
        icon: Target,
        pluginCode: 'pm',
      },
    ],
  },
  business: {
    id: 'suite-business',
    title: '经营套件',
    suiteCode: 'business',
    items: [
      {
        id: 'erp',
        title: 'ERP',
        path: '/erp/dashboard',
        icon: Building2,
        pluginCode: 'erp',
      },
    ],
  },
  supply: {
    id: 'suite-supply',
    title: '供应链套件',
    suiteCode: 'supply',
    items: [
      {
        id: 'scm',
        title: '供应链',
        path: '/scm/dashboard',
        icon: Truck,
        pluginCode: 'scm',
      },
      {
        id: 'wms',
        title: '仓储管理',
        path: '/wms/inventory',
        icon: Warehouse,
        pluginCode: 'wms',
      },
      {
        id: 'srm',
        title: '供应商',
        path: '/srm/supplier',
        icon: Handshake,
        pluginCode: 'srm',
      },
    ],
  },
  analytics: {
    id: 'suite-analytics',
    title: '分析套件',
    suiteCode: 'analytics',
    items: [
      {
        id: 'bi',
        title: '商业智能',
        path: '/bi/dashboard',
        icon: BarChart3,
        pluginCode: 'bi',
      },
      {
        id: 'report',
        title: '报表服务',
        path: '/report/list',
        icon: FileText,
        pluginCode: 'report',
      },
    ],
  },
  portal: {
    id: 'suite-portal',
    title: '门户套件',
    suiteCode: 'portal',
    items: [
      {
        id: 'portal',
        title: '企业门户',
        path: '/portal/home',
        icon: LayoutDashboard,
        pluginCode: 'portal',
      },
    ],
  },
  infrastructure: {
    id: 'suite-infrastructure',
    title: '基础设施',
    suiteCode: 'infrastructure',
    items: [
      {
        id: 'mobile',
        title: '移动端',
        path: '/mobile/settings',
        icon: Smartphone,
        pluginCode: 'mobile',
      },
      {
        id: 'gis',
        title: '地理信息',
        path: '/gis/dashboard',
        icon: Map,
        pluginCode: 'gis',
      },
      {
        id: 'integration',
        title: '数据交换',
        path: '/integration/dashboard',
        icon: Network,
        pluginCode: 'integration',
      },
    ],
  },
};

export const adminNavigation: NavigationGroup[] = [
  {
    id: 'admin-plugins',
    title: '插件管理',
    items: [
      {
        id: 'plugin-marketplace',
        title: '插件市场',
        path: '/plugin/marketplace',
        icon: Package,
      },
      {
        id: 'plugin-management',
        title: '已安装插件',
        path: '/admin/plugins',
        icon: Grid3X3,
      },
    ],
  },
];

export const getNavigationForPlugin = (pluginCode: string): NavigationItem[] => {
  return pluginNavigation[pluginCode] || [];
};

export const getNavigationForSuite = (suiteCode: string): NavigationGroup | null => {
  return suiteNavigation[suiteCode] || null;
};

export const getAllNavigation = (): NavigationGroup[] => {
  return [...coreNavigation, ...Object.values(suiteNavigation), ...adminNavigation];
};

export const moduleTabsConfig: {
  module: string;
  tabs: { label: string; path: string; closable?: boolean; pinned?: boolean }[];
}[] = [
  {
    module: 'dashboard',
    tabs: [{ label: '总览', path: '/dashboard', pinned: true }],
  },
  {
    module: 'erp',
    tabs: [
      { label: 'ERP 首页', path: '/erp/dashboard', pinned: true },
      { label: '凭证管理', path: '/erp/finance/voucher' },
      { label: '发票管理', path: '/erp/finance/invoice' },
      { label: '采购订单', path: '/erp/purchase/order' },
      { label: '销售订单', path: '/erp/sales/order' },
    ],
  },
  {
    module: 'hrm',
    tabs: [
      { label: 'HRM 首页', path: '/hrm/dashboard', pinned: true },
      { label: '员工列表', path: '/hrm/employee' },
      { label: '考勤记录', path: '/hrm/attendance' },
    ],
  },
  {
    module: 'crm',
    tabs: [
      { label: 'CRM 首页', path: '/crm/dashboard', pinned: true },
      { label: '客户列表', path: '/crm/customer' },
      { label: '商机管理', path: '/crm/opportunity' },
    ],
  },
  {
    module: 'pm',
    tabs: [
      { label: '项目管理', path: '/pm/dashboard', pinned: true },
      { label: '项目列表', path: '/pm/project' },
      { label: '合同管理', path: '/pm/contract' },
    ],
  },
  {
    module: 'mes',
    tabs: [
      { label: 'MES 首页', path: '/mes/dashboard', pinned: true },
      { label: '生产工单', path: '/mes/production/order' },
      { label: '工位管理', path: '/mes/workstation' },
    ],
  },
  {
    module: 'scm',
    tabs: [
      { label: '供应链', path: '/scm/dashboard', pinned: true },
      { label: '采购管理', path: '/scm/purchase' },
      { label: '销售管理', path: '/scm/sales' },
    ],
  },
  {
    module: 'wms',
    tabs: [
      { label: '库存管理', path: '/wms/inventory', pinned: true },
      { label: '入库管理', path: '/wms/inbound' },
      { label: '出库管理', path: '/wms/outbound' },
    ],
  },
  {
    module: 'srm',
    tabs: [
      { label: '供应商管理', path: '/srm/supplier', pinned: true },
      { label: '寻源管理', path: '/srm/sourcing' },
      { label: '合同管理', path: '/srm/contract' },
    ],
  },
  {
    module: 'qms',
    tabs: [
      { label: '质量检验', path: '/qms/inspection', pinned: true },
      { label: '不合格品', path: '/qms/nonconformance' },
      { label: '审核管理', path: '/qms/audit' },
    ],
  },
  {
    module: 'lims',
    tabs: [
      { label: '样品管理', path: '/lims/sample', pinned: true },
      { label: '检验任务', path: '/lims/task' },
      { label: '仪器管理', path: '/lims/instrument' },
    ],
  },
  {
    module: 'ehs',
    tabs: [
      { label: '危险源', path: '/ehs/hazard', pinned: true },
      { label: '安全检查', path: '/ehs/check' },
      { label: '事故管理', path: '/ehs/accident' },
    ],
  },
  {
    module: 'rs',
    tabs: [
      { label: '研发首页', path: '/rs/dashboard', pinned: true },
      { label: '实验管理', path: '/rs/experiment' },
      { label: '配方管理', path: '/rs/formula' },
    ],
  },
  {
    module: 'pdm',
    tabs: [
      { label: '产品数据', path: '/pdm/stats', pinned: true },
      { label: '配方管理', path: '/pdm/formula' },
      { label: '工艺管理', path: '/pdm/process' },
    ],
  },
  {
    module: 'bi',
    tabs: [
      { label: 'BI 首页', path: '/bi/dashboard', pinned: true },
      { label: '数据分析', path: '/bi/analytics' },
      { label: '数据源', path: '/bi/datasource' },
    ],
  },
  {
    module: 'report',
    tabs: [
      { label: '报表中心', path: '/report/list', pinned: true },
      { label: '报表设计', path: '/report/design' },
      { label: '定时任务', path: '/report/schedules' },
      { label: '订阅管理', path: '/report/subscriptions' },
    ],
  },
  {
    module: 'monitor',
    tabs: [
      { label: '监控首页', path: '/monitor/dashboard', pinned: true },
      { label: '告警管理', path: '/monitor/alerts' },
      { label: '性能监控', path: '/monitor/performance' },
    ],
  },
];

export const getModuleTabs = (
  module: string
): { label: string; path: string; closable?: boolean; pinned?: boolean }[] => {
  return moduleTabsConfig.find((c) => c.module === module)?.tabs || [];
};

export const getModuleFromPath = (path: string): string | null => {
  const modulePatterns: Record<string, string> = {
    '^/dashboard': 'dashboard',
    '^/erp': 'erp',
    '^/hrm': 'hrm',
    '^/crm': 'crm',
    '^/pm': 'pm',
    '^/mes': 'mes',
    '^/scm': 'scm',
    '^/wms': 'wms',
    '^/srm': 'srm',
    '^/qms': 'qms',
    '^/lims': 'lims',
    '^/ehs': 'ehs',
    '^/rs': 'rs',
    '^/pdm': 'pdm',
    '^/bi': 'bi',
    '^/report': 'report',
    '^/monitor': 'monitor',
    '^/portal': 'portal',
    '^/mobile': 'mobile',
    '^/gis': 'gis',
    '^/integration': 'integration',
  };

  for (const [pattern, module] of Object.entries(modulePatterns)) {
    if (new RegExp(pattern).test(path)) {
      return module;
    }
  }

  return null;
};

export const topNavItems: NavigationItem[] = [
  {
    id: 'dashboard',
    title: '总览',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'suite-production',
    title: '生产套件',
    icon: Factory,
    children: [
      { id: 'mes', title: '生产执行', path: '/mes/dashboard', icon: Factory },
      { id: 'pdm', title: '产品数据', path: '/pdm/stats', icon: Layers },
    ],
  },
  {
    id: 'suite-quality',
    title: '质量套件',
    icon: Shield,
    children: [
      { id: 'qms', title: '质量管理', path: '/qms/inspection', icon: Shield },
      { id: 'lims', title: '实验室', path: '/lims/sample', icon: FlaskConical },
      { id: 'ehs', title: '环境安全', path: '/ehs/hazard', icon: Leaf },
    ],
  },
  {
    id: 'suite-rd',
    title: '研发套件',
    icon: FlaskRound,
    children: [{ id: 'rs', title: '研发管理', path: '/rs/dashboard', icon: FlaskRound }],
  },
  {
    id: 'suite-collab',
    title: '协同套件',
    icon: Users,
    children: [
      { id: 'hrm', title: '人力资源', path: '/hrm/dashboard', icon: Users },
      { id: 'crm', title: '客户管理', path: '/crm/dashboard', icon: Users },
      { id: 'pm', title: '项目管理', path: '/pm/dashboard', icon: Target },
    ],
  },
  {
    id: 'suite-business',
    title: '经营套件',
    icon: Building2,
    children: [{ id: 'erp', title: 'ERP', path: '/erp/dashboard', icon: Building2 }],
  },
  {
    id: 'suite-supply',
    title: '供应链套件',
    icon: Truck,
    children: [
      { id: 'scm', title: '供应链', path: '/scm/dashboard', icon: Truck },
      { id: 'wms', title: '仓储管理', path: '/wms/inventory', icon: Warehouse },
      { id: 'srm', title: '供应商', path: '/srm/supplier', icon: Handshake },
    ],
  },
  {
    id: 'suite-analytics',
    title: '分析套件',
    icon: BarChart3,
    children: [
      { id: 'bi', title: '商业智能', path: '/bi/dashboard', icon: BarChart3 },
      { id: 'report', title: '报表服务', path: '/report/list', icon: FileText },
    ],
  },
  {
    id: 'suite-portal',
    title: '门户套件',
    icon: LayoutDashboard,
    children: [
      {
        id: 'portal',
        title: '企业门户',
        path: '/portal/home',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'suite-infrastructure',
    title: '基础设施',
    icon: Network,
    children: [
      {
        id: 'mobile',
        title: '移动端',
        path: '/mobile/settings',
        icon: Smartphone,
      },
      { id: 'gis', title: '地理信息', path: '/gis/dashboard', icon: Map },
      {
        id: 'integration',
        title: '数据交换',
        path: '/integration/dashboard',
        icon: Network,
      },
    ],
  },
];
