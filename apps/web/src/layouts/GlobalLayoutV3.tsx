import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/redesign/layout/AppShell';
import type { NavItem } from '../components/redesign/layout/SideRail';
import { usePermission } from '../hooks/usePermission';
import { MENU_PERMISSIONS } from '../config/menuPermissions';
import {
  useUnreadNotificationCount,
  useSetUnreadNotificationCount,
} from '@/store/notificationBadgeStore';
import { getUnreadCount } from '@/api/notification';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Box,
  Boxes,
  ClipboardList,
  Beaker,
  Clock,
  Cpu,
  DollarSign,
  Factory,
  FileText,
  FlaskConical,
  Handshake,
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
  Users,
} from 'lucide-react';

/**
 * GlobalLayoutV3 — Industrial OS 全局布局
 *
 * 使用 AppShell（TopBar + SideRail）替换旧的 GlobalLayout / SmartLayout。
 * 定案（2026-10-16）：主路由恒用本布局，原 VITE_UI_V3_ENABLED 灰度开关已移除。
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
  { id: 'dashboard', label: 'shared.sidebar.dashboard', icon: Home, path: '/dashboard' },
  {
    id: 'mes',
    label: 'shared.sidebar.mes',
    icon: Factory,
    path: '/mes/dashboard',
    children: [
      {
        id: 'mes-dashboard',
        label: 'shared.sidebar.mes_dashboard',
        icon: BarChart3,
        path: '/mes/dashboard',
      },
      {
        id: 'mes-production-orders',
        label: 'shared.sidebar.mes_production_orders',
        icon: FileText,
        path: '/mes/production-orders',
      },
      {
        id: 'mes-work-orders',
        label: 'shared.sidebar.mes_work_orders',
        icon: ClipboardList,
        path: '/mes/work-orders',
      },
      {
        id: 'mes-equipment',
        label: 'shared.sidebar.mes_equipment',
        icon: Cpu,
        path: '/mes/equipment',
      },
      {
        id: 'mes-quality',
        label: 'shared.sidebar.mes_quality',
        icon: ShieldCheck,
        path: '/mes/quality',
      },
      { id: 'mes-wip', label: 'shared.sidebar.mes_wip', icon: Box, path: '/mes/wip' },
      {
        id: 'mes-report',
        label: 'shared.sidebar.mes_report',
        icon: BarChart3,
        path: '/mes/production-record',
      },
    ],
  },
  {
    id: 'erp',
    label: 'shared.sidebar.erp',
    icon: Layers,
    path: '/erp/dashboard',
    children: [
      {
        id: 'erp-dashboard',
        label: 'shared.sidebar.erp_dashboard',
        icon: BarChart3,
        path: '/erp/dashboard',
      },
      {
        id: 'erp-purchase-order',
        label: 'shared.sidebar.erp_purchase_order',
        icon: ShoppingCart,
        path: '/erp/purchase-order',
      },
      {
        id: 'erp-sales-orders',
        label: 'shared.sidebar.erp_sales_order',
        icon: TrendingUp,
        path: '/erp/sales-orders',
      },
      {
        id: 'erp-inventory',
        label: 'shared.sidebar.erp_inventory',
        icon: Package,
        path: '/erp/inventory-management',
      },
      {
        id: 'erp-accounting',
        label: 'shared.sidebar.erp_accounting',
        icon: DollarSign,
        path: '/erp/accounting-management',
      },
      {
        id: 'erp-financial-report',
        label: 'shared.sidebar.erp_financial_report',
        icon: BarChart3,
        path: '/erp/financial-report',
      },
      // 观察项：ERP 下曾误挂"人力资源"子项（指向 /hrm/dashboard，与主菜单 HRM 重复），已移除，
      // 人力资源统一由顶层 hrm 菜单承载。
    ],
  },
  {
    id: 'scm',
    label: 'shared.sidebar.scm',
    icon: Truck,
    path: '/scm/dashboard',
    children: [
      {
        id: 'scm-dashboard',
        label: 'shared.sidebar.scm_dashboard',
        icon: BarChart3,
        path: '/scm/dashboard',
      },
      {
        id: 'scm-overview',
        label: 'shared.sidebar.scm_overview',
        icon: BarChart3,
        path: '/scm/overview',
      },
      {
        id: 'scm-suppliers',
        label: 'shared.sidebar.scm_suppliers',
        icon: Truck,
        path: '/scm/suppliers',
      },
      {
        id: 'scm-purchase-orders',
        label: 'shared.sidebar.scm_purchase_orders',
        icon: ShoppingCart,
        path: '/scm/purchase-orders',
      },
      {
        id: 'scm-purchase-requisition',
        label: 'shared.sidebar.scm_purchase_requisition',
        icon: FileText,
        path: '/scm/purchase-requisition',
      },
      {
        id: 'scm-contracts',
        label: 'shared.sidebar.scm_contracts',
        icon: FileText,
        path: '/scm/contracts',
      },
      {
        id: 'scm-mrp-plan',
        label: 'shared.sidebar.scm_mrp_plan',
        icon: Target,
        path: '/scm/mrp-plan',
      },
      {
        id: 'scm-price-comparison',
        label: 'shared.sidebar.scm_price_comparison',
        icon: TrendingUp,
        path: '/scm/price-comparison',
      },
    ],
  },
  // S8: 补 SRM 模块入口（与 SCM 采购区分：供应商关系/招标寻源/合同协同）
  {
    id: 'srm',
    label: 'shared.config.srm_name',
    icon: Handshake,
    path: '/srm/dashboard',
    children: [
      {
        id: 'srm-dashboard',
        label: 'shared.sidebar.srm_dashboard',
        icon: BarChart3,
        path: '/srm/dashboard',
      },
      {
        id: 'srm-supplier',
        label: 'shared.sidebar.srm_supplier',
        icon: Users,
        path: '/srm/supplier',
      },
      {
        id: 'srm-bidding',
        label: 'shared.sidebar.srm_bidding',
        icon: FileText,
        path: '/srm/bidding',
      },
      {
        id: 'srm-contract',
        label: 'shared.sidebar.srm_contract',
        icon: ShoppingCart,
        path: '/srm/contract',
      },
    ],
  },
  {
    id: 'crm',
    label: 'shared.sidebar.crm',
    icon: Users,
    path: '/crm/dashboard',
    children: [
      {
        id: 'crm-dashboard',
        label: 'shared.sidebar.crm_dashboard',
        icon: BarChart3,
        path: '/crm/dashboard',
      },
      {
        id: 'crm-customers',
        label: 'shared.sidebar.crm_customers',
        icon: Users,
        path: '/crm/customers',
      },
      {
        id: 'crm-contacts',
        label: 'shared.sidebar.crm_contacts',
        icon: Users,
        path: '/crm/contacts',
      },
      {
        id: 'crm-opportunities',
        label: 'shared.sidebar.crm_opportunities',
        icon: Target,
        path: '/crm/opportunities',
      },
      {
        id: 'crm-interactions',
        label: 'shared.sidebar.crm_interactions',
        icon: FileText,
        path: '/crm/interactions',
      },
    ],
  },
  {
    id: 'qms',
    label: 'shared.sidebar.qms',
    icon: ShieldCheck,
    path: '/qms/dashboard',
    children: [
      {
        id: 'qms-dashboard',
        label: 'shared.sidebar.qms_dashboard',
        icon: BarChart3,
        path: '/qms/dashboard',
      },
      {
        id: 'qms-inspection',
        label: 'shared.sidebar.qms_inspection',
        icon: ShieldCheck,
        path: '/qms/inspection',
      },
      {
        id: 'qms-nonconformance',
        label: 'shared.sidebar.qms_nonconformance',
        icon: AlertTriangle,
        path: '/qms/nonconformance',
      },
      { id: 'qms-eightd', label: 'shared.sidebar.qms_eightd', icon: FileText, path: '/qms/eightd' },
      {
        id: 'qms-audit',
        label: 'shared.sidebar.qms_audit',
        icon: FileText,
        path: '/qms/audit-management',
      },
    ],
  },
  // S8: 补 EHS 模块入口（URL 直达此前已 200，菜单未注册）
  {
    id: 'ehs',
    label: 'shared.config.ehs_name',
    icon: ShieldCheck,
    path: '/ehs/dashboard',
    children: [
      {
        id: 'ehs-dashboard',
        label: 'shared.sidebar.ehs_dashboard',
        icon: BarChart3,
        path: '/ehs/dashboard',
      },
      {
        id: 'ehs-accident',
        label: 'shared.sidebar.ehs_accident',
        icon: AlertTriangle,
        path: '/ehs/accident',
      },
      {
        id: 'ehs-hazard',
        label: 'shared.sidebar.ehs_hazard',
        icon: ShieldCheck,
        path: '/ehs/hazard',
      },
      {
        id: 'ehs-training',
        label: 'shared.sidebar.ehs_training',
        icon: BookOpen,
        path: '/ehs/training',
      },
    ],
  },
  // S8: 补 LIMS 模块入口
  {
    id: 'lims',
    label: 'shared.config.lims_name',
    icon: FlaskConical,
    path: '/lims/dashboard',
    children: [
      {
        id: 'lims-dashboard',
        label: 'shared.sidebar.lims_dashboard',
        icon: BarChart3,
        path: '/lims/dashboard',
      },
      {
        id: 'lims-sample',
        label: 'shared.sidebar.lims_sample',
        icon: Package,
        path: '/lims/sample',
      },
      {
        id: 'lims-task',
        label: 'shared.sidebar.lims_task',
        icon: ClipboardList,
        path: '/lims/task',
      },
      {
        id: 'lims-instrument',
        label: 'shared.sidebar.lims_instrument',
        icon: Cpu,
        path: '/lims/instrument',
      },
    ],
  },
  {
    id: 'wms',
    label: 'shared.sidebar.wms',
    icon: Box,
    path: '/wms/dashboard',
    children: [
      {
        id: 'wms-dashboard',
        label: 'shared.sidebar.wms_dashboard',
        icon: BarChart3,
        path: '/wms/dashboard',
      },
      {
        id: 'wms-inbound',
        label: 'shared.sidebar.wms_inbound',
        icon: Package,
        path: '/wms/inbound-order',
      },
      {
        id: 'wms-outbound',
        label: 'shared.sidebar.wms_outbound',
        icon: Package,
        path: '/wms/outbound-order',
      },
      {
        id: 'wms-inventory',
        label: 'shared.sidebar.wms_inventory',
        icon: Boxes,
        path: '/wms/inventory',
      },
      {
        id: 'wms-transfer',
        label: 'shared.sidebar.wms_transfer',
        icon: Truck,
        path: '/wms/transfer',
      },
    ],
  },
  // S8: 补 TMS 模块入口
  {
    id: 'tms',
    label: 'shared.config.tms_name',
    icon: Truck,
    path: '/tms/dashboard',
    children: [
      {
        id: 'tms-dashboard',
        label: 'shared.sidebar.tms_dashboard',
        icon: BarChart3,
        path: '/tms/dashboard',
      },
      {
        id: 'tms-shipments',
        label: 'shared.sidebar.tms_shipments',
        icon: Truck,
        path: '/tms/shipments',
      },
      {
        id: 'tms-routes',
        label: 'shared.sidebar.tms_routes',
        icon: Map,
        path: '/tms/routes',
      },
      {
        id: 'tms-vehicles',
        label: 'shared.sidebar.tms_vehicles',
        icon: Box,
        path: '/tms/vehicles',
      },
    ],
  },
  {
    id: 'bi',
    label: 'shared.sidebar.bi',
    icon: BarChart3,
    path: '/bi/dashboard',
    children: [
      {
        id: 'bi-dashboard',
        label: 'shared.sidebar.bi_dashboard',
        icon: BarChart3,
        path: '/bi/dashboard',
      },
      {
        id: 'bi-analytics',
        label: 'shared.sidebar.bi_analytics',
        icon: TrendingUp,
        path: '/bi/analytics',
      },
      {
        id: 'bi-comparison',
        label: 'shared.sidebar.bi_comparison',
        icon: Target,
        path: '/bi/comparison',
      },
      { id: 'bi-report', label: 'shared.sidebar.bi_report', icon: FileText, path: '/bi/report' },
      {
        id: 'bi-visualization',
        label: 'shared.sidebar.bi_visualization',
        icon: BarChart3,
        path: '/bi/visualization',
      },
      {
        id: 'bi-data-source',
        label: 'shared.sidebar.bi_data_source',
        icon: Package,
        path: '/bi/data-source',
      },
      { id: 'bi-dataset', label: 'shared.sidebar.bi_dataset', icon: Boxes, path: '/bi/dataset' },
    ],
  },
  {
    id: 'gis',
    label: 'shared.sidebar.gis',
    icon: Map,
    path: '/gis/dashboard',
    children: [
      {
        id: 'gis-dashboard',
        label: 'shared.sidebar.gis_dashboard',
        icon: Map,
        path: '/gis/dashboard',
      },
      { id: 'gis-map', label: 'shared.sidebar.gis_map', icon: Map, path: '/gis/map' },
      {
        id: 'gis-tracking',
        label: 'shared.sidebar.gis_tracking',
        icon: Truck,
        path: '/gis/tracking',
      },
      { id: 'gis-fence', label: 'shared.sidebar.gis_fence', icon: ShieldCheck, path: '/gis/fence' },
    ],
  },
  {
    id: 'doc',
    label: 'shared.sidebar.doc',
    icon: FileText,
    path: '/doc/dashboard',
    children: [
      {
        id: 'doc-dashboard',
        label: 'shared.sidebar.doc_dashboard',
        icon: BarChart3,
        path: '/doc/dashboard',
      },
      { id: 'doc-list', label: 'shared.sidebar.doc_list', icon: FileText, path: '/doc/list' },
      {
        id: 'doc-documents',
        label: 'shared.sidebar.doc_documents',
        icon: FileText,
        path: '/doc/documents',
      },
      {
        id: 'doc-knowledge',
        label: 'shared.sidebar.doc_knowledge',
        icon: BookOpen,
        path: '/doc/knowledge-base',
      },
    ],
  },
  {
    id: 'im',
    label: 'shared.sidebar.im',
    icon: MessageSquare,
    // P5: 徽标由未读数 store 动态注入，无未读时不渲染（不再硬编码残留数字 3）
    path: '/im/dashboard',
    children: [
      {
        id: 'im-dashboard',
        label: 'shared.sidebar.im_dashboard',
        icon: BarChart3,
        path: '/im/dashboard',
      },
      { id: 'im-mail', label: 'shared.sidebar.im_mail', icon: Mail, path: '/im/mail' },
    ],
  },
  {
    id: 'hrm',
    label: 'shared.sidebar.hrm',
    icon: Users,
    path: '/hrm/dashboard',
    children: [
      {
        id: 'hrm-dashboard',
        label: 'shared.sidebar.hrm_dashboard',
        icon: BarChart3,
        path: '/hrm/dashboard',
      },
      {
        id: 'hrm-employees',
        label: 'shared.sidebar.hrm_employees',
        icon: Users,
        path: '/hrm/employees',
      },
      {
        id: 'hrm-organization',
        label: 'shared.sidebar.hrm_organization',
        icon: Layers,
        path: '/hrm/organization',
      },
      {
        id: 'hrm-attendance',
        label: 'shared.sidebar.hrm_attendance',
        icon: Clock,
        path: '/hrm/attendance',
      },
      {
        id: 'hrm-payroll',
        label: 'shared.sidebar.hrm_payroll',
        icon: DollarSign,
        path: '/hrm/payroll',
      },
      {
        id: 'hrm-performance',
        label: 'shared.sidebar.hrm_performance',
        icon: Target,
        path: '/hrm/performance',
      },
    ],
  },
  {
    id: 'finance',
    label: 'shared.sidebar.finance',
    icon: DollarSign,
    path: '/finance/dashboard',
    children: [
      {
        id: 'finance-dashboard',
        label: 'shared.sidebar.finance_dashboard',
        icon: BarChart3,
        path: '/finance/dashboard',
      },
      {
        id: 'finance-ledger',
        label: 'shared.sidebar.finance_ledger',
        icon: BookOpen,
        path: '/finance/ledger',
      },
      {
        id: 'finance-vouchers',
        label: 'shared.sidebar.finance_vouchers',
        icon: FileText,
        path: '/finance/vouchers',
      },
      {
        id: 'finance-receivable',
        label: 'shared.sidebar.finance_receivable',
        icon: TrendingUp,
        path: '/finance/receivable-payable',
      },
      {
        id: 'finance-assets',
        label: 'shared.sidebar.finance_assets',
        icon: Package,
        path: '/finance/assets',
      },
      {
        id: 'finance-budget',
        label: 'shared.sidebar.finance_budget',
        icon: Target,
        path: '/finance/budget',
      },
      {
        id: 'finance-reports',
        label: 'shared.sidebar.finance_reports',
        icon: BarChart3,
        path: '/finance/reports',
      },
    ],
  },
  {
    id: 'admin',
    label: 'shared.sidebar.admin',
    icon: Settings,
    path: '/admin/dashboard',
    children: [
      {
        id: 'admin-dashboard',
        label: 'shared.sidebar.admin_dashboard',
        icon: BarChart3,
        path: '/admin/dashboard',
      },
      {
        id: 'admin-account',
        label: 'shared.sidebar.admin_account',
        icon: Users,
        path: '/iam/user',
      },
      {
        id: 'admin-permission',
        label: 'shared.sidebar.admin_permission',
        icon: ShieldCheck,
        path: '/admin/permission-audit',
      },
      {
        id: 'admin-audit-log',
        label: 'shared.sidebar.admin_audit_log',
        icon: FileText,
        path: '/admin/audit-log',
      },
      {
        id: 'admin-monitor',
        label: 'shared.sidebar.admin_monitor',
        icon: BarChart3,
        path: '/admin/monitor',
      },
      {
        id: 'admin-settings',
        label: 'shared.sidebar.admin_settings',
        icon: Settings,
        path: '/admin/system-settings',
      },
    ],
  },
  {
    id: 'pm',
    label: 'shared.sidebar.pm',
    icon: ClipboardList,
    path: '/pm/dashboard',
    children: [
      {
        id: 'pm-dashboard',
        label: 'shared.sidebar.pm_dashboard',
        icon: BarChart3,
        path: '/pm/dashboard',
      },
      {
        id: 'pm-projects',
        label: 'shared.sidebar.pm_projects',
        icon: ClipboardList,
        path: '/pm/projects',
      },
      {
        id: 'pm-tasks',
        label: 'shared.sidebar.pm_tasks',
        icon: ClipboardList,
        path: '/pm/task-kanban',
      },
      {
        id: 'pm-timeline',
        label: 'shared.sidebar.pm_timeline',
        icon: TrendingUp,
        path: '/pm/timeline',
      },
      {
        id: 'pm-contracts',
        label: 'shared.sidebar.pm_contracts',
        icon: FileText,
        path: '/pm/contracts',
      },
      {
        id: 'pm-resources',
        label: 'shared.sidebar.pm_resources',
        icon: Users,
        path: '/pm/resources',
      },
    ],
  },
  // S8: 补 RD（研发管理）模块入口
  {
    id: 'rd',
    label: 'shared.config.rd_name',
    icon: Beaker,
    path: '/rd/dashboard',
    children: [
      {
        id: 'rd-dashboard',
        label: 'shared.sidebar.rd_dashboard',
        icon: BarChart3,
        path: '/rd/dashboard',
      },
      {
        id: 'rd-project',
        label: 'shared.sidebar.rd_project',
        icon: ClipboardList,
        path: '/rd/project',
      },
      {
        id: 'rd-experiment',
        label: 'shared.sidebar.rd_experiment',
        icon: FlaskConical,
        path: '/rd/experiment',
      },
      {
        id: 'rd-formula',
        label: 'shared.sidebar.rd_formula',
        icon: Beaker,
        path: '/rd/formula',
      },
    ],
  },
  {
    id: 'asset',
    label: 'shared.sidebar.asset',
    icon: Package,
    path: '/asset/dashboard',
    children: [
      {
        id: 'asset-dashboard',
        label: 'shared.sidebar.asset_dashboard',
        icon: BarChart3,
        path: '/asset/dashboard',
      },
      { id: 'asset-list', label: 'shared.sidebar.asset_list', icon: Package, path: '/asset/list' },
      {
        id: 'asset-categories',
        label: 'shared.sidebar.asset_categories',
        icon: Layers,
        path: '/asset/categories',
      },
      {
        id: 'asset-depreciation',
        label: 'shared.sidebar.asset_depreciation',
        icon: TrendingDown,
        path: '/asset/depreciation',
      },
      {
        id: 'asset-transfers',
        label: 'shared.sidebar.asset_transfers',
        icon: Truck,
        path: '/asset/transfers',
      },
    ],
  },
  {
    id: 'pdm',
    label: 'shared.sidebar.pdm',
    icon: Boxes,
    path: '/pdm/dashboard',
    children: [
      {
        id: 'pdm-dashboard',
        label: 'shared.sidebar.pdm_dashboard',
        icon: BarChart3,
        path: '/pdm/dashboard',
      },
      {
        id: 'pdm-product',
        label: 'shared.sidebar.pdm_product',
        icon: Package,
        path: '/pdm/product',
      },
      {
        id: 'pdm-material',
        label: 'shared.sidebar.pdm_material',
        icon: Package,
        path: '/pdm/material',
      },
      { id: 'pdm-bom', label: 'shared.sidebar.pdm_bom', icon: Layers, path: '/pdm/bom' },
      { id: 'pdm-process', label: 'shared.sidebar.pdm_process', icon: Cpu, path: '/pdm/process' },
      {
        id: 'pdm-change',
        label: 'shared.sidebar.pdm_change',
        icon: TrendingUp,
        path: '/pdm/change',
      },
    ],
  },
];

// 底部菜单项已移除：系统设置在左侧"系统管理"二级菜单，个人中心在右上角头像下拉菜单
const footerItems: NavItem[] = [];

// 路径到导航项 ID 的映射

export const GlobalLayoutV3: React.FC<GlobalLayoutV3Props> = ({ children, fullWidth = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // P1-4 前端权限守卫：侧边栏菜单按权限过滤（无权限的模块组/入口不展示）
  const { checkPermission } = usePermission();

  // P5: 未读数轮询写入 store，消息中心徽标实时跟随；无未读时徽标自动隐藏
  const unreadCount = useUnreadNotificationCount();
  const setUnread = useSetUnreadNotificationCount();
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await getUnreadCount();
        if (!cancelled && res.success) {
          setUnread(typeof res.data === 'number' ? res.data : Number(res.data) || 0);
        }
      } catch {
        // 接口不可用时保持当前值，不打断渲染
      }
    };
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [setUnread]);

  // 将未读数注入消息中心菜单项徽标，0/undefined 时不展示；
  // P1-4：菜单按权限过滤（无权限映射的 path 恒显示；有映射而用户无权限则整组/项隐藏）
  const items = useMemo<NavItem[]>(
    () =>
      navItems
        .filter(
          (item) =>
            !item.path ||
            !MENU_PERMISSIONS[item.path] ||
            checkPermission(MENU_PERMISSIONS[item.path])
        )
        .map((item) =>
          item.id === 'im' ? { ...item, badge: unreadCount > 0 ? unreadCount : undefined } : item
        ),
    [unreadCount, checkPermission]
  );

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
    console.info('Command palette opened');
  };

  const handleNotificationsOpen = () => {
    navigate('/im');
  };

  const handleSettingsOpen = () => {
    navigate('/admin/system-settings');
  };

  const handleProfileOpen = () => {
    navigate('/profile');
  };

  return (
    <AppShell
      title='TOPEMS'
      items={items}
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
