import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  Box,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cpu,
  DollarSign,
  Factory,
  FileText,
  Home,
  Layers,
  Map,
  MessageSquare,
  Package,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  active?: boolean;
  /** 子菜单（两级菜单） */
  children?: NavItem[];
  /** 点击后的导航路径 */
  path?: string;
}

export interface SideRailProps extends React.HTMLAttributes<HTMLElement> {
  items?: NavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  footerItems?: NavItem[];
  /** 是否展开侧边栏（显示完整菜单文字） */
  expanded?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

const defaultItems: NavItem[] = [
  { id: 'home', label: 'shared.sidebar.home', icon: Home, path: '/dashboard' },
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
        id: 'erp-purchase',
        label: 'shared.sidebar.erp_purchase',
        icon: ShoppingCart,
        path: '/erp/purchase-order',
      },
      {
        id: 'erp-sales',
        label: 'shared.sidebar.erp_sales',
        icon: TrendingUp,
        path: '/erp/sales-order',
      },
      {
        id: 'erp-inventory',
        label: 'shared.sidebar.erp_inventory',
        icon: Package,
        path: '/erp/inventory',
      },
      {
        id: 'erp-finance',
        label: 'shared.sidebar.erp_finance',
        icon: DollarSign,
        path: '/erp/finance',
      },
    ],
  },
  {
    id: 'scm',
    label: 'shared.sidebar.scm',
    icon: Truck,
    path: '/scm/dashboard',
    children: [
      {
        id: 'scm-supplier',
        label: 'shared.sidebar.scm_supplier',
        icon: Truck,
        path: '/scm/suppliers',
      },
      {
        id: 'scm-purchase',
        label: 'shared.sidebar.scm_purchase',
        icon: ShoppingCart,
        path: '/scm/purchasing',
      },
      {
        id: 'scm-logistics',
        label: 'shared.sidebar.scm_logistics',
        icon: Truck,
        path: '/scm/logistics',
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
        id: 'crm-customers',
        label: 'shared.sidebar.crm_customers',
        icon: Users,
        path: '/crm/customers',
      },
      {
        id: 'crm-opportunities',
        label: 'shared.sidebar.crm_opportunities',
        icon: Target,
        path: '/crm/opportunities',
      },
      {
        id: 'crm-contracts',
        label: 'shared.sidebar.crm_contracts',
        icon: FileText,
        path: '/crm/contracts',
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
      {
        id: 'qms-eight-d',
        label: 'shared.sidebar.qms_eight_d',
        icon: FileText,
        path: '/qms/eight-d',
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
    ],
  },
  { id: 'bi', label: 'shared.sidebar.bi', icon: BarChart3, path: '/bi/dashboard' },
  { id: 'gis', label: 'shared.sidebar.gis', icon: Map, path: '/gis/dashboard' },
  { id: 'doc', label: 'shared.sidebar.doc', icon: FileText, path: '/doc/list' },
  { id: 'im', label: 'shared.sidebar.im', icon: MessageSquare, badge: 3, path: '/im' },
];

export const SideRail: React.FC<SideRailProps> = ({
  items = defaultItems,
  activeId,
  onItemClick,
  footerItems,
  expanded = true,
  className,
  style,
