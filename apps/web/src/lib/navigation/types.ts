import i18n from '@/i18n';
/**
 * L3 菜单子组标准枚举（四层模型 v2.0 强制规范）
 * 顺序 order 与 操作心智一致：概览 → 主数据 → 流程 → 单据 → 分析 → 报表 → 设置 → 其他
 * 新增模块禁止自定义字符串，必须从下列枚举中取。若业务语义确实不合，先发起 RFC 增补本表。
 */
export type NavGroup =
  | 'overview' // (0)  仪表盘/首页     每个模块至少1个
  | 'master' // (10) 基础/主数据     物料/设备/客户/员工等档案
  | 'process' // (20) 核心业务流程    流程执行/操作流转类页面
  | 'business' // (30) 业务单据管理    订单/工单/单据类增删改查
  | 'analytics' // (40) 统计分析       看板/统计/SPC/OEE/成本核算
  | 'report' // (50) 报表与打印     报告/打印模板/导出报表
  | 'setting' // (60) 系统配置/模板   参数/方案/阈值/模板配置
  | 'other'; // (99) 杂项兜底（尽量不用）

export type ModuleSource = 'core' | 'plugin';
/**
 * L1 业务域标准枚举（四层模型 v2.0，共 10 个，禁止随意新增）
 * 新增模块必须从下表选归属；若确需新增 L1，请按 RFC 流程发起评审。
 */
export type ModuleSuite =
  | 'enterprise' // (10) 🏢 企业平台：系统级配置/跨域主数据/BI/报表/插件市场
  | 'manufacturing' // (20) 🏭 制造域：MES 生产执行/EHS 安全环保
  | 'quality' // (30) 🔬 质量域：QMS 质量管理/LIMS 实验室管理
  | 'supply' // (40) 📦 供应链域：SCM 采购/WMS 仓储/SRM 供应商
  | 'finance' // (50) 💰 财务域：财务会计/成本/资金/税务
  | 'hr' // (60) 👥 人力域：员工/考勤/薪酬/招聘/绩效/培训
  | 'crm' // (70) 🤝 客户域：线索/客户/商机/报价/合同/回款
  | 'project' // (80) 🗓️ 项目域：PM 项目管理/RD 研发管理
  | 'collaboration' // (90) 🧰 工具与协同域：工作流/文档/通知/工单/OA/IM/资产/移动端
  | 'platform'; // (100) ⚙️ 平台能力域：集成/监控/自动化/低代码/AI/GIS
export type ModuleStatus = 'online' | 'beta' | 'plan' | 'new';

export interface NavItemConfig {
  code: string;
  label: string;
  /** i18n key for the label; if provided, render-time translation overrides `label` */
  labelKey?: string;
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
  /** i18n key for the name; if provided, render-time translation overrides `name` */
  nameKey?: string;
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
  /** i18n key for the name; if provided, render-time translation overrides `name` */
  nameKey?: string;
  icon: string;
  path: string;
  permission?: string;
  status?: ModuleStatus;
  source: ModuleSource;
  suite?: ModuleSuite;
  order?: number;
  description?: string;
}

export const NAV_GROUPS: Record<
  NavGroup,
  { label: string; labelKey: string; icon: string; order: number }
> = {
  overview: { label: 'Overview', labelKey: 'shared.types.k0', icon: 'LayoutDashboard', order: 0 },
  master: { label: 'Master Data', labelKey: 'shared.types.k1', icon: 'Database', order: 10 },
  process: { label: 'Process', labelKey: 'shared.types.k2', icon: 'Workflow', order: 20 },
  business: { label: 'Business', labelKey: 'shared.types.k3', icon: 'Briefcase', order: 30 },
  analytics: { label: 'Analytics', labelKey: 'shared.types.k4', icon: 'BarChart3', order: 40 },
  report: { label: 'Report', labelKey: 'shared.types.k5', icon: 'FileSpreadsheet', order: 50 },
  setting: { label: 'Settings', labelKey: 'shared.types.k6', icon: 'Settings', order: 60 },
  other: { label: 'Other', labelKey: 'shared.types.k7', icon: 'MoreHorizontal', order: 99 },
};

export const SUITE_GROUPS: Record<
  ModuleSuite | 'other',
  { label: string; labelKey: string; emoji: string; icon: string; order: number }
> = {
  enterprise: {
    label: 'Enterprise',
    labelKey: 'shared.types.k8',
    emoji: '🏢',
    icon: 'Building2',
    order: 10,
  },
  manufacturing: {
    label: 'Manufacturing',
    labelKey: 'shared.types.k9',
    emoji: '🏭',
    icon: 'Factory',
    order: 20,
  },
  quality: {
    label: 'Quality',
    labelKey: 'shared.types.k10',
    emoji: '🔬',
    icon: 'ShieldCheck',
    order: 30,
  },
  supply: {
    label: 'Supply Chain',
    labelKey: 'shared.types.k11',
    emoji: '📦',
    icon: 'Truck',
    order: 40,
  },
  finance: {
    label: 'Finance',
    labelKey: 'shared.types.k12',
    emoji: '💰',
    icon: 'Wallet',
    order: 50,
  },
  hr: { label: 'HR', labelKey: 'shared.types.k13', emoji: '👥', icon: 'Users', order: 60 },
  crm: { label: 'CRM', labelKey: 'shared.types.k14', emoji: '🤝', icon: 'Users', order: 70 },
  project: {
    label: 'Project',
    labelKey: 'shared.types.k15',
    emoji: '🗓️',
    icon: 'Briefcase',
    order: 80,
  },
  collaboration: {
    label: 'Collaboration',
    labelKey: 'shared.types.k16',
    emoji: '🧰',
    icon: 'MessagesSquare',
    order: 90,
  },
  platform: {
    label: 'Platform',
    labelKey: 'shared.types.k17',
    emoji: '⚙️',
    icon: 'LayoutDashboard',
    order: 100,
  },
  other: {
    label: 'Other',
    labelKey: 'shared.types.k18',
    emoji: '❓',
    icon: 'MoreHorizontal',
    order: 999,
  },
};
