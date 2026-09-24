import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TopBar, type TopBarProps } from './TopBar';
import i18n from '@/i18n';
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
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const v = localStorage.getItem('topems.sidebarExpanded');
      if (v !== null) return v === 'true';
    } catch {
      /* ignore */
    }
    return defaultSidebarExpanded;
  });
  const location = useLocation();
  const FALLBACK_SEGMENT_LABELS: Record<string, string> = {
    modules: i18n.t('shared.app_shell_breadcrumb.modules'),
    profile: i18n.t('shared.app_shell_breadcrumb.profile'),
    favorites: i18n.t('shared.app_shell_breadcrumb.favorites'),
    comments: i18n.t('shared.app_shell_breadcrumb.comments'),
    attachments: i18n.t('shared.app_shell_breadcrumb.attachments'),
    help: i18n.t('shared.app_shell_breadcrumb.help'),
  };

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

  // 自动生成面包屑
  const breadcrumbs = useMemo(() => {
    const path = location.pathname;
    const crumbs: Array<{ label: string; onClick?: () => void }> = [
      { label: i18n.t('shared.app_shell_breadcrumb.home'), onClick: () => navigate('/dashboard') },
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
      // label 可能是 i18n key（如 shared.sidebar.mes），统一翻译；非 key 的原始文本原样返回
      crumbs.push({ label: i18n.t(result.parentLabel) });
      if (result.childLabel) {
        crumbs.push({ label: i18n.t(result.childLabel) });
      }
    } else {
      // 如果找不到，使用路径片段（已知平台页映射为中文标题）
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        crumbs.push({
          label:
            FALLBACK_SEGMENT_LABELS[last] ||
            i18n.t(`shared.app_shell_breadcrumb.${last}`, {
              defaultValue: last,
            }),
        });
      }
    }

    return crumbs;
  }, [location.pathname, items, navigate, i18n.language]);

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
