import { designTokens } from '@topems/tokens';
import { useState, useCallback, useMemo, type ComponentType, type ReactNode } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  Collapse,
  Divider,
  Tooltip,
  Badge,
  Typography,
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Briefcase,
  Workflow,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import i18n from '@/i18n';
import type { NavItem, NavGroup } from '../types';
import { NAV_GROUPS } from '../types';
import { LazyIcon } from '@/components/icons/LazyIcon';

interface SidebarNavGroupProps {
  grouped: Record<NavGroup | 'other', NavItem[]>;
  collapsed?: boolean;
}

const groupIcons: Record<string, ComponentType<{ size?: number | string }>> = {
  overview: LayoutDashboard,
  business: Briefcase,
  process: Workflow,
  analytics: BarChart3,
  settings: Settings,
};

function getIcon(iconName?: string): ReactNode {
  if (!iconName) return null;
  return (
    <LazyIcon
      name={iconName}
      size={20}
    />
  );
}

function NavItemComponent({
  item,
  collapsed,
  depth = 0,
}: {
  item: NavItem;
  collapsed?: boolean;
  depth?: number;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const isActive = useCallback(() => {
    if (item.path === location.pathname) return true;
    if (item.children) {
      return item.children.some(
        (child) =>
          child.path === location.pathname || location.pathname.startsWith(`${child.path}/`)
      );
    }
    return false;
  }, [item.path, item.children, location.pathname]);

  const handleClick = useCallback(() => {
    if (item.children && item.children.length > 0) {
      setOpen((o) => !o);
    } else {
      navigate(item.path);
    }
  }, [item.path, item.children, navigate]);

  const hasChildren = item.children && item.children.length > 0;
  const active = isActive();

  if (collapsed) {
    return (
      <Tooltip
        title={item.label}
        placement='right'
      >
        <ListItemButton
          onClick={handleClick}
          sx={{
            minHeight: 48,
            justifyContent: 'center',
            px: 2.5,
            bgcolor: active ? 'action.selected' : 'transparent',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              justifyContent: 'center',
              color: active ? 'primary.main' : 'inherit',
            }}
          >
            {item.badge ? (
              <Badge
                badgeContent={item.badge}
                color={item.badgeColor || 'primary'}
              >
                {getIcon(item.icon)}
              </Badge>
            ) : (
              getIcon(item.icon)
            )}
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    );
  }

  return (
    <>
      <ListItemButton
        onClick={handleClick}
        sx={{
          pl: 2 + depth * 2,
          py: 1.5,
          bgcolor: active && !hasChildren ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 36,
            color: active ? 'primary.main' : 'inherit',
          }}
        >
          {item.badge ? (
            <Badge
              badgeContent={item.badge}
              color={item.badgeColor || 'primary'}
            >
              {getIcon(item.icon)}
            </Badge>
          ) : (
            getIcon(item.icon)
          )}
        </ListItemIcon>
        <Typography
          variant='body2'
          sx={{
            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            fontWeight: active ? 600 : 400,
            color: active ? 'primary.main' : 'text.primary',
          }}
        >
          {item.label}
        </Typography>
        {hasChildren && (
          <Box sx={{ ml: 1, color: 'text.secondary' }}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </Box>
        )}
      </ListItemButton>
      {hasChildren && (
        <Collapse
          in={open}
          timeout='auto'
          unmountOnExit
        >
          <List
            component='div'
            disablePadding
          >
            {(item.children || []).map((child) => (
              <NavItemComponent
                key={child.code}
                item={child}
                collapsed={collapsed}
                depth={depth + 1}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export default function SidebarNavGroup({ grouped, collapsed }: SidebarNavGroupProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(Object.keys(NAV_GROUPS))
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  const translatedNavGroups = useMemo(() => {
    const result: Record<string, { label: string; icon: string; order: number }> = {};
    for (const [key, info] of Object.entries(NAV_GROUPS)) {
      result[key] = {
        ...info,
        label: info.labelKey ? i18n.t(info.labelKey) : info.label,
      };
    }
    return result;
  }, []);

  const sortedGroups = Object.entries(translatedNavGroups)
    .filter(([key]) => grouped[key as NavGroup]?.length > 0)
    .sort(([, a], [, b]) => a.order - b.order);

  if (sortedGroups.length === 0) {
    return null;
  }

  return (
    <Box sx={{ py: 1 }}>
      {sortedGroups.map(([key, groupInfo], index) => {
        const items = grouped[key as NavGroup];
        if (!items || items.length === 0) return null;
        const isExpanded = expandedGroups.has(key);
        const GroupIcon = groupIcons[key] || LayoutDashboard;

        return (
          <Box key={key}>
            {index > 0 && <Divider sx={{ my: 1, mx: 2 }} />}
            {!collapsed && (
              <ListItemButton
                onClick={() => toggleGroup(key)}
                sx={{
                  px: 2,
                  py: 1,
                  minHeight: 36,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 36,
                    color: 'text.secondary',
                  }}
                >
                  <GroupIcon size={16} />
                </ListItemIcon>
                <Typography
                  variant='caption'
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {groupInfo.label}
                </Typography>
                <Box sx={{ color: 'text.secondary' }}>
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Box>
              </ListItemButton>
            )}
            {collapsed ? (
              <List sx={{ py: 0 }}>
                {items.slice(0, 1).map((item) => (
                  <NavItemComponent
                    key={item.code}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </List>
            ) : (
              <Collapse
                in={isExpanded}
                timeout='auto'
              >
                <List sx={{ py: 0 }}>
                  {items.map((item) => (
                    <NavItemComponent
                      key={item.code}
                      item={item}
                    />
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
