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
  DashboardOutlined,
  People,
  PersonPinCircle,
  CasesOutlined,
  BarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LightMode,
  DarkMode,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { routes } from '../../routes';
import { useThemeStore } from '../../store/themeStore';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard: DashboardOutlined,
  Users: People,
  UserCircle: PersonPinCircle,
  Briefcase: CasesOutlined,
  BarChart3: BarChart,
  Settings,
};

const Sidebar = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeStore();

  const handleDrawerToggle = () => {
    setOpen(!open);
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
          {open ? <ChevronLeft /> : <ChevronRight />}
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
                  <IconComponent />
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
            <ListItemIcon>{mode === 'light' ? <DarkMode /> : <LightMode />}</ListItemIcon>
            {open && <ListItemText primary={mode === 'light' ? '深色模式' : '浅色模式'} />}
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;