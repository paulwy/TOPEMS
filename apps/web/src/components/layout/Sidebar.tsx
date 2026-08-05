import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import {
  ChevronRight,
  ChevronDown,
  Home,
  Activity,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePlugins } from '../../context/PluginContext';
import { navigationRegistryV2 } from '../../lib/navigation';
import type { NavItem } from '../../lib/navigation/types';
import { usePermission } from '../../hooks/usePermission';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
// V36.0 Phase 6: 路由级 hover 预加载
import { prefetchOnHover } from '@/microfrontend/RemoteLoader';
import { REMOTE_MODULES } from '@/microfrontend/config';

function getNavigablePath(path: string): string | null {
  if (!path) return null;
  if (path.includes(':id')) {
    const segments = path.split('/').filter(Boolean);
    const paramIndex = segments.findIndex((s) => s.startsWith(':'));
    if (paramIndex > 0) {
      return `/${segments.slice(0, paramIndex).join('/')}`;
    }
    return null;
  }
  return path;
}

/**
 * V36.0: 根据导航路径查找远程模块入口 URL
 * 通过路径前缀匹配 REMOTE_MODULES 的 basePath
 */
function findRemoteEntryByPath(path: string): string | null {
  if (!path) return null;
  for (const mod of REMOTE_MODULES) {
    if (mod.routePrefix && path.startsWith(mod.routePrefix)) {
      return mod.entry;
    }
  }
  return null;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pluginCode?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, pluginCode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { pluginHealth, isPluginInstalled, isPluginActive } = usePlugins();
  const { checkPermission, isSuperuser } = usePermission();

  const hasPermission = (permission?: string): boolean => {
    if (isSuperuser) return true;
    if (!permission) return true;
    return checkPermission(permission);
  };

  const toggleExpand = (code: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname.startsWith(path);
  };

  const _getPluginStatus = (pluginCode: string) => {
    const health = pluginHealth[pluginCode];
    const installed = isPluginInstalled(pluginCode);
    const active = isPluginActive(pluginCode);

    if (!installed) {
      return { status: 'not-installed', label: '未安装' };
    }
    if (!active) {
      return { status: 'disabled', label: '已禁用' };
    }
    if (!health?.healthy) {
      return { status: 'unhealthy', label: '异常' };
    }
    return { status: 'healthy', label: '运行中' };
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.code);
    const active = isActive(item.path);

    if (!hasPermission(item.permission)) {
      return null;
    }

    const IconComponent = item.icon
      ? (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
          item.icon
        ]
      : null;

    return (
      <div key={item.code}>
        <ListItem
          onMouseEnter={() => {
            // V36.0: hover 时预加载远程模块入口
            if (item.path) {
              const entry = findRemoteEntryByPath(item.path);
              if (entry) prefetchOnHover(entry);
            }
          }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.code);
            } else if (item.path) {
              const navigablePath = getNavigablePath(item.path);
              if (navigablePath) {
                navigate(navigablePath);
                onClose();
              }
            }
          }}
          sx={{
            position: 'relative',
            color: active ? 'primary.main' : 'text.secondary',
            backgroundColor: active ? 'primary.50' : 'transparent',
            borderRadius: 1,
            marginY: 0.5,
            marginX: 1,
            cursor: hasChildren || item.path ? 'pointer' : 'default',
            pl: depth * 2 + 1,
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              backgroundColor: active ? 'primary.50' : 'grey.50',
              transform: 'translateX(2px)',
            },
            // 左侧激活条
            '&::before': active
              ? {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 3,
                  height: '60%',
                  borderRadius: '0 3px 3px 0',
                  backgroundColor: 'primary.main',
                }
              : {},
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )
            ) : IconComponent ? (
              <IconComponent size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
              },
            }}
          />
          {item.badge && (
            <Chip
              size='small'
              label={item.badge}
              sx={{
                backgroundColor:
                  item.badgeColor === 'success'
                    ? 'success.light'
                    : item.badgeColor === 'warning'
                      ? 'warning.light'
                      : item.badgeColor === 'error'
                        ? 'error.light'
                        : 'primary.light',
                color:
                  item.badgeColor === 'success'
                    ? 'success'
                    : item.badgeColor === 'warning'
                      ? 'warning'
                      : item.badgeColor === 'error'
                        ? 'error'
                        : 'primary',
              }}
            />
          )}
        </ListItem>
        {hasChildren && (
          <Collapse in={isExpanded}>
            <List
              component='div'
              disablePadding
            >
              {(item.children || []).map((child) => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </div>
    );
  };

  const renderPluginSidebar = () => {
    if (!pluginCode) return null;
    const sidebarItems = navigationRegistryV2.getSidebarNavItems(pluginCode, hasPermission);
    if (!sidebarItems.length) return null;

    return (
      <div key={`sidebar-${pluginCode}`}>{sidebarItems.map((item) => renderNavItem(item))}</div>
    );
  };

  const renderAllPluginsSidebar = () => {
    const pluginCodes = navigationRegistryV2.getAllModuleCodes();
    return pluginCodes.map((code) => {
      const card = navigationRegistryV2.getModule(code);
      if (!card) return null;
      if (card.status !== 'online') return null;
      if (!hasPermission(card.permission)) return null;

      const sidebarItems = navigationRegistryV2.getSidebarNavItems(code, hasPermission);
      if (!sidebarItems.length) return null;

      const isExpanded = expandedItems.has(code);
      const groupActive = sidebarItems.some((item) => isActive(item.path));

      return (
        <div key={code}>
          <ListItem
            onClick={() => toggleExpand(code)}
            sx={{
              color: groupActive ? 'primary.main' : 'text.secondary',
              borderRadius: 1,
              marginY: 0.5,
              marginX: 1,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'grey.50' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </ListItemIcon>
            <ListItemText primary={card.name} />
          </ListItem>
          <Collapse in={isExpanded}>
            <List
              component='div'
              disablePadding
              sx={{ pl: 2 }}
            >
              {sidebarItems.map((item) => renderNavItem(item, 1))}
            </List>
          </Collapse>
        </div>
      );
    });
  };

  return (
    <Drawer
      anchor='left'
      open={open}
      onClose={onClose}
      variant='temporary'
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '85vw', sm: 220, md: 240 },
          maxWidth: 280,
          paddingTop: 3,
        },
      }}
    >
      <Box sx={{ px: 3, pb: 3 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
          color='primary.main'
        >
          TOPEMS
        </Typography>
        <Typography
          variant='caption'
          color='textSecondary'
        >
          插件化平台
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem
          onClick={() => {
            navigate(DASHBOARD_PATHS.dashboard);
            onClose();
          }}
          sx={{
            color:
              location.pathname === DASHBOARD_PATHS.dashboard ? 'primary.main' : 'text.secondary',
            backgroundColor:
              location.pathname === DASHBOARD_PATHS.dashboard ? 'primary.50' : 'transparent',
            borderRadius: 1,
            marginY: 0.5,
            marginX: 1,
            cursor: 'pointer',
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Home size={18} />
          </ListItemIcon>
          <ListItemText primary='首页' />
        </ListItem>
        <Divider sx={{ my: 1 }} />

        {pluginCode ? renderPluginSidebar() : renderAllPluginsSidebar()}

        <Divider sx={{ my: 2 }} />
        <Typography
          variant='overline'
          sx={{ px: 3, py: 1, color: 'textSecondary', fontSize: 11 }}
        >
          已安装套件
        </Typography>

        <Divider sx={{ my: 2 }} />
      </List>

      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <Box className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Activity
              size={16}
              sx={{ color: 'grey.400' }}
            />
            <Typography
              variant='caption'
              color='textSecondary'
            >
              服务状态
            </Typography>
          </div>
          <div className='flex items-center gap-1'>
            {Object.keys(pluginHealth).length > 0 && (
              <>
                {Object.values(pluginHealth).every((h) => h.healthy) ? (
                  <CheckCircle
                    size={16}
                    sx={{ color: 'success.main' }}
                  />
                ) : (
                  <AlertTriangle
                    size={16}
                    sx={{ color: 'warning.main' }}
                  />
                )}
              </>
            )}
          </div>
        </Box>
      </Box>
    </Drawer>
  );
};
