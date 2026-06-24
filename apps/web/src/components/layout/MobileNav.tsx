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
  Building,
  FolderKanban,
  FlaskConical,
  Truck,
  Users,
  Bot,
  Map,
  MessageCircle,
  DollarSign,
  Package,
  ShoppingCart,
  ListTodo,
  Calendar,
  BarChart3,
  FileText,
  CheckSquare,
  Rocket,
  Warehouse,
  Target,
  LayoutDashboard,
  UserPlus,
  GraduationCap,
  Award,
  Layers,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { navigationRegistry, type NavItem } from '../../lib/NavigationRegistry';

const iconMap: Record<string, React.ReactNode> = {
  Home: <Home style={{ width: 20, height: 20 }} />,
  Building: <Building style={{ width: 20, height: 20 }} />,
  FolderKanban: <FolderKanban style={{ width: 20, height: 20 }} />,
  FlaskConical: <FlaskConical style={{ width: 20, height: 20 }} />,
  Truck: <Truck style={{ width: 20, height: 20 }} />,
  Users: <Users style={{ width: 20, height: 20 }} />,
  Bot: <Bot style={{ width: 20, height: 20 }} />,
  Map: <Map style={{ width: 20, height: 20 }} />,
  MessageCircle: <MessageCircle style={{ width: 20, height: 20 }} />,
  DollarSign: <DollarSign style={{ width: 20, height: 20 }} />,
  Package: <Package style={{ width: 20, height: 20 }} />,
  ShoppingCart: <ShoppingCart style={{ width: 20, height: 20 }} />,
  ListTodo: <ListTodo style={{ width: 20, height: 20 }} />,
  Calendar: <Calendar style={{ width: 20, height: 20 }} />,
  BarChart3: <BarChart3 style={{ width: 20, height: 20 }} />,
  FileText: <FileText style={{ width: 20, height: 20 }} />,
  CheckSquare: <CheckSquare style={{ width: 20, height: 20 }} />,
  Rocket: <Rocket style={{ width: 20, height: 20 }} />,
  Warehouse: <Warehouse style={{ width: 20, height: 20 }} />,
  Target: <Target style={{ width: 20, height: 20 }} />,
  LayoutDashboard: <LayoutDashboard style={{ width: 20, height: 20 }} />,
  UserPlus: <UserPlus style={{ width: 20, height: 20 }} />,
  GraduationCap: <GraduationCap style={{ width: 20, height: 20 }} />,
  Award: <Award style={{ width: 20, height: 20 }} />,
  Layers: <Layers style={{ width: 20, height: 20 }} />,
  TrendingUp: <TrendingUp style={{ width: 20, height: 20 }} />,
  GitBranch: <TrendingUp style={{ width: 20, height: 20 }} />,
  MessageSquare: <MessageSquare style={{ width: 20, height: 20 }} />,
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
    const topNavItems = navigationRegistry.getNavItemsByPermission(checkPermission);
    setNavItems(topNavItems);

    const handleUpdate = () => {
      setNavItems(navigationRegistry.getNavItemsByPermission(checkPermission));
    };

    navigationRegistry.emitter.on('navigationUpdated', handleUpdate);
    return function cleanup() {
      navigationRegistry.emitter.off('navigationUpdated', handleUpdate);
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
    const isActive = item.path === location.pathname;
    const icon = iconMap[item.icon || 'Home'] || <Home style={{ width: 20, height: 20 }} />;

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
              py: 1.5,
              backgroundColor: isActive ? 'primary.light' : 'transparent',
              borderLeft: isActive ? '3px solid' : '3px solid transparent',
              borderColor: isActive ? 'primary.main' : 'transparent',
              '&:hover': {
                backgroundColor: isActive ? 'primary.light' : 'action.hover',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
            <Typography
              sx={{
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'primary.main' : 'text.primary',
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
                  transition: 'transform 0.2s',
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
          <List component='nav'>{navItems.map((item) => renderNavItem(item))}</List>
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
