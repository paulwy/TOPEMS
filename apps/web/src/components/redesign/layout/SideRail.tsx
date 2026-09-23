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
        path: '/wms/inbound-orders',
      },
      {
        id: 'wms-outbound',
        label: 'shared.sidebar.wms_outbound',
        icon: Package,
        path: '/wms/outbound-orders',
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
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  const { t } = useTranslation();

  // 菜单 label 支持 i18n key（如 'shared.sidebar.mes'）；非 key 的原始文本原样返回
  const translateItems = useMemo(
    () =>
      (list: NavItem[] | undefined): NavItem[] | undefined =>
        list?.map((item) => ({
          ...item,
          label: t(item.label),
          children: item.children?.map((child) => ({ ...child, label: t(child.label) })),
        })),
    [t]
  );
  const resolvedItems = translateItems(items) || [];
  const resolvedFooterItems = translateItems(footerItems) || [];

  const railWidth = expanded ? 'var(--siderail-expanded-width)' : 'var(--siderail-width)';

  // 管理展开的菜单组
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleItemClick = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      // 有子菜单：只展开/折叠，不自动导航
      toggleGroup(item.id);
    } else {
      // 没有子菜单：直接导航
      onItemClick?.(item.id);
    }
  };

  return (
    <nav
      className={clsx('redesign-siderail', className)}
      style={{
        position: 'fixed',
        top: 'var(--topbar-height)',
        left: 0,
        bottom: 0,
        zIndex: 'var(--z-sticky)',
        width: railWidth,
        display: 'flex',
        flexDirection: 'column',
        alignItems: expanded ? 'stretch' : 'center',
        padding: 'var(--space-3) 0',
        backgroundColor: 'var(--bg-elevated)',
        borderRight: '1px solid var(--border-default)',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width var(--duration-base) var(--ease-out)',
        ...style,
      }}
      aria-label='Main navigation'
      {...rest}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          width: '100%',
          padding: '0 var(--space-2)',
        }}
      >
        {resolvedItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id || item.active;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedGroups.has(item.id);
          const hasActiveChild =
            hasChildren && item.children!.some((child) => child.id === activeId);
          const showActive = isActive || hasActiveChild;

          return (
            <div key={item.id}>
              <button
                type='button'
                onClick={() => handleItemClick(item)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: expanded ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: expanded ? 'space-between' : 'center',
                  gap: 'var(--space-3)',
                  width: '100%',
                  margin: '0 var(--space-2)',
                  height: '44px',
                  padding: expanded ? '0 var(--space-3)' : 'var(--space-2)',
                  backgroundColor: showActive ? 'var(--accent-primary)' : 'transparent',
                  border: '1px solid transparent',
                  borderColor: showActive ? 'var(--accent-primary)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  color: showActive ? '#000000' : 'var(--text-primary)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  cursor: 'pointer',
                  textAlign: expanded ? 'left' : 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Icon
                    size={20}
                    strokeWidth={showActive ? 2.5 : 2}
                    style={{
                      flexShrink: 0,
                      color: showActive ? '#000000' : undefined,
                    }}
                  />
                  {expanded && (
                    <span
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: showActive ? 'var(--font-semibold)' : 'var(--font-normal)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: showActive ? '#000000' : undefined,
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>

                {item.badge !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: expanded ? '50%' : '6px',
                      right: expanded ? '8px' : '6px',
                      transform: expanded ? 'translateY(-50%)' : 'none',
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      fontWeight: 'var(--font-bold)',
                      color: 'var(--text-inverse)',
                      backgroundColor: 'var(--error-500)',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}

                {hasChildren && expanded && (
                  <span style={{ color: showActive ? '#000000' : 'var(--text-secondary)' }}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
              </button>

              {/* 子菜单 */}
              {hasChildren && expanded && isExpanded && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    marginTop: '4px',
                    marginLeft: '24px',
                    paddingLeft: '12px',
                    borderLeft: '1px solid var(--border-default)',
                  }}
                >
                  {item.children!.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = activeId === child.id;
                    return (
                      <button
                        key={child.id}
                        type='button'
                        onClick={() => onItemClick?.(child.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          width: '100%',
                          height: '36px',
                          padding: '0 var(--space-3)',
                          backgroundColor: isChildActive ? 'var(--bg-hover)' : 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          color: isChildActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontSize: 'var(--text-sm)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all var(--duration-fast) var(--ease-out)',
                        }}
                      >
                        <ChildIcon
                          size={16}
                          style={{ flexShrink: 0 }}
                        />
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {child.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footerItems && footerItems.length > 0 && (
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            width: '100%',
            padding: '0 var(--space-2)',
          }}
        >
          {resolvedFooterItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => onItemClick?.(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: expanded ? 'row' : 'column',
                  alignItems: 'center',
                  justifyContent: expanded ? 'flex-start' : 'center',
                  gap: 'var(--space-3)',
                  width: '100%',
                  height: '44px',
                  padding: expanded ? '0 var(--space-3)' : 'var(--space-2)',
                  backgroundColor: isActive ? 'var(--surface-3)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  textAlign: expanded ? 'left' : 'center',
                }}
              >
                <Icon
                  size={20}
                  style={{ flexShrink: 0 }}
                />
                {expanded && <span style={{ fontSize: 'var(--text-base)' }}>{item.label}</span>}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
