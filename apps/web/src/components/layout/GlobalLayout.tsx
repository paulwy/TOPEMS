import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  _Tabs,
  _Tab,
  Avatar,
  _Badge,
  Tooltip,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Drawer,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  Grid3X3,
  BarChart3,
  ShoppingCart,
  Bell,
  User,
  _X,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  _ChevronRight,
} from 'lucide-react';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { navigationRegistry, type NavItem } from '@/lib/NavigationRegistry';
import { useAppStore } from '@/store';
import { FloatingAIHelper } from '../ai/FloatingAIHelper';
import { MobileNav } from './MobileNav';
import { Sidebar as AIPluginSidebar } from './Sidebar';
import { AppSidebar } from './AppSidebar';

const SkipToContent = () => (
  <Box
    component='a'
    href='#main-content'
    sx={{
      position: 'absolute',
      left: '-9999px',
      top: 0,
      zIndex: 10000,
      p: 2,
      bgcolor: 'primary.main',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '0 0 8px 0',
      fontWeight: 600,
      '&:focus': {
        left: 0,
      },
    }}
  >
    跳转到主要内容
  </Box>
);

// 从路径解析模块名的辅助函数
function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[0];
}

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const _isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const { logout } = useAuth();
  const { checkPermission } = usePermission();
  const appTheme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const isDark = appTheme === 'dark';

  // 平板专用判断（sm 到 <lg，即 600px-1200px）
  const isTabletOnly = useMediaQuery(theme.breakpoints.between('sm', 'lg'));

  // 平板抽屉状态
  const [tabletDrawerOpen, setTabletDrawerOpen] = useState(false);

  // 路由变化时关闭平板抽屉
  useEffect(() => {
    setTabletDrawerOpen(false);
  }, [location.pathname]);

  // 从 NavigationRegistry 动态获取导航项（带权限过滤）
  const [_topNavItems, setTopNavItems] = useState<NavItem[]>(() => {
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // 获取当前模块
  const currentModule = getModuleFromPath(location.pathname);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SkipToContent />
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
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: 56,
            px: { xs: 2, lg: 3 },
            maxWidth: 1800,
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

          {/* 平板端导航菜单按钮 */}
          {isTabletOnly && (
            <IconButton
              onClick={() => setTabletDrawerOpen(true)}
              aria-label='打开导航菜单'
              sx={{
                width: 36,
                height: 36,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <MenuIcon style={{ width: 20, height: 20 }} />
            </IconButton>
          )}

          {/* 中央导航 Tab */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {[
              {
                label: '首页',
                path: '/',
                icon: <Home style={{ width: 16, height: 16 }} />,
              },
              {
                label: '模块概览',
                path: '/modules',
                icon: <Grid3X3 style={{ width: 16, height: 16 }} />,
              },
              {
                label: '数据仪表盘',
                path: '/dashboard',
                icon: <BarChart3 style={{ width: 16, height: 16 }} />,
              },
            ].map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Box
                  key={tab.path + tab.label}
                  onClick={() => navigate(tab.path)}
                  sx={{
                    position: 'relative',
                  }}
                >
                  <Button
                    startIcon={tab.icon}
                    sx={{
                      color: isActive ? 'primary.main' : 'text.secondary',
                      fontWeight: isActive ? 600 : 500,
                      px: 2,
                      py: 1,
                      minWidth: 'auto',
                      textTransform: 'none',
                      borderRadius: 1,
                      backgroundColor: 'transparent',
                      transition: 'all 150ms ease',
                      gap: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    {tab.label}
                  </Button>
                  {isActive && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 8,
                        right: 8,
                        height: 2,
                        borderRadius: '999px 999px 0 0',
                        backgroundColor: 'primary.main',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>

          {/* 右侧工具 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Tooltip title='AI 助手'>
              <IconButton
                size='small'
                aria-label='AI 助手'
                onClick={() => navigate('/ai')}
                sx={{
                  width: 36,
                  height: 36,
                  '&:hover': { bgcolor: 'action.hover' },
                  color: 'primary.main',
                }}
              >
                <Sparkles style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title='插件市场'>
              <IconButton
                size='small'
                aria-label='插件市场'
                onClick={() => navigate('/plugin/marketplace')}
                sx={{
                  width: 36,
                  height: 36,
                  '&:hover': { bgcolor: 'action.hover' },
                  color: 'secondary.main',
                }}
              >
                <ShoppingCart style={{ width: 18, height: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title='通知'>
              <IconButton
                size='small'
                aria-label='通知'
                sx={{ width: 36, height: 36 }}
              >
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Bell style={{ width: 18, height: 18 }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main',
                    }}
                  />
                </Box>
              </IconButton>
            </Tooltip>
            <Tooltip title={isDark ? '切换浅色模式' : '切换深色模式'}>
              <IconButton
                aria-label='切换主题'
                onClick={toggleTheme}
                sx={{ width: 36, height: 36, '&:hover': { bgcolor: 'action.hover' } }}
                size='small'
              >
                {isDark ? (
                  <Sun style={{ width: 18, height: 18 }} />
                ) : (
                  <Moon style={{ width: 18, height: 18 }} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title='用户菜单'>
              <IconButton
                size='small'
                aria-label='用户菜单'
                onClick={handleUserMenuOpen}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
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
      </Box>

      {/* 侧边栏 + 主内容区 */}
      <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        {/* 桌面端侧边栏 - lg+（AppSidebar 内部已有 display: { xs: 'none', lg: 'flex' }） */}
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* 平板端抽屉侧边栏 - sm 到 <lg */}
        <Drawer
          anchor='left'
          open={tabletDrawerOpen}
          onClose={() => setTabletDrawerOpen(false)}
          sx={{
            display: { xs: 'none', sm: 'block', lg: 'none' },
            '& .MuiDrawer-paper': {
              width: 240,
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
        >
          <AppSidebar
            collapsed={false}
            onToggleCollapse={() => {}}
            forceVisible
          />
        </Drawer>

        {/* 主内容区 */}
        <Box
          component='main'
          id='main-content'
          sx={{
            flex: 1,
            backgroundColor: 'background.default',
            p: { xs: 2, sm: 3, lg: 4 },
            maxWidth: 1800,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
          {/* Footer */}
          <Box
            component='footer'
            sx={{
              mt: 'auto',
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
              <Typography
                component='a'
                href='#'
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                帮助中心
              </Typography>
              <Typography
                component='a'
                href='#'
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                使用文档
              </Typography>
              <Typography
                component='a'
                href='#'
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                联系支持
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* AI浮动助手 */}
      <AIPluginSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pluginCode={currentModule || undefined}
      />
      <FloatingAIHelper />
    </Box>
  );
};

export default GlobalLayout;
