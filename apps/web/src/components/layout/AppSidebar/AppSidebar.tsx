import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Paper, Box, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { useServiceStatus } from '@/hooks/useServiceStatus';
import { useAuthAvatarUrl, useAuthDisplayName, useAuthUserRole } from '@/store/authStore';
import { extractInitials } from '@/layouts/components';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem, ModuleCardConfig } from '@/lib/navigation/types';
import { SUITE_GROUPS } from '@/lib/navigation/types';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

import { SidebarSearch } from './SidebarSearch';
import { SidebarFavorites } from './SidebarFavorites';
import { SidebarModuleTree } from './SidebarModuleTree';
import { SidebarUserPanel } from './SidebarUserPanel';
import { isPlatformPath, getModuleFromPath } from './shared';

export interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  forceVisible?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  forceVisible,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPermission } = usePermission();
  const { serviceStatuses } = useServiceStatus();
  const displayName = useAuthDisplayName();
  const avatarUrl = useAuthAvatarUrl();
  const userRole = useAuthUserRole();
  const initials = extractInitials(displayName);

  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [, setRecentVisits] = useState<Array<NavItem>>([]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('sidebar-favorites');
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch {
        // ignore
      }
    }

    const savedRecent = localStorage.getItem('sidebar-recent');
    if (savedRecent) {
      try {
        const recentItems = JSON.parse(savedRecent) as NavItem[];
        setRecentVisits(recentItems.slice(0, 5));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (location.pathname === DASHBOARD_PATHS.dashboard) return;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length < 2) return;

    const module = pathSegments[0];
    const sidebarItems = navigationRegistryV2.getSidebarNavItems(module);
    const currentItem = sidebarItems.find(
      (item) => item.path === location.pathname || location.pathname.startsWith(`${item.path}/`)
    );

    if (currentItem) {
      setRecentVisits((prev) => {
        const filtered = prev.filter((item) => item.path !== currentItem.path);
        const updated = [currentItem, ...filtered].slice(0, 5);
        localStorage.setItem('sidebar-recent', JSON.stringify(updated));
        return updated;
      });
    }
  }, [location.pathname]);

  const toggleFavorite = useCallback((item: NavItem) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(item.path || item.code)) {
        next.delete(item.path || item.code);
      } else {
        next.add(item.path || item.code);
      }
      localStorage.setItem('sidebar-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const currentModule = useMemo(() => {
    if (isPlatformPath(location.pathname)) return null;
    return getModuleFromPath(location.pathname);
  }, [location.pathname]);

  const moduleName = useMemo(() => {
    if (!currentModule) return '';
    const module = navigationRegistryV2.getModule(currentModule);
    if (module) return module.name;
    const topItems = navigationRegistryV2.getTopNavItems(() => true);
    const found = topItems.find((item) => item.code === currentModule);
    return found?.label || currentModule;
  }, [currentModule]);

  const [groupedModules, setGroupedModules] = useState<Record<string, NavItem[]>>({});
  const [suiteOrder, setSuiteOrder] = useState<string[]>([]);

  const checkPermissionRef = useRef(checkPermission);
  useEffect(() => {
    checkPermissionRef.current = checkPermission;
  }, [checkPermission]);

  const updateGroupedNavItems = useCallback(() => {
    const currentCheckPermission = checkPermissionRef.current;
    const groupedBySuite =
      navigationRegistryV2.getNavItemsGroupedByBusinessDomain(currentCheckPermission);

    const result: Record<string, NavItem[]> = {};
    const orders: Array<{ suite: string; order: number }> = [];

    Object.entries(groupedBySuite).forEach(([suite, modules]) => {
      const suiteKey = suite as keyof typeof SUITE_GROUPS;
      const suiteInfo = SUITE_GROUPS[suiteKey] || SUITE_GROUPS.other;
      orders.push({ suite, order: suiteInfo.order });

      result[suite] = modules.map((m: ModuleCardConfig) => ({
        code: m.code,
        label: m.name,
        icon: m.icon,
        path: m.path,
        permission: m.permission,
        order: m.order,
        moduleCode: m.code,
        moduleName: m.name,
        badge: m.status === 'beta' ? 'Beta' : m.status === 'new' ? 'New' : undefined,
      }));
    });

    orders.sort((a, b) => a.order - b.order);
    setSuiteOrder(orders.map((o) => o.suite));
    setGroupedModules(result);
  }, []);

  useEffect(() => {
    updateGroupedNavItems();
    navigationRegistryV2.emitter.on('navigationUpdated', updateGroupedNavItems);
    return () => {
      navigationRegistryV2.emitter.off('navigationUpdated', updateGroupedNavItems);
    };
  }, [updateGroupedNavItems]);

  const moduleNavItems = useMemo<NavItem[]>(() => {
    if (!currentModule) return [];
    return navigationRegistryV2.getSidebarNavItems(currentModule, checkPermission);
  }, [currentModule, checkPermission]);

  return (
    <Paper
      role='navigation'
      aria-label='主导航'
      elevation={0}
      sx={{
        width: collapsed ? 64 : 220,
        transition: (theme) =>
          `width 300ms ${theme.transitions.easing.sharp}, box-shadow 200ms ${theme.transitions.easing.easeInOut}`,
        height: forceVisible ? '100%' : 'calc(100vh - 56px)',
        position: forceVisible ? 'static' : 'sticky',
        top: forceVisible ? 'auto' : 56,
        flexShrink: 0,
        display: forceVisible || isTablet ? 'flex' : { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        overflow: 'hidden',
        ...(isTablet && {
          zIndex: 100,
        }),
      }}
    >
      {!collapsed && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <SidebarSearch collapsed={collapsed} />
          <SidebarFavorites
            collapsed={collapsed}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        </Box>
      )}

      <SidebarModuleTree
        collapsed={collapsed}
        currentModule={currentModule}
        moduleName={moduleName}
        groupedModules={groupedModules}
        suiteOrder={suiteOrder}
        moduleNavItems={moduleNavItems}
        serviceStatuses={serviceStatuses}
        checkPermission={checkPermission}
      />

      <SidebarUserPanel
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        displayName={displayName}
        avatarUrl={avatarUrl}
        userRole={userRole}
        initials={initials}
      />
    </Paper>
  );
};

export default AppSidebar;
