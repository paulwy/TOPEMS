import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  Typography,
  Divider,
} from '@mui/material';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Briefcase,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';
import { routes } from '../../routes';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  UserCircle,
  Briefcase,
  BarChart3,
  Settings,
};

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeStore();
  const { logout } = useAuthStore();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 240 : 60,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 240 : 60,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar>
        <div style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {open && (
            <Typography variant="h6" component="div">
              TOPEMS
            </Typography>
          )}
        </div>
        <IconButton onClick={handleDrawerToggle}>
          {open ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </IconButton>
      </Toolbar>
      <Divider />
      <List>
        {routes.map((route) => {
          const IconComponent = iconMap[route.icon || 'LayoutDashboard'];
          const isActive = location.pathname === route.path;
          return (
            <ListItem key={route.id} disablePadding>
              <ListItemButton
                onClick={() => navigate(route.path)}
                selected={isActive}
              >
                <ListItemIcon>
                  <IconComponent size={20} />
                </ListItemIcon>
                {open && <ListItemText primary={route.name} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={toggleTheme}>
            <ListItemIcon>{mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}</ListItemIcon>
            {open && <ListItemText primary={mode === 'light' ? '深色模式' : '浅色模式'} />}
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogOut size={20} /></ListItemIcon>
            {open && <ListItemText primary="退出登录" />}
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;