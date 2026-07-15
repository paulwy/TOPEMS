import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  Badge,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  Grid3X3,
  BarChart3,
  ShoppingCart,
  Bell,
  User,
  Sun,
  Moon,
  Sparkles,
  LogOut,
  ChevronRight,
  CheckCheck,
  Trash2,
  Settings,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/store';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { PLUGIN_PATHS } from '@/modules/plugin/config';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { AUTH_PATHS } from '@/routes/auth';
import { AI_PATHS } from '@/modules/ai/config';
import GlobalSearchBar from '../GlobalSearchBar';

export interface AppHeaderProps {
  tabletDrawerOpen?: boolean;
  onTabletDrawerOpen?: () => void;
  mobileMenuOpen?: boolean;
  onMobileMenuOpen?: () => void;
  onMobileMenuClose?: () => void;
  mobileNavComponent?: React.ComponentType<{
    open: boolean;
    onClose: () => void;
    onOpen: () => void;
  }>;
  showCentralNav?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  rightActions?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  tabletDrawerOpen = false,
  onTabletDrawerOpen,
  mobileMenuOpen = false,
  onMobileMenuOpen,
  onMobileMenuClose,
  mobileNavComponent: MobileNavComponent,
  showCentralNav = true,
  showBackButton = false,
  onBack,
  title,
  rightActions,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { logout } = useAuth();
  const appTheme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = appTheme === 'dark';

