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

