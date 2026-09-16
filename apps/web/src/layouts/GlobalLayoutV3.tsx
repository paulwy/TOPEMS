import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/redesign/layout/AppShell';
import type { NavItem } from '../components/redesign/layout/SideRail';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Box,
  Boxes,
  ClipboardList,
  Clock,
  Cpu,
  DollarSign,
  Factory,
  FileText,
  Home,
  Layers,
  Mail,
  Map,
  MessageSquare,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
  Users,
} from 'lucide-react';

/**
 * GlobalLayoutV3 — Industrial OS 全局布局
 *
 * 使用 AppShell（TopBar + SideRail）替换旧的 GlobalLayout / SmartLayout。
 * 通过 VITE_UI_V3_ENABLED 开关控制，开启时走新布局，关闭时回退旧布局。
 *
 * 特性：
 * - 统一的 Industrial OS 视觉语言
 * - 响应式侧边栏导航
 * - 顶部栏集成用户菜单、通知、设置
 * - 命令面板入口（后续接入）
 */
export interface GlobalLayoutV3Props {
  children: React.ReactNode;
  fullWidth?: boolean;
}

// 导航项配置（与旧版 navigationRegistryV2 对齐，后续可从 registry 动态生成）
const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页', icon: Home, path: '/dashboard' },
  {
    id: 'mes',
    label: '制造执行',
    icon: Factory,
    path: '/mes/dashboard',
    children: [
      { id: 'mes-dashboard', label: '生产看板', icon: BarChart3, path: '/mes/dashboard' },
      {
        id: 'mes-production-orders',
        label: '生产订单',
        icon: FileText,
        path: '/mes/production-orders',
      },
      { id: 'mes-work-orders', label: '工单管理', icon: ClipboardList, path: '/mes/work-orders' },
      { id: 'mes-equipment', label: '设备管理', icon: Cpu, path: '/mes/equipment' },
      { id: 'mes-quality', label: '质量检验', icon: ShieldCheck, path: '/mes/quality' },
      { id: 'mes-wip', label: '在制品', icon: Box, path: '/mes/wip' },
      { id: 'mes-report', label: '生产报表', icon: BarChart3, path: '/mes/production-record' },
    ],
  },
  {
    id: 'erp',
    label: '企业资源',
    icon: Layers,
    path: '/erp/dashboard',
    children: [
      { id: 'erp-dashboard', label: 'ERP 仪表盘', icon: BarChart3, path: '/erp/dashboard' },
      {
        id: 'erp-purchase-order',
        label: '采购订单',
        icon: ShoppingCart,
        path: '/erp/purchase-order',
      },
      { id: 'erp-sales-order', label: '销售订单', icon: TrendingUp, path: '/erp/sales-order' },
      { id: 'erp-inventory', label: '库存管理', icon: Package, path: '/erp/inventory-management' },
      {
        id: 'erp-accounting',
        label: '账务管理',
        icon: DollarSign,
        path: '/erp/accounting-management',
      },
      {
        id: 'erp-financial-report',
        label: '财务报表',
        icon: BarChart3,
        path: '/erp/financial-report',
      },
      { id: 'erp-hr', label: '人力资源', icon: Users, path: '/erp/hr' },
    ],
  },
  {
    id: 'scm',
    label: '供应链',
    icon: Truck,
    path: '/scm/dashboard',
    children: [
      { id: 'scm-dashboard', label: 'SCM 仪表盘', icon: BarChart3, path: '/scm/dashboard' },
      { id: 'scm-overview', label: '供应链概览', icon: BarChart3, path: '/scm/overview' },
      { id: 'scm-suppliers', label: '供应商管理', icon: Truck, path: '/scm/suppliers' },
      {
        id: 'scm-purchase-orders',
        label: '采购订单',
        icon: ShoppingCart,
        path: '/scm/purchase-orders',
      },
      {
        id: 'scm-purchase-requisition',
        label: '采购申请',
        icon: FileText,
        path: '/scm/purchase-requisition',
      },
      { id: 'scm-contracts', label: '采购合同', icon: FileText, path: '/scm/contracts' },
      { id: 'scm-mrp-plan', label: 'MRP 计划', icon: Target, path: '/scm/mrp-plan' },
      {
        id: 'scm-price-comparison',
        label: '价格对比',
        icon: TrendingUp,
        path: '/scm/price-comparison',
      },
    ],
  },
  {
    id: 'crm',
    label: '客户管理',
    icon: Users,
    path: '/crm/dashboard',
    children: [
      { id: 'crm-dashboard', label: 'CRM 仪表盘', icon: BarChart3, path: '/crm/dashboard' },
      { id: 'crm-customers', label: '客户列表', icon: Users, path: '/crm/customers' },
      { id: 'crm-contacts', label: '联系人', icon: Users, path: '/crm/contacts' },
      { id: 'crm-opportunities', label: '商机管理', icon: Target, path: '/crm/opportunities' },
      { id: 'crm-interactions', label: '跟进记录', icon: FileText, path: '/crm/interactions' },
    ],
  },
  {
    id: 'qms',
    label: '质量管理',
    icon: ShieldCheck,
    path: '/qms/dashboard',
    children: [
      { id: 'qms-dashboard', label: 'QMS 仪表盘', icon: BarChart3, path: '/qms/dashboard' },
      { id: 'qms-inspection', label: '检验管理', icon: ShieldCheck, path: '/qms/inspection' },
      {
        id: 'qms-nonconformance',
        label: '不合格品',
        icon: AlertTriangle,
        path: '/qms/nonconformance',
      },
      { id: 'qms-eightd', label: '8D 报告', icon: FileText, path: '/qms/eightd' },
      { id: 'qms-audit', label: '审核管理', icon: FileText, path: '/qms/audit-management' },
    ],
  },
  {
    id: 'wms',
    label: '仓储物流',
    icon: Box,
    path: '/wms/dashboard',
    children: [
      { id: 'wms-dashboard', label: 'WMS 仪表盘', icon: BarChart3, path: '/wms/dashboard' },
      { id: 'wms-inbound', label: '入库管理', icon: Package, path: '/wms/inbound-order' },
      { id: 'wms-outbound', label: '出库管理', icon: Package, path: '/wms/outbound-order' },
      { id: 'wms-inventory', label: '库存管理', icon: Boxes, path: '/wms/inventory' },
      { id: 'wms-transfer', label: '调拨管理', icon: Truck, path: '/wms/transfer' },
    ],
  },
  {
    id: 'bi',
    label: '数据决策',
    icon: BarChart3,
    path: '/bi/dashboard',
    children: [
      { id: 'bi-dashboard', label: 'BI 仪表盘', icon: BarChart3, path: '/bi/dashboard' },
      { id: 'bi-analytics', label: '数据分析', icon: TrendingUp, path: '/bi/analytics' },
      { id: 'bi-comparison', label: '对比分析', icon: Target, path: '/bi/comparison' },
      { id: 'bi-report', label: '报表中心', icon: FileText, path: '/bi/report' },
      { id: 'bi-visualization', label: '可视化设计器', icon: BarChart3, path: '/bi/visualization' },
      { id: 'bi-data-source', label: '数据源管理', icon: Package, path: '/bi/data-source' },
      { id: 'bi-dataset', label: '数据集管理', icon: Boxes, path: '/bi/dataset' },
    ],
  },
  {
    id: 'gis',
    label: '地理信息',
    icon: Map,
    path: '/gis/dashboard',
    children: [
      { id: 'gis-dashboard', label: 'GIS 仪表盘', icon: Map, path: '/gis/dashboard' },
      { id: 'gis-map', label: '地图可视化', icon: Map, path: '/gis/map' },
      { id: 'gis-tracking', label: '实时追踪', icon: Truck, path: '/gis/tracking' },
      { id: 'gis-fence', label: '电子围栏', icon: ShieldCheck, path: '/gis/fence' },
    ],
  },
  {
    id: 'doc',
    label: '文档协同',
    icon: FileText,
    path: '/doc/dashboard',
    children: [
      { id: 'doc-dashboard', label: '文档仪表盘', icon: BarChart3, path: '/doc/dashboard' },
      { id: 'doc-list', label: '文档列表', icon: FileText, path: '/doc/list' },
      { id: 'doc-documents', label: '文档管理', icon: FileText, path: '/doc/documents' },
      { id: 'doc-knowledge', label: '知识库', icon: BookOpen, path: '/doc/knowledge-base' },
    ],
  },
  {
    id: 'im',
    label: '消息中心',
    icon: MessageSquare,
    badge: 3,
    path: '/im/dashboard',
    children: [
      { id: 'im-dashboard', label: '消息仪表盘', icon: BarChart3, path: '/im/dashboard' },
      { id: 'im-mail', label: '邮件中心', icon: Mail, path: '/im/mail' },
    ],
  },
  {
    id: 'hrm',
    label: '人力资源',
    icon: Users,
    path: '/hrm/dashboard',
    children: [
      { id: 'hrm-dashboard', label: 'HR 仪表盘', icon: BarChart3, path: '/hrm/dashboard' },
      { id: 'hrm-employees', label: '员工管理', icon: Users, path: '/hrm/employees' },
      { id: 'hrm-organization', label: '组织架构', icon: Layers, path: '/hrm/organization' },
      { id: 'hrm-attendance', label: '考勤管理', icon: Clock, path: '/hrm/attendance' },
      { id: 'hrm-payroll', label: '薪酬管理', icon: DollarSign, path: '/hrm/payroll' },
      { id: 'hrm-performance', label: '绩效管理', icon: Target, path: '/hrm/performance' },
    ],
  },
  {
    id: 'finance',
    label: '财务',
    icon: DollarSign,
    path: '/finance/dashboard',
    children: [
      { id: 'finance-dashboard', label: '财务仪表盘', icon: BarChart3, path: '/finance/dashboard' },
      { id: 'finance-ledger', label: '总账管理', icon: BookOpen, path: '/finance/ledger' },
      { id: 'finance-vouchers', label: '凭证管理', icon: FileText, path: '/finance/vouchers' },
      {
        id: 'finance-receivable',
        label: '应收应付',
        icon: TrendingUp,
        path: '/finance/receivable-payable',
      },
      { id: 'finance-assets', label: '固定资产', icon: Package, path: '/finance/assets' },
      { id: 'finance-budget', label: '预算管理', icon: Target, path: '/finance/budget' },
      { id: 'finance-reports', label: '财务报表', icon: BarChart3, path: '/finance/reports' },
    ],
  },
  {
    id: 'admin',
    label: '系统管理',
    icon: Settings,
    path: '/admin/dashboard',
    children: [
      { id: 'admin-dashboard', label: '系统仪表盘', icon: BarChart3, path: '/admin/dashboard' },
      { id: 'admin-account', label: '账号管理', icon: Users, path: '/admin/account' },
      {
        id: 'admin-permission',
        label: '权限审计',
        icon: ShieldCheck,
        path: '/admin/permission-audit',
      },
      { id: 'admin-audit-log', label: '审计日志', icon: FileText, path: '/admin/audit-log' },
      { id: 'admin-monitor', label: '系统监控', icon: BarChart3, path: '/admin/monitor' },
      { id: 'admin-settings', label: '系统设置', icon: Settings, path: '/admin/system-settings' },
    ],
  },
  {
    id: 'pm',
    label: '项目管理',
    icon: ClipboardList,
    path: '/pm/dashboard',
    children: [
      { id: 'pm-dashboard', label: '项目仪表盘', icon: BarChart3, path: '/pm/dashboard' },
      { id: 'pm-projects', label: '项目列表', icon: ClipboardList, path: '/pm/projects' },
      { id: 'pm-tasks', label: '任务看板', icon: ClipboardList, path: '/pm/task-kanban' },
      { id: 'pm-timeline', label: '时间线', icon: TrendingUp, path: '/pm/timeline' },
      { id: 'pm-contracts', label: '合同管理', icon: FileText, path: '/pm/contracts' },
      { id: 'pm-resources', label: '资源管理', icon: Users, path: '/pm/resources' },
    ],
  },
  {
    id: 'asset',
    label: '资产管理',
    icon: Package,
    path: '/asset/dashboard',
    children: [
      { id: 'asset-dashboard', label: '资产仪表盘', icon: BarChart3, path: '/asset/dashboard' },
      { id: 'asset-list', label: '资产列表', icon: Package, path: '/asset/list' },
      { id: 'asset-categories', label: '资产分类', icon: Layers, path: '/asset/categories' },
      {
        id: 'asset-depreciation',
        label: '折旧管理',
        icon: TrendingDown,
        path: '/asset/depreciation',
      },
      { id: 'asset-transfers', label: '资产转移', icon: Truck, path: '/asset/transfers' },
    ],
  },
  {
    id: 'pdm',
    label: '产品数据',
    icon: Boxes,
    path: '/pdm/dashboard',
    children: [
      { id: 'pdm-dashboard', label: 'PDM 仪表盘', icon: BarChart3, path: '/pdm/dashboard' },
      { id: 'pdm-product', label: '产品管理', icon: Package, path: '/pdm/product' },
      { id: 'pdm-material', label: '物料管理', icon: Package, path: '/pdm/material' },
      { id: 'pdm-bom', label: 'BOM 管理', icon: Layers, path: '/pdm/bom' },
      { id: 'pdm-process', label: '工艺路线', icon: Cpu, path: '/pdm/process' },
      { id: 'pdm-change', label: '变更管理', icon: TrendingUp, path: '/pdm/change' },
    ],
  },
];

