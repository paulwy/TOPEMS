import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar, type TopBarProps } from './TopBar';
import i18n from '@/i18n';
import { SideRail, type SideRailProps } from './SideRail';
import { useAutoBreadcrumbs } from '@/hooks/useAutoBreadcrumbs';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

export interface AppShellProps extends TopBarProps, Omit<SideRailProps, 'title'> {
  children: React.ReactNode;
  fullWidth?: boolean;
  /** 侧边栏是否默认展开 */
  defaultSidebarExpanded?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  fullWidth = false,
  items,
  activeId,
  onItemClick,
  footerItems,
  defaultSidebarExpanded = true,
  ...topBarProps
}) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const v = localStorage.getItem('topems.sidebarExpanded');
      if (v !== null) return v === 'true';
    } catch {
      /* ignore */
    }
    return defaultSidebarExpanded;
  });
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('topems.sidebarExpanded', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sidebarWidth = sidebarExpanded ? '280px' : '72px';

  // 自动面包屑：统一走 useAutoBreadcrumbs（导航注册表链路，含 i18n 资源版本订阅），
  // 覆盖 sidebar 菜单之外的模块路由（如 /bi/data-analysis → 首页 / 数据决策 / 销售分析）
  const autoBreadcrumbs = useAutoBreadcrumbs({
    homePath: DASHBOARD_PATHS.dashboard,
    homeLabel: i18n.t('shared.app_shell_breadcrumb.home'),
  });
  const breadcrumbs = autoBreadcrumbs.map((crumb) => {
    const href = crumb.href;
    return {
      label: crumb.label,
      onClick: href ? () => navigate(href) : undefined,
    };
  });

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <TopBar
        {...topBarProps}
        onToggleSidebar={handleToggleSidebar}
        sidebarExpanded={sidebarExpanded}
      />
      <SideRail
        items={items}
        activeId={activeId}
        onItemClick={onItemClick}
        footerItems={footerItems}
        expanded={sidebarExpanded}
      />

      <main
        style={{
          marginLeft: sidebarWidth,
          marginTop: 'var(--topbar-height)',
          minHeight: 'calc(100vh - var(--topbar-height))',
          padding: 'var(--space-6)',
          transition: 'margin-left var(--duration-base) var(--ease-out)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: fullWidth ? 'none' : '1920px',
            margin: '0 auto',
          }}
        >
          {/* 自动面包屑 */}
          {breadcrumbs.length > 1 && (
            <nav
              aria-label='Breadcrumb'
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <ol
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {breadcrumbs.map((crumb, index) => (
                  <li
                    key={index}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                  >
                    {index > 0 && <span aria-hidden='true'>/</span>}
                    {crumb.onClick ? (
                      <button
                        type='button'
                        onClick={() => crumb.onClick?.()}
                        style={{
                          color: 'inherit',
                          textDecoration: 'none',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          font: 'inherit',
                          fontSize: 'inherit',
                        }}
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {children}
        </div>
      </main>
    </div>
  );
};
