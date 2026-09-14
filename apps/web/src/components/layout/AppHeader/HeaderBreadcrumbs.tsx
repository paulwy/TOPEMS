import { designTokens } from '@topems/tokens';
import React, { useMemo } from 'react';
import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import { Home, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import { SUITE_GROUPS } from '@/lib/navigation/types';
import type { NavItem, ModuleSuite } from '@/lib/navigation/types';
import { renderIcon } from '@/lib/iconMapping';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n from '@/i18n';

interface HeaderBreadcrumbsProps {
  /** 权限校验函数（透传 usePermission().checkPermission），用于控制各级面包屑跳转 */
  checkPermission?: (permission: string) => boolean;
}

/**
 * 面包屑增强（设计基准：四层导航模型 L1 业务域 > L2 模块 > L3 子组 > L4 页面）
 *
 * - L1 业务域：根据当前路由模块的 `suite` 定位，点击跳转该域首个模块首页（与 BusinessDomainTabs 联动）
 * - L2/L3/L4：来自 `navigationRegistryV2.getNavHierarchy()`，逐级可点击跳转
 * - 权限控制：存在 `permission` 且被拒绝的层级渲染为纯文本，不提供跳转
 * - 联动：当前路由变化时 L1 Tabs / 侧边栏高亮随路由自动联动（同一数据源）
 */
export const HeaderBreadcrumbs: React.FC<HeaderBreadcrumbsProps> = ({ checkPermission }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // L1 业务域入口（当前模块所属 suite → 该域首个模块首页）
  const domainItem = useMemo<NavItem | null>(() => {
    const module = navigationRegistryV2.findModuleByPath(location.pathname);
    if (!module?.suite) return null;
    const suite = module.suite as ModuleSuite;
    const info = SUITE_GROUPS[suite];
    if (!info) return null;
    const grouped = navigationRegistryV2.getNavItemsGroupedByBusinessDomain(checkPermission);
    const firstModule = grouped[suite]?.[0];
    return {
      code: `domain:${suite}`,
      label: i18n.t(info.labelKey, { defaultValue: info.label }),
      labelKey: info.labelKey,
      icon: info.icon,
      path: firstModule?.path ?? module.path,
      permission: firstModule?.permission,
      showInBreadcrumb: true,
    };
  }, [location.pathname, checkPermission]);

  const moduleItems = useMemo<NavItem[]>(() => {
    if (!navigationRegistryV2) return [];
    const hierarchy = navigationRegistryV2.getNavHierarchy(location.pathname);
    // 仅保留在面包屑中展示的层级（showInBreadcrumb !== false）
    return hierarchy.filter((item) => item.showInBreadcrumb !== false);
  }, [location.pathname]);

  const breadcrumbItems = useMemo<NavItem[]>(
    () => (domainItem ? [domainItem, ...moduleItems] : moduleItems),
    [domainItem, moduleItems]
  );

  if (breadcrumbItems.length === 0) return null;

  const canAccess = (item: NavItem): boolean => {
    if (!item.path) return false;
    if (!item.permission) return true;
    if (!checkPermission) return true;
    return checkPermission(item.permission);
  };

  const renderCrumb = (item: NavItem, isLast: boolean) => {
    const itemIcon =
      item.icon && !isLast ? (
        <Box
          component='span'
          sx={{ display: 'inline-flex', alignItems: 'center', mr: 0.5 }}
        >
          {renderIcon(item.icon, 13)}
        </Box>
      ) : null;

    if (isLast || !canAccess(item)) {
      return (
        <Typography
          key={item.code || item.path || item.label}
          sx={{
            fontSize: designTokens.typography.fontSize.scale['0.8125rem'],
            color: 'text.primary',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            ...(item.permission && !canAccess(item) && !isLast
              ? { color: 'text.disabled', cursor: 'not-allowed' }
              : {}),
          }}
        >
          {itemIcon}
          {item.label}
        </Typography>
      );
    }

    return (
      <Link
        key={item.code || item.path || item.label}
        underline='hover'
        color='inherit'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          fontSize: designTokens.typography.fontSize.scale['0.8125rem'],
          color: 'text.secondary',
          '&:hover': {
            color: 'primary.main',
          },
        }}
        onClick={() => item.path && navigate(item.path)}
      >
        {itemIcon}
        {item.label}
      </Link>
    );
  };

  return (
    <Box
      sx={{
        px: { xs: 2, lg: 3 },
        py: 1,
        maxWidth: 1800,
        mx: 'auto',
        width: '100%',
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
        display: { xs: 'none', md: 'block' },
      }}
    >
      <Breadcrumbs
        separator={<ChevronRight style={{ width: 14, height: 14 }} />}
        aria-label={i18n.t('shared.header_breadcrumbs.k0')}
        sx={{
          '& .MuiBreadcrumbs-ol': {
            flexWrap: 'nowrap',
          },
        }}
      >
        <Link
          underline='hover'
          color='inherit'
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: 'pointer',
            fontSize: designTokens.typography.fontSize.scale['0.8125rem'],
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
            },
          }}
          onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
        >
          <Home style={{ width: 14, height: 14 }} />
          {i18n.t('components.header_breadcrumbs.k0')}
        </Link>
        {breadcrumbItems.map((item, index) =>
          renderCrumb(item, index === breadcrumbItems.length - 1)
        )}
      </Breadcrumbs>
    </Box>
  );
};

export default HeaderBreadcrumbs;