  // 响应式断点：优化计划要求 < 768px 隐藏 Sidebar，使用汉堡菜单
  const isMobileNav = useMediaQuery('(max-width:767px)'); // < 768px 显示汉堡菜单按钮

  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(null);
  const userMenuOpen = Boolean(userMenuAnchorEl);

  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
  const notificationOpen = Boolean(notificationAnchorEl);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate(AUTH_PATHS.login);
    handleUserMenuClose();
  };

  const notifications = [
    {
      id: 1,
      title: '新的审批任务',
      description: '您有一个新的采购订单待审批',
      time: '5分钟前',
      read: false,
      type: 'info',
    },
    {
      id: 2,
      title: '生产订单完成',
      description: '生产订单 PO-2026-001 已完成',
      time: '30分钟前',
      read: false,
      type: 'success',
    },
    {
      id: 3,
      title: '库存预警',
      description: '原材料 A-001 库存低于安全线',
      time: '1小时前',
      read: false,
      type: 'warning',
    },
    {
      id: 4,
      title: '系统更新通知',
      description: '系统将于今晚 22:00 进行维护升级',
      time: '2小时前',
      read: true,
      type: 'info',
    },
    {
      id: 5,
      title: '客户反馈',
      description: '客户张三提交了新的服务工单',
      time: '3小时前',
      read: true,
      type: 'info',
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const centralNavItems = [
    { label: '首页', path: '/', icon: <Home style={{ width: 16, height: 16 }} /> },
    { label: '模块概览', path: '/modules', icon: <Grid3X3 style={{ width: 16, height: 16 }} /> },
    {
      label: '数据仪表盘',
      path: '/dashboard',
      icon: <BarChart3 style={{ width: 16, height: 16 }} />,
    },
  ];

  const breadcrumbItems = useMemo<NavItem[]>(() => {
    if (!navigationRegistryV2) return [];
    const hierarchy = navigationRegistryV2.getNavHierarchy(location.pathname);
    return hierarchy;
  }, [location.pathname]);

  const showBreadcrumbs = breadcrumbItems.length > 0;

  return (
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
        {/* 左侧：Logo + 菜单按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {showBackButton && onBack && (
            <IconButton
              size='small'
              onClick={onBack}
              sx={{ display: { sm: 'none' } }}
            >
              <MenuIcon style={{ width: 20, height: 20 }} />
            </IconButton>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              marginRight: 3,
              cursor: 'pointer',
            }}
            onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
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
              {title || 'TOPEMS'}
            </Typography>
          </Box>

          {isMobileNav && onMobileMenuOpen && (
            <IconButton
              onClick={onMobileMenuOpen}
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
        </Box>

        {/* 中央导航 Tab */}
        {showCentralNav && (
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {centralNavItems.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Box
                  key={tab.path + tab.label}
                  onClick={() => navigate(tab.path)}
                  sx={{ position: 'relative', cursor: 'pointer' }}
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
        )}

        {/* 全局搜索栏（桌面端） */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            width: 480,
            flexShrink: 0,
            mx: 2,
          }}
        >
          <GlobalSearchBar />
        </Box>

        {/* 右侧工具栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            ml: 'auto',
          }}
        >
          <Box sx={{ display: { xs: 'flex', lg: 'none' } }}>
            <GlobalSearchBar variant='icon' />
          </Box>
          {rightActions || (
            <>
              <Tooltip title='AI 助手'>
                <IconButton
                  size='small'
                  aria-label='AI 助手'
                  onClick={() => navigate(AI_PATHS.root)}
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
                  onClick={() => navigate(PLUGIN_PATHS.marketplace)}
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
                  onClick={handleNotificationOpen}
                  sx={{ width: 36, height: 36, '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Badge
                    badgeContent={unreadCount}
                    color='error'
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.625rem',
                        height: 18,
                        minWidth: 18,
                        top: 2,
                        right: 2,
                      },
                    }}
                  >
                    <Bell style={{ width: 18, height: 18 }} />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={notificationAnchorEl}
                open={notificationOpen}
                onClose={handleNotificationClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: {
                    sx: {
                      width: 360,
                      maxHeight: 480,
                      borderRadius: 3,
                      mt: 1.5,
                    },
                  },
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                    通知中心
                    {unreadCount > 0 && (
                      <Typography
                        component='span'
                        sx={{ ml: 1, color: 'error.main', fontSize: '0.75rem' }}
                      >
                        ({unreadCount}条未读)
                      </Typography>
                    )}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title='全部已读'>
                      <IconButton
                        size='small'
                        sx={{ width: 28, height: 28 }}
                      >
                        <CheckCheck style={{ width: 16, height: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='通知设置'>
                      <IconButton
                        size='small'
                        sx={{ width: 28, height: 28 }}
                      >
                        <Settings style={{ width: 16, height: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Divider />
                <Box sx={{ py: 0, maxHeight: 340, overflowY: 'auto' }}>
                  {notifications.map((notification) => (
                    <Box
                      key={notification.id}
                      sx={{
                        px: 2,
                        py: 1.5,
                        cursor: 'pointer',
                        bgcolor: !notification.read ? 'action.hover' : 'transparent',
                        '&:hover': { bgcolor: 'action.hover' },
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        position: 'relative',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          bgcolor:
                            notification.type === 'success'
                              ? 'success.main'
                              : notification.type === 'warning'
                                ? 'warning.main'
                                : 'primary.main',
                          fontSize: '0.75rem',
                        }}
                      >
                        {notification.type === 'success'
                          ? '✓'
                          : notification.type === 'warning'
                            ? '!'
                            : 'i'}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: notification.read ? 400 : 600,
                            color: 'text.primary',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.8125rem',
                            color: 'text.secondary',
                            mt: 0.25,
                            display: 'block',
                          }}
                        >
                          {notification.description}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: 'text.disabled',
                            mt: 0.5,
                            display: 'block',
                          }}
                        >
                          {notification.time}
                        </Typography>
                      </Box>
                      <IconButton
                        size='small'
                        sx={{
                          width: 24,
                          height: 24,
                          opacity: 0.5,
                          '&:hover': { opacity: 1 },
                          position: 'absolute',
                          right: 8,
                          top: 8,
                        }}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
                <Divider />
                <MenuItem
                  sx={{ justifyContent: 'center', py: 1.5, fontSize: '0.8125rem' }}
                  onClick={() => {
                    navigate(NOTIFICATION_PATHS.list);
                    handleNotificationClose();
                  }}
                >
                  查看全部通知
                </MenuItem>
              </Menu>
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
                    navigate(DASHBOARD_PATHS.profile);
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

              {MobileNavComponent && onMobileMenuOpen && onMobileMenuClose && (
                <MobileNavComponent
                  open={mobileMenuOpen}
                  onClose={onMobileMenuClose}
                  onOpen={onMobileMenuOpen}
                />
              )}
            </>
          )}
        </Box>
      </Box>

      {showBreadcrumbs && (
        <Box
          sx={{
            px: { xs: 2, lg: 3 },
            py: 1,
            maxWidth: 1800,
            mx: 'auto',
            width: '100%',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Breadcrumbs
            separator={<ChevronRight style={{ width: 14, height: 14 }} />}
            aria-label='面包屑导航'
            sx={{
              '& .MuiBreadcrumbs-ol': {
                flexWrap: 'nowrap',
              },
            }}
          >
            <Link
              underline='hover'
              color='inherit'
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                fontSize: '0.8125rem',
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
              onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
            >
              <Home style={{ width: 14, height: 14 }} />
              首页
            </Link>
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1;
              return isLast ? (
                <Typography
                  key={item.code || item.path || index}
                  sx={{
                    fontSize: '0.8125rem',
                    color: 'text.primary',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  {item.label}
                </Typography>
              ) : (
                <Link
                  key={item.code || item.path || index}
                  underline='hover'
                  color='inherit'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                  onClick={() => item.path && navigate(item.path)}
                >
                  {item.label}
                </Link>
              );
            })}
          </Breadcrumbs>
        </Box>
      )}
    </Box>
  );
};

export default AppHeader;
