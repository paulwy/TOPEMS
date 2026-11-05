import React, { useEffect, useMemo, useState } from 'react';
import styles from './SideRail.module.css';
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
  /** 二级语义分组（P2-2）：overview/master/process/business/analytics/report/setting/other */
  group?: string;
  /** 点击后的导航路径 */
  path?: string;
}

/** L3 菜单子组标准顺序（与 packages/app-shell navigation-types 的 NavGroup 枚举对齐） */
const NAV_GROUP_ORDER: Record<string, number> = {
  overview: 0,
  master: 10,
  process: 20,
  business: 30,
  analytics: 40,
  report: 50,
  setting: 60,
  other: 99,
};

/** 侧边栏展开状态 localStorage key（仅前端记忆展开位置，不做后端存储） */
const SIDEBAR_EXPAND_STORAGE_KEY = 'topems.sidebar.expand.v1';

function loadExpandState(): { modules: string[]; groups: string[] } {
  try {
    const raw = localStorage.getItem(SIDEBAR_EXPAND_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const state = parsed as { modules?: unknown; groups?: unknown };
        return {
          modules: Array.isArray(state.modules) ? state.modules.map(String) : [],
          groups: Array.isArray(state.groups) ? state.groups.map(String) : [],
        };
      }
    }
  } catch {
    // 存储不可用或内容损坏：回退默认折叠策略
  }
  return { modules: [], groups: [] };
}

function persistExpandState(modules: Set<string>, groups: Set<string>): void {
  try {
    localStorage.setItem(
      SIDEBAR_EXPAND_STORAGE_KEY,
      JSON.stringify({ modules: [...modules], groups: [...groups] })
    );
  } catch {
    // 忽略存储异常，不影响导航可用性
  }
}

/**
 * 把模块的二级菜单按 group 聚合成分组块（按 NavGroup 标准顺序排列）。
 * 未声明 group 的项归入 other，保持其在原数组中的相对顺序。
 */
function groupChildren(children: NavItem[]): Array<{ group: string; items: NavItem[] }> {
  // 注意：本文件从 lucide-react 导入了 Map 图标，会遮蔽全局 Map 构造函数
  const buckets = new globalThis.Map<string, NavItem[]>();
  for (const child of children) {
    const group = child.group || 'other';
    const bucket = buckets.get(group);
    if (bucket) {
      bucket.push(child);
    } else {
      buckets.set(group, [child]);
    }
  }
  const groups: string[] = Array.from(buckets.keys());
  return groups
    .sort((a, b) => (NAV_GROUP_ORDER[a] ?? 99) - (NAV_GROUP_ORDER[b] ?? 99))
    .map((group) => ({ group, items: buckets.get(group) as NavItem[] }));
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
        id: 'mes-work-order',
        label: 'shared.sidebar.mes_work_orders',
        icon: ClipboardList,
        path: '/mes/work-order',
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

  // 管理展开的菜单组（一级模块）与模块内 group 分组（二级，P2-2）
  // 初始状态读取 localStorage，实现跨会话记忆用户展开位置
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(loadExpandState().modules)
  );
  const [expandedSubGroups, setExpandedSubGroups] = useState<Set<string>>(
    () => new Set(loadExpandState().groups)
  );

  // 展开状态变化后持久化（toggle 与自动展开共用）
  useEffect(() => {
    persistExpandState(expandedGroups, expandedSubGroups);
  }, [expandedGroups, expandedSubGroups]);

  // 默认展开策略：当前所在模块与其 group 自动展开（用户手动折叠后仍保留选择）
  useEffect(() => {
    if (!activeId) return;
    const [moduleCode] = activeId.split(':');
    const moduleItem = resolvedItems.find((item) => item.id === moduleCode);
    const activeChild = moduleItem?.children?.find((child) => child.id === activeId);
    setExpandedGroups((prev) => (prev.has(moduleCode) ? prev : new Set(prev).add(moduleCode)));
    if (activeChild?.group) {
      const subKey = `${moduleCode}:${activeChild.group}`;
      setExpandedSubGroups((prev) => (prev.has(subKey) ? prev : new Set(prev).add(subKey)));
    }
    // resolvedItems 仅为查找当前 group 归属，不是展开状态来源，不参与重算
  }, [activeId]);

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

  const toggleSubGroup = (key: string) => {
    setExpandedSubGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
        boxShadow: 'var(--shadow-side)',
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'width var(--duration-base) var(--ease-out)',
        ...style,
      }}
      aria-label='Main navigation'
      {...rest}
    >
      <div className={styles.il1}>
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
                  color: showActive ? 'var(--text-on-accent)' : 'var(--text-primary)',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                  cursor: 'pointer',
                  textAlign: expanded ? 'left' : 'center',
                }}
              >
                <div className={styles.il2}>
                  <Icon
                    size={20}
                    strokeWidth={showActive ? 2.5 : 2}
                    style={{
                      flexShrink: 0,
                      color: showActive ? 'var(--text-on-accent)' : undefined,
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
                        color: showActive ? 'var(--text-on-accent)' : undefined,
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
                  <span
                    style={{
                      color: showActive ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
              </button>

              {/* 子菜单：按 group 语义分组 + 二级折叠（P2-2） */}
              {hasChildren && expanded && isExpanded && (
                <div className={styles.il3}>
                  {(() => {
                    const groups = groupChildren(item.children!);
                    // 仅一组子项时不显示组头，保持两级菜单的简洁观感；
                    // 多组时每组一个可折叠标题（overview → setting 标准顺序）
                    const showGroupHeaders = groups.length > 1;
                    return groups.map(({ group, items: groupItems }) => {
                      const subKey = `${item.id}:${group}`;
                      const subExpanded = showGroupHeaders ? expandedSubGroups.has(subKey) : true;
                      return (
                        <div key={group}>
                          {showGroupHeaders && (
                            <button
                              type='button'
                              onClick={() => toggleSubGroup(subKey)}
                              aria-expanded={subExpanded}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                height: '26px',
                                padding: '0 var(--space-3)',
                                margin: '2px 0',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-tertiary)',
                                fontSize: 'var(--text-xs)',
                                fontWeight: 'var(--font-medium)',
                                letterSpacing: '0.04em',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'color var(--duration-fast) var(--ease-out)',
                              }}
                            >
                              <span>{t(`shared.nav_group.${group}`, group)}</span>
                              {subExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          )}
                          {subExpanded &&
                            groupItems.map((child) => {
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
                                    backgroundColor: isChildActive
                                      ? 'var(--bg-hover)'
                                      : 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    color: isChildActive
                                      ? 'var(--accent-primary)'
                                      : 'var(--text-secondary)',
                                    fontSize: 'var(--text-sm)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all var(--duration-fast) var(--ease-out)',
                                  }}
                                >
                                  <ChildIcon
                                    size={16}
                                    className={styles.il4}
                                  />
                                  <span className={styles.il5}>{child.label}</span>
                                </button>
                              );
                            })}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footerItems && footerItems.length > 0 && (
        <div className={styles.il6}>
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
                  className={styles.il7}
                />
                {expanded && <span className={styles.il8}>{item.label}</span>}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
