import React, { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Popover,
  Avatar,
  Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Home,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu as MenuIcon,
  X,
  Sparkles,
  User,
  LogOut,
  FileText,
  Calendar,
  DollarSign,
  Box as BoxIcon,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { navigationRegistry, type NavItem } from '@/lib/NavigationRegistry';
import type { TabItem } from '@/types/navigation';
import { ModeToggle } from '../ModeToggle';
import { FloatingAIHelper } from '../ai/FloatingAIHelper';
import { ModuleTabs } from './ModuleTabs';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';

// 从路径解析模块名的辅助函数
function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[0];
}

// 模块图标映射
const moduleIcons: Record<string, React.ReactNode> = {
  hrm: <Users style={{ width: 20, height: 20 }} />,
  crm: <Building2 style={{ width: 20, height: 20 }} />,
  pm: <Briefcase style={{ width: 20, height: 20 }} />,
  bi: <BarChart3 style={{ width: 20, height: 20 }} />,
};

// Lucide 图标名称映射
const lucideIcons: Record<string, React.ComponentType<{ style?: React.CSSProperties }> | null> = {
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Home,
  Settings,
  Bell,
  User,
  BoxIcon,
  FileText,
  Calendar,
  DollarSign,
  ChevronRight,
  ChevronDown,
};

