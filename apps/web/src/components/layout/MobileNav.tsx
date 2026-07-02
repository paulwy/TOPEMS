import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Home,
  Bell,
  ChevronDown,
  ChevronRight,
  X,
  Menu,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { navigationRegistryV2 } from '../../lib/navigation';
import type { NavItem } from '../../lib/navigation/types';
import { lucideIcons } from '../../lib/iconMapping';

const getIcon = (iconName?: string): React.ReactNode => {
  if (!iconName) return <Home style={{ width: 20, height: 20 }} />;
  const Icon = lucideIcons[iconName];
  if (!Icon) return <Home style={{ width: 20, height: 20 }} />;
  return <Icon style={{ width: 20, height: 20 }} />;
};

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ open, onClose, onOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPermission } = usePermission();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const topNavItems = navigationRegistryV2.getTopNavItems(checkPermission);
    setNavItems(topNavItems);

    const handleUpdate = () => {
      setNavItems(navigationRegistryV2.getTopNavItems(checkPermission));
    };

    navigationRegistryV2.emitter.on('navigationUpdated', handleUpdate);
    return function cleanup() {
      navigationRegistryV2.emitter.off('navigationUpdated', handleUpdate);
    };
  }, [checkPermission]);

  const toggleExpand = useCallback((code: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const handleItemClick = useCallback(
    (item: NavItem) => {
      if (item.children && !item.path) {
        toggleExpand(item.code);
      } else if (item.path) {
        navigate(item.path);
        onClose();
      }
    },
    [navigate, onClose, toggleExpand]
  );

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.code);
    const isActive =
      item.path === location.pathname ||
      (item.path && location.pathname.startsWith(`${item.path}/`));
    const icon = getIcon(item.icon);

    return (
      <React.Fragment key={item.code + depth}>
        <ListItem
          disablePadding
          sx={{ display: 'block' }}
        >
          <ListItemButton
            onClick={() => handleItemClick(item)}
            sx={{
              pl: 2 + depth * 2,
              py: 1.75,
              backgroundColor: isActive ? 'primary.50' : 'transparent',
              borderLeft: isActive ? '3px solid' : '3px solid transparent',
              borderColor: isActive ? 'primary.main' : 'transparent',
              transition: 'all 0.2s ease-in-out',
              position: 'relative',
              '&:hover': {
                backgroundColor: isActive ? 'primary.50' : 'action.hover',
                transform: 'translateX(2px)',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  backgroundColor: isActive ? 'primary.main' : 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease-in-out',
                  color: isActive ? 'common.white' : 'text.secondary',
                }}
              >
                {icon}
              </Box>
            </ListItemIcon>
            <Typography
              sx={{
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'primary.main' : 'text.primary',
                fontSize: '0.95rem',
                flex: 1,
              }}
            >
              {item.label}
            </Typography>
            {hasChildren && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.25s ease-in-out',
                  color: 'text.secondary',
                }}
              >
                <ChevronRight style={{ width: 18, height: 18 }} />
              </Box>
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse
            in={isExpanded}
            timeout='auto'
            unmountOnExit
          >
            <List
              component='div'
              disablePadding
            >
              {(item.children as NavItem[]).map((child) => renderNavItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <>
      <IconButton
        onClick={onOpen}
        sx={{
          display: { xs: 'flex', lg: 'none' },
          ml: 1,
        }}
      >
        <Menu style={{ width: 24, height: 24 }} />
      </IconButton>

      <Drawer
        anchor='left'
        open={open}
        onClose={onClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 300,
            maxWidth: '85vw',
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>T</Typography>
            </Box>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              TOPEMS
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <X style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <List component='nav'>
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate('/dashboard');
                  onClose();
                }}
                sx={{
                  pl: 2,
                  py: 1.75,
                  backgroundColor:
                    location.pathname === '/dashboard' ? 'primary.50' : 'transparent',
                  borderLeft:
                    location.pathname === '/dashboard' ? '3px solid' : '3px solid transparent',
                  borderColor: 'primary.main',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    transform: 'translateX(2px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      backgroundColor:
                        location.pathname === '/dashboard' ? 'primary.main' : 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease-in-out',
                      color: location.pathname === '/dashboard' ? 'common.white' : 'text.secondary',
                    }}
                  >
                    <Home style={{ width: 18, height: 18 }} />
                  </Box>
                </ListItemIcon>
                <Typography
                  sx={{
                    fontWeight: location.pathname === '/dashboard' ? 600 : 500,
                    color: location.pathname === '/dashboard' ? 'primary.main' : 'text.primary',
                    fontSize: '0.95rem',
                    flex: 1,
                  }}
                >
                  首页
                </Typography>
              </ListItemButton>
            </ListItem>
            <Divider sx={{ my: 1 }} />
            {navItems.map((item) => renderNavItem(item))}
          </List>
        </Box>

        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-around' }}>
            <IconButton
              size='small'
              onClick={() => {
                navigate('/notifications');
                onClose();
              }}
            >
              <Bell style={{ width: 20, height: 20 }} />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => {
                navigate('/ai');
                onClose();
              }}
            >
              <Lightbulb style={{ width: 20, height: 20 }} />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => {
                navigate('/help');
                onClose();
              }}
            >
              <HelpCircle style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default MobileNav;
