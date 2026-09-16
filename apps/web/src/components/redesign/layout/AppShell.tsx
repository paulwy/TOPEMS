import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopBar, type TopBarProps } from './TopBar';
import { SideRail, type SideRailProps } from './SideRail';

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
  const [sidebarExpanded, setSidebarExpanded] = useState(defaultSidebarExpanded);
  const location = useLocation();
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const sidebarWidth = sidebarExpanded ? '280px' : '72px';

  // 自动生成面包屑
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: '首页', onClick: () => navigate('/dashboard') },
    ];

    // 查找当前路径对应的菜单
    const findPathInItems = (
      menuItems: typeof items,
      currentPath: string
    ): { parentLabel: string; childLabel?: string } | null => {
      for (const item of menuItems || []) {
        if (item.path === currentPath) {
          return { parentLabel: item.label };
        }
        if (item.children) {
          for (const child of item.children) {
            if (child.path === currentPath) {
              return { parentLabel: item.label, childLabel: child.label };
            }
          }
        }
      }
      return null;
    };

    const result = findPathInItems(items || [], path);
    if (result) {
      crumbs.push({ label: result.parentLabel });
      if (result.childLabel) {
        crumbs.push({ label: result.childLabel });
      }
    } else {
      // 如果找不到，使用路径片段
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        crumbs.push({ label: segments[segments.length - 1] });
      }
    }

    return crumbs;
  }, [location.pathname, items, navigate]);

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
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          crumb.onClick?.();
                        }}
                        style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                      >
                        {crumb.label}
                      </a>
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