// 渲染图标
const renderIcon = (iconName?: string, size = 16) => {
  if (!iconName) return null;
  const IconComponent = lucideIcons[iconName];
  if (!IconComponent) return null;
  return <IconComponent style={{ width: size, height: size, color: 'primary.main' }} />;
};

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const { logout } = useAuth();
  const { checkPermission } = usePermission();

  // 从 NavigationRegistry 动态获取导航项（带权限过滤）
  const [topNavItems, setTopNavItems] = useState<NavItem[]>(() => {
    return navigationRegistry.getNavItemsByPermission(checkPermission);
  });

  // 监听 NavigationRegistry 更新事件
  useEffect(() => {
    const updateNavItems = () => {
      setTopNavItems(navigationRegistry.getNavItemsByPermission(checkPermission));
    };
    navigationRegistry.emitter.on('navigationUpdated', updateNavItems);
    return function cleanup() {
      navigationRegistry.emitter.off('navigationUpdated', updateNavItems);
    };
  }, [checkPermission]);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [openMenu, setOpenMenu] = useState<NavItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(null);
  const userMenuOpen = Boolean(userMenuAnchorEl);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleUserMenuClose();
  };

  // 获取当前模块和Tab
  const currentModule = getModuleFromPath(location.pathname);
  const moduleTabs = currentModule ? navigationRegistry.getModuleTabs(currentModule) || [] : [];

  const handleNavHover = useCallback(
    (event: React.MouseEvent<HTMLElement>, item: NavItem) => {
      if (item.children) {
        setAnchorEl(event.currentTarget);
        setOpenMenu(item);
      } else if (item.path) {
        navigate(item.path);
      }
    },
    [navigate]
  );

  const handleNavLeave = useCallback(() => {
    // 延迟关闭，允许进入下拉菜单
    setTimeout(() => {
      if (!anchorEl) return;
      // 检查鼠标是否在popover内
    }, 100);
  }, [anchorEl]);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setOpenMenu(null);
  }, []);

  const handleMenuItemClick = useCallback(
    (item: NavItem) => {
      if (item.path) {
        navigate(item.path);
      }
      handleCloseMenu();
    },
    [navigate, handleCloseMenu]
  );

  const isMenuOpen = Boolean(anchorEl) && Boolean(openMenu?.children);

  // 渲染下拉菜单内容
  const renderDropdownContent = (item: NavItem) => {
    if (!item.children) return null;

    const menuItems = item.children as NavItem[];
    return (
      <Box
        sx={{
          minWidth: 200,
          maxWidth: 320,
          p: 1,
          maxHeight: isMobile ? '60vh' : '70vh',
          overflowY: 'auto',
        }}
        onMouseEnter={() => {
          if (anchorEl) setAnchorEl(anchorEl);
        }}
        onMouseLeave={handleCloseMenu}
      >
        {menuItems.map((child: NavItem) => (
          <Box
            key={child.code}
            onClick={() => handleMenuItemClick(child)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1,
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                backgroundColor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.8,
              }}
            >
              {child.icon ? (
                renderIcon(child.icon, 16)
              ) : (
                <Typography
                  variant='caption'
                  sx={{ color: 'primary.main', fontWeight: 600 }}
                >
                  {child.label.charAt(0)}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {child.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  // 渲染顶部导航项
  const renderNavItem = (item: NavItem, index: number) => {
    const isActive =
      item.path === location.pathname ||
      (item.path && location.pathname.startsWith(item.path + '/'));

    return (
      <Box
        key={item.label + index}
        onMouseEnter={(e) => handleNavHover(e, item)}
        onMouseLeave={handleNavLeave}
        sx={{
          position: 'relative',
        }}
      >
        <Button
          onClick={() => item.path && navigate(item.path)}
          endIcon={
            item.children && item.children.length > 0 ? (
              <ChevronDown style={{ width: 14, height: 14 }} />
            ) : null
          }
          sx={{
            color: isActive ? 'primary.main' : 'text.primary',
            fontWeight: isActive ? 600 : 400,
            px: 1.5,
            py: 1,
            minWidth: 'auto',
            textTransform: 'none',
            borderRadius: 1,
            backgroundColor: isActive ? 'primary.light' : 'transparent',
            '&:hover': {
              backgroundColor: isActive ? 'primary.light' : 'action.hover',
            },
            cursor: item.path ? 'pointer' : 'default',
          }}
        >
          {item.label}
        </Button>
      </Box>
    );
  };

  // 渲染Tab
  const renderTabs = () => {
    if (moduleTabs.length === 0) return null;

    return (
      <ModuleTabs
        tabs={moduleTabs}
        onTabsChange={(newTabs) => {
          // 可以在这里保存用户自定义的标签配置到localStorage
          logger.info('Tabs changed:', newTabs);
        }}
      />
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <Box
        component='header'
        sx={{
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 1100,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: 56,
            px: 2,
            maxWidth: 1600,
            mx: 'auto',
            width: '100%',
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              marginRight: 3,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 16 }}>T</Typography>
            </Box>
            <Typography
              variant='h6'
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(135deg, primary.main, secondary.main)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              TOPEMS
            </Typography>
          </Box>

          {/* 导航菜单 - 桌面端 */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              overflow: 'auto',
            }}
          >
            {topNavItems.map((item, index) => renderNavItem(item, index))}
          </Box>

          {/* 右侧工具 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
            }}
          >
            <Tooltip title='通知'>
              <IconButton size='small'>
                <Badge
                  badgeContent={3}
                  color='error'
                >
                  <Bell style={{ width: 20, height: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>
            <ModeToggle />
            <Tooltip title='用户菜单'>
              <IconButton
                size='small'
                onClick={handleUserMenuOpen}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    fontSize: 14,
                    background: 'linear-gradient(135deg, primary.main, secondary.main)',
                  }}
                >
                  陈
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchorEl}
              open={userMenuOpen}
              onClose={handleUserMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              sx={{ mt: 1.5 }}
            >
              <MenuItem
                onClick={() => {
                  navigate('/profile');
                  handleUserMenuClose();
                }}
              >
                <User style={{ width: 18, height: 18, marginRight: 12 }} />
                个人中心
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogOut style={{ width: 18, height: 18, marginRight: 12 }} />
                退出登录
              </MenuItem>
            </Menu>
            {/* 移动端汉堡菜单 */}
            <MobileNav
              open={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              onOpen={() => setMobileMenuOpen(true)}
            />
          </Box>
        </Box>

        {/* 下拉菜单 Popover */}
        <Popover
          open={isMenuOpen}
          anchorEl={anchorEl}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          slotProps={{
            paper: {
              elevation: 3,
              sx: {
                borderRadius: 2,
                mt: 0.5,
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
              },
            },
          }}
        >
          {openMenu && <Fade in={isMenuOpen}>{renderDropdownContent(openMenu) || <Box />}</Fade>}
        </Popover>
      </Box>

      {/* 模块Tab */}
      {renderTabs()}

      {/* 主内容区 */}
      <Box
        component='main'
        sx={{
          flex: 1,
          backgroundColor: 'grey.50',
          p: { xs: 2, sm: 3, lg: 4 },
          maxWidth: 1600,
          mx: 'auto',
          width: '100%',
        }}
      >
        {children}
      </Box>

      {/* Footer */}
      <Box
        component='footer'
        sx={{
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          py: 2,
          px: { xs: 2, sm: 3, lg: 4 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ fontSize: 12 }}
        >
          © 2024 TOPEMS 化工新材料数字化平台
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            size='small'
            variant='text'
            sx={{ fontSize: 12 }}
          >
            帮助中心
          </Button>
          <Button
            size='small'
            variant='text'
            sx={{ fontSize: 12 }}
          >
            使用文档
          </Button>
          <Button
            size='small'
            variant='text'
            sx={{ fontSize: 12 }}
          >
            联系支持
          </Button>
        </Box>
      </Box>

      {/* AI浮动助手 */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pluginCode={currentModule || undefined}
      />
      <FloatingAIHelper />
    </Box>
  );
};

export default GlobalLayout;