const footerItems: NavItem[] = [
  { id: 'settings', label: '系统设置', icon: Settings },
  { id: 'profile', label: '个人中心', icon: User },
];

// 路径到导航项 ID 的映射
const pathToNavId: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/core/dashboard': 'dashboard',
  '/mes': 'mes',
  '/core/mes': 'mes',
  '/erp': 'erp',
  '/core/erp': 'erp',
  '/scm': 'scm',
  '/core/scm': 'scm',
  '/crm': 'crm',
  '/core/crm': 'crm',
  '/qms': 'qms',
  '/core/qms': 'qms',
  '/wms': 'wms',
  '/core/wms': 'wms',
  '/bi': 'bi',
  '/core/bi': 'bi',
  '/gis': 'gis',
  '/core/gis': 'gis',
  '/doc': 'doc',
  '/core/doc': 'doc',
  '/im': 'im',
  '/core/im': 'im',
  '/settings': 'settings',
  '/core/settings': 'settings',
  '/profile': 'profile',
  '/core/profile': 'profile',
};

export const GlobalLayoutV3: React.FC<GlobalLayoutV3Props> = ({ children, fullWidth = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 根据当前路径计算激活的导航项（支持子菜单）
  const activeId = useMemo(() => {
    // 扁平化所有菜单项（包括子菜单）
    const allItems: { id: string; path?: string }[] = [];
    navItems.forEach((item) => {
      allItems.push({ id: item.id, path: item.path });
      if (item.children) {
        item.children.forEach((child) => {
          allItems.push({ id: child.id, path: child.path });
        });
      }
    });

    // 精确匹配
    const exactMatch = allItems.find((item) => item.path === location.pathname);
    if (exactMatch) {
      return exactMatch.id;
    }

    // 前缀匹配
    for (const item of allItems) {
      if (item.path && location.pathname.startsWith(`${item.path}/`)) {
        return item.id;
      }
    }

    return 'dashboard';
  }, [location.pathname]);

  const handleItemClick = (id: string) => {
    // 扁平化所有菜单项，查找对应的 path
    const allItems: { id: string; path?: string }[] = [];
    navItems.forEach((item) => {
      allItems.push({ id: item.id, path: item.path });
      if (item.children) {
        item.children.forEach((child) => {
          allItems.push({ id: child.id, path: child.path });
        });
      }
    });

    const item = allItems.find((item) => item.id === id);
    const path = item?.path || '/dashboard';
    navigate(path);
  };

  // TopBar 按钮处理函数
  const handleCommandOpen = () => {
    console.log('Command palette opened');
  };

  const handleNotificationsOpen = () => {
    navigate('/im');
  };

  const handleSettingsOpen = () => {
    navigate('/dashboard');
  };

  const handleProfileOpen = () => {
    navigate('/profile');
  };

  return (
    <AppShell
      title='TOPEMS'
      items={navItems}
      activeId={activeId}
      onItemClick={handleItemClick}
      footerItems={footerItems}
      fullWidth={fullWidth}
      onCommandOpen={handleCommandOpen}
      onNotificationsOpen={handleNotificationsOpen}
      onSettingsOpen={handleSettingsOpen}
      onProfileOpen={handleProfileOpen}
    >
      {children}
    </AppShell>
  );
};

export default GlobalLayoutV3;
