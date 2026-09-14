import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Box,
  ClipboardList,
  Factory,
  FileText,
  Home,
  Layers,
  Map,
  MessageSquare,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  active?: boolean;
}

export interface SideRailProps extends React.HTMLAttributes<HTMLElement> {
  items?: NavItem[];
  activeId?: string;
  onItemClick?: (id: string) => void;
  footerItems?: NavItem[];
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

const defaultItems: NavItem[] = [
  { id: 'home', label: '首页', icon: Home },
  { id: 'mes', label: '制造执行', icon: Factory },
  { id: 'erp', label: '企业资源', icon: Layers },
  { id: 'scm', label: '供应链', icon: Truck },
  { id: 'crm', label: '客户管理', icon: Users },
  { id: 'qms', label: '质量管理', icon: ShieldCheck },
  { id: 'wms', label: '仓储物流', icon: Box },
  { id: 'bi', label: '数据决策', icon: BarChart3 },
  { id: 'gis', label: '地理信息', icon: Map },
  { id: 'doc', label: '文档协同', icon: FileText },
  { id: 'im', label: '消息中心', icon: MessageSquare, badge: 3 },
  { id: 'tasks', label: '任务审批', icon: ClipboardList },
];

export const SideRail: React.FC<SideRailProps> = ({
  items = defaultItems,
  activeId,
  onItemClick,
  footerItems,
  className,
  style,
  action: _action, // 显式排除 action，避免传递给非 form 元素
  ...rest
}) => {
  return (
    <nav
      className={clsx('redesign-siderail', className)}
      style={{
        position: 'fixed',
        top: 'var(--topbar-height)',
        left: 0,
        bottom: 0,
        zIndex: 'var(--z-sticky)',
        width: 'var(--siderail-width)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-3) 0',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-default)',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...style,
      }}
      aria-label='Main navigation'
      {...rest}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          width: '100%',
          padding: '0 var(--space-2)',
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id || item.active;
          return (
            <button
              key={item.id}
              type='button'
              onClick={() => onItemClick?.(item.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
                width: '100%',
                height: '60px',
                padding: 'var(--space-2)',
                backgroundColor: isActive ? 'var(--surface-3)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-hover)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                transition: 'all var(--duration-fast) var(--ease-out)',
                cursor: 'pointer',
              }}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-normal)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
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
            </button>
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
          {footerItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => onItemClick?.(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-1)',
                  width: '100%',
                  height: '60px',
                  padding: 'var(--space-2)',
                  backgroundColor: isActive ? 'var(--surface-3)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
              >
                <Icon size={20} />
                <span style={{ fontSize: 'var(--text-xs)' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
