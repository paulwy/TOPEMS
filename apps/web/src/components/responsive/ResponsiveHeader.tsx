import React, { useState, useCallback } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Avatar,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Bell,
  Sun,
  Moon,
  User,
  X,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Home,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Settings,
  Workflow,
  MessageSquare,
  FolderOpen,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useResponsive } from '../../hooks/useResponsive';
import { ModeToggle } from '../ModeToggle';
import type { NavGroup as NavItem } from '@/types/navigation';

// 模块图标映射
const moduleIconMap: Record<string, React.ReactNode> = {
  首页: <Home style={{ width: 20, height: 20 }} />,
  人力: <Users style={{ width: 20, height: 20 }} />,
  客户: <Building2 style={{ width: 20, height: 20 }} />,
  项目: <Briefcase style={{ width: 20, height: 20 }} />,
  数据: <BarChart3 style={{ width: 20, height: 20 }} />,
  财务: <BarChart3 style={{ width: 20, height: 20 }} />,
  运营: <Settings style={{ width: 20, height: 20 }} />,
  工作流: <Workflow style={{ width: 20, height: 20 }} />,
  协作: <MessageSquare style={{ width: 20, height: 20 }} />,
  更多: <MoreVertical style={{ width: 20, height: 20 }} />,
};

interface ResponsiveHeaderProps {
  navItems: NavItem[];
  onNavClick?: (item: NavItem) => void;
}

/**
 * 响应式 Header 组件
 * - 桌面端：完整导航
 * - 平板端：折叠部分导航到"更多"菜单
 * - 移动端：汉堡菜单 + Drawer
 */
export const ResponsiveHeader: React.FC<ResponsiveHeaderProps> = ({ navItems, onNavClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { isMobile, isTablet, isDesktop } = useResponsive();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // 切换展开状态
  const toggleExpand = useCallback((label: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  // 处理菜单项点击
  const handleItemClick = useCallback(
    (item: NavItem) => {
      if (item.path) {
        navigate(item.path);
        setMobileDrawerOpen(false);
        setMoreMenuAnchor(null);
        if (onNavClick) {
          onNavClick(item);
        }
      } else if (item.children) {
        toggleExpand(item.title);
      }
    },
    [navigate, onNavClick, toggleExpand]
  );

  // 渲染导航项
  const renderNavItem = (item: NavItem, index: number) => {
    const isActive =
      item.path === location.pathname || location.pathname.startsWith(item.path + '/');

    return (
      <Box
        key={item.title + index}
        sx={{
          position: 'relative',
        }}
      >
        <Box
          onClick={() => handleItemClick(item)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 1,
            cursor: 'pointer',
            color: isActive ? 'primary.main' : 'text.primary',
            fontWeight: isActive ? 600 : 400,
            borderRadius: 1,
            backgroundColor: isActive ? 'primary.light' : 'transparent',
            '&:hover': {
              backgroundColor: isActive ? 'primary.light' : 'action.hover',
            },
            transition: 'all 0.2s',
          }}
        >
          <Typography sx={{ fontSize: '0.9rem' }}>{item.title}</Typography>
          {item.children && <ChevronDown style={{ width: 14, height: 14 }} />}
        </Box>
      </Box>
    );
  };

  // 渲染移动端菜单项
  const renderMobileMenuItem = (item: NavItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.title);
    const isActive = item.path === location.pathname;
    const icon = moduleIconMap[item.title] || <FolderOpen style={{ width: 20, height: 20 }} />;

    return (
      <React.Fragment key={item.title + depth}>
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
          <ListItemText
            primary={
              <Typography
                sx={{
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'primary.main' : 'text.primary',
                }}
              >
                {item.title}
              </Typography>
            }
          />
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

        {/* 子菜单 */}
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
              {(item.children as NavItem[]).map((child) => renderMobileMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // 桌面端导航
  const renderDesktopNav = () => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        flex: 1,
        overflow: 'auto',
      }}
    >
      {navItems.map((item, index) => renderNavItem(item, index))}
    </Box>
  );

  // 平板端导航（显示部分 + 更多菜单）
  const renderTabletNav = () => {
    const visibleItems = navItems.slice(0, 3);
    const moreItems = navItems.slice(3);

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flex: 1,
          overflow: 'auto',
        }}
      >
        {visibleItems.map((item, index) => renderNavItem(item, index))}

        {moreItems.length > 0 && (
          <>
            <IconButton
              onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
              sx={{ ml: 1 }}
            >
              <MoreVertical style={{ width: 20, height: 20 }} />
            </IconButton>
            <Menu
              anchorEl={moreMenuAnchor}
              open={Boolean(moreMenuAnchor)}
              onClose={() => setMoreMenuAnchor(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              {moreItems.map((item, index) => (
                <MenuItem
                  key={item.title + index}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    minWidth: 150,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {moduleIconMap[item.title]}
                    <Typography>{item.title}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </Box>
    );
  };

  // 移动端抽屉
  const renderMobileDrawer = () => (
    <Drawer
      anchor='left'
      open={mobileDrawerOpen}
      onClose={() => setMobileDrawerOpen(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 300,
          maxWidth: '85vw',
        },
      }}
    >
      {/* 头部 */}
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
          onClick={() => setMobileDrawerOpen(false)}
          sx={{ color: 'white' }}
        >
          <X style={{ width: 20, height: 20 }} />
        </IconButton>
      </Box>

      {/* 导航菜单 */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <List component='nav'>{navItems.map((item) => renderMobileMenuItem(item))}</List>
      </Box>

      {/* 底部 */}
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1 }}>
          <Tooltip title='通知'>
            <IconButton
              onClick={() => {
                navigate('/notifications');
                setMobileDrawerOpen(false);
              }}
            >
              <Badge
                badgeContent={3}
                color='error'
              >
                <Bell style={{ width: 20, height: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>
          <ModeToggle />
          <Tooltip title='用户'>
            <IconButton>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: 12,
                  background: 'linear-gradient(135deg, primary.main, secondary.main)',
                }}
              >
                陈
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );

  return (
    <>
      <AppBar
        position='sticky'
        elevation={0}
        sx={{
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar
          sx={{
            minHeight: 56,
            px: { xs: 1, sm: 2 },
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
              marginRight: { xs: 1, sm: 3 },
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

          {/* 导航菜单 */}
          {isDesktop && renderDesktopNav()}
          {isTablet && renderTabletNav()}

          {/* 右侧工具 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 0.5, sm: 1 },
            }}
          >
            {/* 移动端汉堡菜单 */}
            {isMobile && (
              <IconButton
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ ml: 1 }}
              >
                <MenuIcon style={{ width: 24, height: 24 }} />
              </IconButton>
            )}

            {/* 桌面端/平板端工具 */}
            {!isMobile && (
              <>
                <Tooltip title='通知'>
                  <IconButton sx={{ width: 32, height: 32 }}>
                    <Badge
                      badgeContent={3}
                      color='error'
                    >
                      <Bell style={{ width: 20, height: 20 }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <ModeToggle />
                <Tooltip title='用户'>
                  <IconButton sx={{ width: 32, height: 32 }}>
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
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* 移动端抽屉 */}
      {renderMobileDrawer()}
    </>
  );
};

export default ResponsiveHeader;
