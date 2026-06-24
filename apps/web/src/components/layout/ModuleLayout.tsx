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
        const findLabel = (items: NavItem[], path: string): string | undefined => {
          for (const item of items) {
            if (item.path === path) return item.label;
            if (item.children) {
              const found = findLabel(item.children, path);
              if (found) return found;
            }
          }
          return undefined;
        };

        let currentPath = `/${pluginCodePart}`;
        for (let i = 1; i < pathParts.length; i++) {
          currentPath += `/${pathParts[i]}`;
          const label = findLabel(sidebar, currentPath) || pathParts[i];
          crumbs.push({ label, href: currentPath });
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
