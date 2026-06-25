import React, { useEffect, useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ModuleTabs } from './ModuleTabs';
import { PageBreadcrumb } from './PageBreadcrumb';
import { PageHeader } from './PageHeader';
import { navigationRegistry, type NavItem } from '../../lib/NavigationRegistry';

export interface ModuleLayoutProps {
  children: React.ReactNode;
  pluginCode?: string;
}

/**
 * 检查路径是否匹配路由模式
 * 支持动态路由参数如 :id, :code 等
 */
function matchPathPattern(pattern: string, actualPath: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = actualPath.split('/');

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    // 动态参数匹配
    if (patternPart.startsWith(':')) {
      continue;
    }

    // 精确匹配
    if (patternPart !== pathPart) {
      return false;
    }
  }

  return true;
}

/**
 * 检查路径片段是否是动态参数（如 UUID、数字 ID）
 */
function isDynamicParam(segment: string): boolean {
  // UUID 格式
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(segment)) {
    return true;
  }
  // 数字 ID
  if (/^\d+$/.test(segment)) {
    return true;
  }
  // 其他常见动态参数（如 :id, :code）
  return false;
}

/**
 * 从路由配置中查找匹配的标签
 * 支持动态路由模式匹配
 */
function findLabelWithPattern(items: NavItem[], path: string): string | undefined {
  for (const item of items) {
    // 精确匹配
    if (item.path === path) {
      return item.label;
    }
    // 模式匹配（支持动态路由）
    if (matchPathPattern(item.path, path)) {
      return item.label;
    }
    // 递归子项
    if (item.children) {
      const found = findLabelWithPattern(item.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

export const ModuleLayout: React.FC<ModuleLayoutProps> = ({ children, pluginCode }) => {
  const location = useLocation();
  const params = useParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  const [sidebarItems, setSidebarItems] = useState<NavItem[]>([]);
  const [moduleTabs, setModuleTabs] = useState<NavItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ label: string; href?: string }[]>([]);

  const resolvedPluginCode = pluginCode || params.pluginCode || '';

  useEffect(() => {
    if (resolvedPluginCode) {
      const sidebar = navigationRegistry.getSidebarNavItems(resolvedPluginCode);
      const tabs = navigationRegistry.getModuleTabs(resolvedPluginCode) || [];
      setSidebarItems(sidebar);
      setModuleTabs(tabs);
    }
  }, [resolvedPluginCode]);

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [];

    if (pathParts.length > 0) {
      const pluginCodePart = pathParts[0];
      const moduleCard = navigationRegistry.getModuleCard(pluginCodePart);
      if (moduleCard) {
        crumbs.push({ label: moduleCard.name, href: `/${pluginCodePart}` });
      }

      if (pathParts.length > 1) {
        const sidebar = navigationRegistry.getSidebarNavItems(pluginCodePart);

        let currentPath = `/${pluginCodePart}`;
        for (let i = 1; i < pathParts.length; i++) {
          currentPath += `/${pathParts[i]}`;

          // 使用模式匹配查找标签
          const label = findLabelWithPattern(sidebar, currentPath);

          // 如果是动态参数，使用友好名称
          if (!label && isDynamicParam(pathParts[i])) {
            // 尝试推断父路径的标签 + "详情"
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
            const parentLabel = findLabelWithPattern(sidebar, parentPath);
            crumbs.push({ label: parentLabel ? `${parentLabel}详情` : '详情', href: undefined });
          } else {
            crumbs.push({ label: label || pathParts[i], href: currentPath });
          }
        }
      }
    }

    setBreadcrumbs(crumbs);
  }, [location.pathname]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: 'background.default',
      }}
    >
      {!isMobile && resolvedPluginCode && (
        <Sidebar
          pluginCode={resolvedPluginCode}
          open={true}
          onClose={() => {}}
        />
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {moduleTabs.length > 0 && (
          <ModuleTabs
            tabs={moduleTabs.map((tab) => ({
              label: tab.label,
              path: tab.path,
            }))}
          />
        )}

        <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          <PageBreadcrumb items={breadcrumbs} />
          <PageHeader title={breadcrumbs[breadcrumbs.length - 1]?.label || ''} />
          <Box sx={{ mt: 2 }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ModuleLayout;
