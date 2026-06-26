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
  FileCode,
  CloudCog,
  Flag,
  Rocket,
  Eye,
  CheckSquare,
  Brain,
  Receipt,
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
          path: '/finance/vouchers',
        },
        {
          id: 'erp-finance-invoice',
          title: '发票管理',
          path: '/finance/invoices',
        },
        {
          id: 'erp-finance-budget',
          title: '预算管理',
          path: '/finance/budget',
        },
        {
          id: 'erp-finance-reports',
          title: '财务报表',
          path: '/finance/reports',
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
      path: '/hrm',
      icon: LayoutDashboard,
    },
    {
      id: 'hrm-organization',
      title: '组织架构',
      icon: Building2,
      children: [
        { id: 'hrm-company', title: '公司管理', path: '/hrm/companies' },
        { id: 'hrm-department', title: '部门管理', path: '/hrm/departments' },
        { id: 'hrm-org-chart', title: '组织架构图', path: '/hrm/organization' },
        { id: 'hrm-position', title: '职位管理', path: '/hrm/positions' },
      ],
    },
    {
      id: 'hrm-employee',
      title: '员工管理',
      icon: Users,
      children: [
        { id: 'hrm-employee-list', title: '员工列表', path: '/hrm/employees' },
        {
          id: 'hrm-employee-create',
          title: '新增员工',
          path: '/hrm/employee/create',
        },
        { id: 'hrm-contract', title: '合同管理', path: '/hrm/contracts' },
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
      children: [
        { id: 'hrm-payroll-main', title: '薪资管理', path: '/hrm/payroll' },
        { id: 'hrm-salary-adjustment', title: '调薪记录', path: '/hrm/salary-adjustments' },
      ],
    },
    {
      id: 'hrm-performance',
      title: '绩效管理',
      icon: Target,
      path: '/hrm/performance',
    },
    {
      id: 'hrm-training',
      title: '培训管理',
      icon: BookOpen,
      path: '/hrm/training',
    },
    {
      id: 'hrm-recruitment',
      title: '招聘管理',
      icon: Plus,
      path: '/hrm/recruitment',
    },
    {
      id: 'hrm-reports',
      title: '人事报表',
      icon: BarChart3,
      path: '/hrm/reports',
    },
  ],
  crm: [
    {
      id: 'crm-dashboard',
      title: 'CRM 首页',
      path: '/crm',
      icon: LayoutDashboard,
    },
    {
      id: 'crm-customer',
      title: '客户管理',
      icon: Users,
      children: [
        { id: 'crm-customer-list', title: '客户列表', path: '/crm/customers' },
        { id: 'crm-contact', title: '联系人', path: '/crm/contacts' },
        { id: 'crm-segments', title: '客户分群', path: '/crm/segments' },
        { id: 'crm-scoring', title: '客户评分', path: '/crm/scoring' },
      ],
    },
    {
      id: 'crm-opportunity',
      title: '商机管理',
      icon: Target,
      children: [
        { id: 'crm-opportunity-list', title: '商机列表', path: '/crm/opportunities' },
        { id: 'crm-funnel', title: '销售漏斗', path: '/crm/funnel' },
        { id: 'crm-forecast', title: '销售预测', path: '/crm/forecast' },
      ],
    },
    {
      id: 'crm-interaction',
      title: '互动管理',
      icon: Activity,
      path: '/crm/interactions',
    },
    {
      id: 'crm-intelligence',
      title: '智能分析',
      icon: Brain,
      children: [
        { id: 'crm-recommendations', title: '智能推荐', path: '/crm/recommendations' },
      ],
    },
    {
      id: 'crm-billing',
      title: '账单管理',
      icon: Receipt,
      path: '/crm/billing',
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
      path: '/pm/projects',
    },
    {
      id: 'pm-contract',
      title: '合同管理',
      icon: FileText,
      path: '/pm/contracts',
    },
    {
      id: 'pm-report',
      title: '项目报表',
      icon: BarChart3,
      path: '/pm/reports',
    },
    {
      id: 'pm-resources',
      title: '资源管理',
      icon: Package,
      path: '/pm/resources',
    },
  ],
  mes: [
    {
      id: 'mes-dashboard',
      title: 'MES 首页',
      path: '/mes/board',
      icon: LayoutDashboard,
    },
    {
      id: 'mes-production',
      title: '生产管理',
      icon: Factory,
      children: [
        { id: 'mes-order', title: '生产工单', path: '/mes/orders' },
        {
          id: 'mes-process',
          title: '生产工艺',
          path: '/mes/processes',
        },
        { id: 'mes-record', title: '生产记录', path: '/mes/records' },
      ],
    },
    {
      id: 'mes-workstation',
      title: '工位管理',
      icon: Wrench,
      path: '/mes/workstations',
    },
    {
      id: 'mes-mobile',
      title: '移动端',
      icon: Smartphone,
      path: '/mobile/settings',
    },
  ],
  pdm: [
    {
      id: 'pdm-stats',
      title: '产品数据',
      path: '/pdm',
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
      path: '/qms',
      icon: Shield,
    },
    {
      id: 'qms-nonconformance',
      title: '不合格品',
      path: '/qms/issues',
      icon: AlertTriangle,
    },
    {
      id: 'qms-improvement',
      title: '质量改进',
      path: '/qms/improvements',
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
      path: '/qms/standards',
      icon: Target,
    },
    {
      id: 'qms-check',
      title: '检验记录',
      path: '/qms/checks',
      icon: CheckSquare,
    },
    {
      id: 'qms-apqp',
      title: 'APQP 管理',
      path: '/qms/apqp',
      icon: Layers,
    },
  ],
  lims: [
    {
      id: 'lims-sample',
      title: '样品管理',
      path: '/lims/samples',
      icon: FlaskConical,
    },
    {
      id: 'lims-task',
      title: '检验任务',
      path: '/lims/tasks',
      icon: Activity,
    },
    {
      id: 'lims-instrument',
      title: '仪器管理',
      path: '/lims/instruments',
      icon: Wrench,
    },
    {
      id: 'lims-instrument-data',
      title: '仪器数据采集',
      path: '/lims/instrument-data',
      icon: Database,
    },
  ],
  ehs: [
    {
      id: 'ehs-hazard',
      title: '危险源',
      path: '/ehs/hazards',
      icon: AlertTriangle,
    },
    {
      id: 'ehs-check',
      title: '安全检查',
      path: '/ehs/checks',
      icon: Shield,
    },
    {
      id: 'ehs-drill',
      title: '应急演练',
      path: '/ehs/drills',
      icon: AlertTriangle,
    },
    {
      id: 'ehs-accident',
      title: '事故管理',
      path: '/ehs/incident',
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
      path: '/rs',
      icon: LayoutDashboard,
    },
    {
      id: 'rs-experiment',
      title: '实验管理',
      icon: FlaskRound,
      path: '/rs/experiments',
    },
    {
      id: 'rs-formula',
      title: '配方管理',
      icon: FlaskConical,
      path: '/rs/formulas',
    },
    {
      id: 'rs-project',
      title: '项目管理',
      icon: Target,
      path: '/rs/projects',
    },
    {
      id: 'rs-bugs',
      title: '缺陷管理',
      icon: AlertTriangle,
      path: '/rs/bugs',
    },
    {
      id: 'rs-builds',
      title: '构建管理',
      icon: Wrench,
      path: '/rs/builds',
    },
    {
      id: 'rs-code',
      title: '代码管理',
      icon: FileCode,
      path: '/rs/code',
    },
    {
      id: 'rs-deploy',
      title: '部署管理',
      icon: CloudCog,
      path: '/rs/deploy',
    },
    {
      id: 'rs-docs',
      title: '文档管理',
      icon: FileText,
      path: '/rs/docs',
    },
    {
      id: 'rs-milestones',
      title: '里程碑',
      icon: Flag,
      path: '/rs/milestones',
    },
    {
      id: 'rs-releases',
      title: '版本发布',
      icon: Rocket,
      path: '/rs/releases',
    },
    {
      id: 'rs-reviews',
      title: '评审管理',
      icon: Eye,
      path: '/rs/reviews',
    },
    {
      id: 'rs-settings',
      title: '研发设置',
      icon: Settings,
      path: '/rs/settings',
    },
    {
      id: 'rs-tests',
      title: '测试管理',
      icon: CheckSquare,
      path: '/rs/tests',
    },
  ],
  scm: [
    {
      id: 'scm-dashboard',
      title: '供应链',
      path: '/scm',
      icon: LayoutDashboard,
    },
    {
      id: 'scm-purchase',
      title: '采购管理',
      icon: ShoppingCart,
      path: '/scm/purchase-orders',
    },
    {
      id: 'scm-sales',
      title: '销售管理',
      icon: Truck,
      path: '/scm',
    },
  ],
  wms: [
    {
      id: 'wms-inventory',
      title: '库存管理',
      path: '/wms',
      icon: Warehouse,
    },
    {
      id: 'wms-warehouse',
      title: '仓库管理',
      icon: Building2,
      path: '/wms/warehouses',
    },
    {
      id: 'wms-inbound',
      title: '入库管理',
      icon: Package,
      path: '/wms/inbound-orders',
    },
    {
      id: 'wms-outbound',
      title: '出库管理',
      icon: Truck,
      path: '/wms/outbound-orders',
    },
    {
      id: 'wms-stock-take',
      title: '库存盘点',
      icon: BarChart3,
      path: '/wms/stock-takes',
    },
    {
      id: 'wms-suppliers',
      title: '供应商管理',
      icon: Users,
      path: '/wms/suppliers',
    },
  ],
  srm: [
    {
      id: 'srm-supplier',
      title: '供应商管理',
      path: '/srm/suppliers',
      icon: Handshake,
    },
    {
      id: 'srm-evaluation',
      title: '供应商评估',
      icon: Award,
      path: '/srm/evaluations',
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
      path: '/srm',
    },
    {
      id: 'srm-contract',
      title: '合同管理',
      icon: FileText,
      path: '/srm/contracts',
    },
  ],
  bi: [
    {
      id: 'bi-dashboard',
      title: 'BI 首页',
      path: '/bi',
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
      path: '/bi/datasources',
    },
    {
      id: 'bi-gis',
      title: 'GIS分析',
      icon: Map,
      path: '/bi/gis',
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
    {
      id: 'report-templates',
      title: '报表模板',
      path: '/report/templates',
      icon: Grid3X3,
    },
    {
      id: 'report-builder',
      title: '报表构建',
      path: '/report/builder',
      icon: Wrench,
    },
    {
      id: 'report-viewer',
      title: '报表查看',
      path: '/report/viewer',
      icon: Eye,
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
      path: '/mobile',
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
      path: '/integration',
      icon: Link,
    },
    {
      id: 'integration-mapping',
      title: '数据映射',
      path: '/integration',
      icon: GitBranch,
    },
  ],
  finance: [
    {
      id: 'finance-dashboard',
      title: '财务首页',
      path: '/finance',
      icon: LayoutDashboard,
    },
    {
      id: 'finance-accounting',
      title: '会计核算',
      icon: FileText,
      children: [
        { id: 'finance-voucher', title: '凭证管理', path: '/finance/vouchers' },
        { id: 'finance-ledger', title: '总账管理', path: '/finance/ledger' },
      ],
    },
    {
      id: 'finance-funds',
      title: '资金管理',
      icon: Handshake,
      children: [
        { id: 'finance-receivable', title: '应收管理', path: '/finance/receivable' },
        { id: 'finance-payable', title: '应付管理', path: '/finance/payable' },
        { id: 'finance-receipts', title: '收款管理', path: '/finance/receipts' },
        { id: 'finance-payments', title: '付款管理', path: '/finance/payments' },
      ],
    },
    {
      id: 'finance-tax-asset',
      title: '税务资产',
      icon: Shield,
      children: [
        { id: 'finance-invoices', title: '发票管理', path: '/finance/invoices' },
        { id: 'finance-tax', title: '税务管理', path: '/finance/tax' },
        { id: 'finance-assets', title: '资产管理', path: '/finance/assets' },
      ],
    },
    {
      id: 'finance-cost-expense',
      title: '成本费用',
      icon: Factory,
      children: [
        { id: 'finance-expense', title: '费用管理', path: '/finance/expense' },
        { id: 'finance-cost', title: '成本管理', path: '/finance/cost' },
      ],
    },
    {
      id: 'finance-budget-group',
      title: '预算管理',
      icon: Target,
      children: [
        { id: 'finance-budget', title: '预算概览', path: '/finance/budget' },
        { id: 'finance-budget-management', title: '预算编制', path: '/finance/budget-management' },
      ],
    },
    {
      id: 'finance-reports-group',
      title: '报表分析',
      icon: BarChart3,
      children: [
        { id: 'finance-reports', title: '财务报表', path: '/finance/reports' },
        { id: 'finance-consolidation', title: '合并报表', path: '/finance/consolidation' },
        { id: 'finance-consolidation-reports', title: '合并报告', path: '/finance/consolidation-reports' },
        { id: 'finance-opening-balance', title: '期初余额', path: '/finance/opening-balance' },
      ],
    },
  ],
  iam: [
    {
      id: 'iam-dashboard',
      title: 'IAM 首页',
      path: '/iam',
      icon: LayoutDashboard,
    },
    {
      id: 'iam-users',
      title: '用户管理',
      path: '/iam/users',
      icon: Users,
    },
    {
      id: 'iam-roles',
      title: '角色管理',
      path: '/iam/roles',
      icon: Shield,
    },
    {
      id: 'iam-permissions',
      title: '权限管理',
      path: '/iam/permissions',
      icon: Lock,
    },
    {
      id: 'iam-audit',
      title: '审计日志',
      path: '/iam/audit',
      icon: FileText,
    },
    {
      id: 'iam-system',
      title: '系统管理',
      path: '/iam/system',
      icon: Settings,
    },
    {
      id: 'iam-dictionaries',
      title: '字典管理',
      path: '/iam/dictionaries',
      icon: BookOpen,
    },
    {
      id: 'iam-database',
      title: '数据库结构',
      path: '/iam/database',
      icon: Database,
    },
    {
      id: 'iam-migration',
      title: '数据迁移',
      path: '/iam/migration',
      icon: GitBranch,
    },
    {
      id: 'iam-debug',
      title: '配置调试',
      path: '/iam/debug',
      icon: Wrench,
    },
    {
      id: 'iam-plugins',
      title: '插件管理',
      path: '/iam/plugins',
      icon: Grid3X3,
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
        path: '/knowledge-base',
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
        path: '/flow/approvals',
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
        path: '/flow/templates',
        icon: FileText,
      },
      {
        id: 'flow-definition',
        title: '流程定义管理',
        path: '/flow/definition',
        icon: FileCode,
      },
      {
        id: 'flow-flow-designer',
        title: '流程设计器',
        path: '/flow/flow-designer',
        icon: Wrench,
      },
      {
        id: 'flow-monitor',
        title: '流程监控',
        path: '/flow/monitor',
        icon: Activity,
      },
      {
        id: 'flow-settings',
        title: '流程设置',
        path: '/flow/settings',
        icon: Settings,
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
        path: '/iam/system',
        icon: Settings,
      },
      {
        id: 'user-management',
        title: '用户管理',
        path: '/iam/users',
        icon: Users,
      },
      {
        id: 'role-management',
        title: '角色管理',
        path: '/iam/roles',
        icon: Shield,
      },
      {
        id: 'permission-management',
        title: '权限管理',
        path: '/iam/permissions',
        icon: Lock,
      },
      {
        id: 'audit-log',
        title: '审计日志',
        path: '/iam/audit',
        icon: FileText,
      },
      {
        id: 'system-monitor',
        title: '系统监控',
        path: '/system/monitor',
        icon: Activity,
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
        path: '/mes/board',
        icon: Factory,
        pluginCode: 'mes',
      },
      {
        id: 'pdm',
        title: '产品数据',
        path: '/pdm',
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
        path: '/qms',
        icon: Shield,
        pluginCode: 'qms',
      },
      {
        id: 'lims',
        title: '实验室',
        path: '/lims/samples',
        icon: FlaskConical,
        pluginCode: 'lims',
      },
      {
        id: 'ehs',
        title: '环境安全',
        path: '/ehs/hazards',
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
        path: '/rs',
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
        path: '/hrm',
        icon: Users,
        pluginCode: 'hrm',
      },
      {
        id: 'crm',
        title: '客户管理',
        path: '/crm',
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
        path: '/scm',
        icon: Truck,
        pluginCode: 'scm',
      },
      {
        id: 'wms',
        title: '仓储管理',
        path: '/wms',
        icon: Warehouse,
        pluginCode: 'wms',
      },
      {
        id: 'srm',
        title: '供应商',
        path: '/srm/suppliers',
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
        path: '/bi',
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
        path: '/mobile',
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
        path: '/gis/map',
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
      { label: '凭证管理', path: '/finance/vouchers' },
      { label: '发票管理', path: '/finance/invoices' },
      { label: '采购订单', path: '/erp/purchase/order' },
      { label: '销售订单', path: '/erp/sales/order' },
    ],
  },
  {
    module: 'hrm',
    tabs: [
      { label: 'HRM 首页', path: '/hrm', pinned: true },
      { label: '员工列表', path: '/hrm/employees' },
      { label: '考勤记录', path: '/hrm/attendance' },
    ],
  },
  {
    module: 'crm',
    tabs: [
      { label: 'CRM 首页', path: '/crm', pinned: true },
      { label: '客户列表', path: '/crm/customers' },
      { label: '商机管理', path: '/crm/opportunities' },
    ],
  },
  {
    module: 'pm',
    tabs: [
      { label: '项目管理', path: '/pm/dashboard', pinned: true },
      { label: '项目列表', path: '/pm/projects' },
      { label: '合同管理', path: '/pm/contracts' },
      { label: '资源管理', path: '/pm/resources' },
    ],
  },
  {
    module: 'mes',
    tabs: [
      { label: 'MES 首页', path: '/mes/board', pinned: true },
      { label: '生产看板', path: '/mes/board' },
      { label: '生产工单', path: '/mes/orders' },
      { label: '工位管理', path: '/mes/workstations' },
    ],
  },
  {
    module: 'scm',
    tabs: [
      { label: '供应链', path: '/scm', pinned: true },
      { label: '采购管理', path: '/scm/purchase-orders' },
      { label: '销售管理', path: '/scm' },
    ],
  },
  {
    module: 'wms',
    tabs: [
      { label: '库存管理', path: '/wms', pinned: true },
      { label: '入库管理', path: '/wms/inbound-orders' },
      { label: '出库管理', path: '/wms/outbound-orders' },
      { label: '供应商管理', path: '/wms/suppliers' },
    ],
  },
  {
    module: 'srm',
    tabs: [
      { label: '供应商管理', path: '/srm/suppliers', pinned: true },
      { label: '寻源管理', path: '/srm' },
      { label: '合同管理', path: '/srm/contracts' },
    ],
  },
  {
    module: 'qms',
    tabs: [
      { label: '质量检验', path: '/qms', pinned: true },
      { label: '不合格品', path: '/qms' },
      { label: '审核管理', path: '/qms/audit' },
    ],
  },
  {
    module: 'lims',
    tabs: [
      { label: '样品管理', path: '/lims/samples', pinned: true },
      { label: '检验任务', path: '/lims/tasks' },
      { label: '仪器管理', path: '/lims/instruments' },
      { label: '数据采集', path: '/lims/instrument-data' },
    ],
  },
  {
    module: 'ehs',
    tabs: [
      { label: '危险源', path: '/ehs/hazards', pinned: true },
      { label: '安全检查', path: '/ehs/checks' },
      { label: '应急演练', path: '/ehs/drills' },
      { label: '事故管理', path: '/ehs/incident' },
    ],
  },
  {
    module: 'rs',
    tabs: [
      { label: '研发首页', path: '/rs', pinned: true },
      { label: '实验管理', path: '/rs/experiments' },
      { label: '配方管理', path: '/rs/formulas' },
      { label: '缺陷管理', path: '/rs/bugs' },
      { label: '构建管理', path: '/rs/builds' },
      { label: '代码管理', path: '/rs/code' },
      { label: '部署管理', path: '/rs/deploy' },
      { label: '文档管理', path: '/rs/docs' },
      { label: '里程碑', path: '/rs/milestones' },
      { label: '版本发布', path: '/rs/releases' },
      { label: '评审管理', path: '/rs/reviews' },
      { label: '研发设置', path: '/rs/settings' },
      { label: '测试管理', path: '/rs/tests' },
    ],
  },
  {
    module: 'pdm',
    tabs: [
      { label: '产品数据', path: '/pdm', pinned: true },
      { label: '配方管理', path: '/pdm/formula' },
      { label: '工艺管理', path: '/pdm/process' },
    ],
  },
  {
    module: 'bi',
    tabs: [
      { label: 'BI 首页', path: '/bi', pinned: true },
      { label: '数据分析', path: '/bi/analytics' },
      { label: '数据源', path: '/bi/datasources' },
      { label: 'GIS分析', path: '/bi/gis' },
    ],
  },
  {
    module: 'report',
    tabs: [
      { label: '报表中心', path: '/report/list', pinned: true },
      { label: '报表设计', path: '/report/design' },
      { label: '定时任务', path: '/report/schedules' },
      { label: '订阅管理', path: '/report/subscriptions' },
      { label: '报表模板', path: '/report/templates' },
      { label: '报表构建', path: '/report/builder' },
      { label: '报表查看', path: '/report/viewer' },
    ],
  },
  {
    module: 'monitor',
    tabs: [
      { label: '监控首页', path: '/monitor/dashboard', pinned: true },
      { label: '告警管理', path: '/monitor/alerts' },
      { label: '性能监控', path: '/monitor/metrics' },
    ],
  },
  {
    module: 'finance',
    tabs: [
      { label: '财务首页', path: '/finance', pinned: true },
      { label: '凭证管理', path: '/finance/vouchers' },
      { label: '总账管理', path: '/finance/ledger' },
      { label: '财务报表', path: '/finance/reports' },
    ],
  },
  {
    module: 'iam',
    tabs: [
      { label: 'IAM 首页', path: '/iam', pinned: true },
      { label: '用户管理', path: '/iam/users' },
      { label: '角色管理', path: '/iam/roles' },
      { label: '权限管理', path: '/iam/permissions' },
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
    '^/finance': 'finance',
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
    '^/report/list': 'report',
    '^/monitor': 'monitor',
    '^/portal': 'portal',
    '^/mobile': 'mobile',
    '^/gis': 'gis',
    '^/integration': 'integration',
    '^/iam': 'iam',
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
      { id: 'mes', title: '生产执行', path: '/mes/board', icon: Factory },
      { id: 'pdm', title: '产品数据', path: '/pdm', icon: Layers },
    ],
  },
  {
    id: 'suite-quality',
    title: '质量套件',
    icon: Shield,
    children: [
      { id: 'qms', title: '质量管理', path: '/qms', icon: Shield },
      { id: 'lims', title: '实验室', path: '/lims/samples', icon: FlaskConical },
      { id: 'ehs', title: '环境安全', path: '/ehs/hazards', icon: Leaf },
    ],
  },
  {
    id: 'suite-rd',
    title: '研发套件',
    icon: FlaskRound,
    children: [{ id: 'rs', title: '研发管理', path: '/rs', icon: FlaskRound }],
  },
  {
    id: 'suite-collab',
    title: '协同套件',
    icon: Users,
    children: [
      { id: 'hrm', title: '人力资源', path: '/hrm', icon: Users },
      { id: 'crm', title: '客户管理', path: '/crm', icon: Users },
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
      { id: 'scm', title: '供应链', path: '/scm', icon: Truck },
      { id: 'wms', title: '仓储管理', path: '/wms', icon: Warehouse },
      { id: 'srm', title: '供应商', path: '/srm/suppliers', icon: Handshake },
    ],
  },
  {
    id: 'suite-analytics',
    title: '分析套件',
    icon: BarChart3,
    children: [
      { id: 'bi', title: '商业智能', path: '/bi', icon: BarChart3 },
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
        path: '/mobile',
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
      { id: 'gis', title: '地理信息', path: '/gis/map', icon: Map },
      {
        id: 'integration',
        title: '数据交换',
        path: '/integration/dashboard',
        icon: Network,
      },
    ],
  },
];
