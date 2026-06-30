import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tooltip,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  Avatar,
  Badge as MuiBadge,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { useAppStore } from '@/store';

import {
  ChevronLeft,
  Home,
  Search,
  Star,
  Clock,
  X,
  Bookmark,
  BookmarkCheck,
  LogOut,
  User,
  Settings,
} from 'lucide-react';
import { renderIcon } from '@/lib/iconMapping';

// ---- 从路径解析模块 code（与 GlobalLayout / useTopNav 一致） ----
function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[0];
}

// ---- 已知的模块 code 集合（注册过的 top_nav plugin code） ----
const PLATFORM_ROOT_PATHS = new Set(['dashboard', 'login', 'register', 'settings', 'profile']);

function isPlatformPath(pathname: string): boolean {
  const mod = getModuleFromPath(pathname);
  if (!mod) return true;
  if (PLATFORM_ROOT_PATHS.has(mod)) return true;
  const allModuleCodes = navigationRegistryV2.getAllModuleCodes();
  return !allModuleCodes.includes(mod);
}

// ---- Props ----
export interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** 当在 Drawer 中使用时，覆盖内部 display 样式使其始终可见 */
  forceVisible?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  forceVisible,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPermission } = usePermission();

  // ---- 增强功能：搜索、收藏、最近访问 ----
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentVisits, setRecentVisits] = useState<Array<NavItem>>([]);
  const [favoritesAnchorEl, setFavoritesAnchorEl] = useState<HTMLElement | null>(null);

  // 加载收藏和最近访问
  useEffect(() => {
    const savedFavorites = localStorage.getItem('sidebar-favorites');
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch {
        // ignore
      }
    }

    const savedRecent = localStorage.getItem('sidebar-recent');
    if (savedRecent) {
      try {
        const recentItems = JSON.parse(savedRecent) as NavItem[];
        setRecentVisits(recentItems.slice(0, 5)); // 只保留最近5条
      } catch {
        // ignore
      }
    }
  }, []);

  // 记录访问历史
  useEffect(() => {
    if (location.pathname === '/dashboard') return; // 跳过首页

    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length < 2) return; // 只需要模块级路径

    const module = pathSegments[0];
    const sidebarItems = navigationRegistryV2.getSidebarNavItems(module);
    const currentItem = sidebarItems.find(
      (item) => item.path === location.pathname || location.pathname.startsWith(`${item.path}/`)
    );

    if (currentItem) {
      setRecentVisits((prev) => {
        const filtered = prev.filter((item) => item.path !== currentItem.path);
        const updated = [currentItem, ...filtered].slice(0, 5);
        localStorage.setItem('sidebar-recent', JSON.stringify(updated));
        return updated;
      });
    }
  }, [location.pathname]);

  // 切换收藏
  const toggleFavorite = useCallback((item: NavItem) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(item.path || item.code)) {
        next.delete(item.path || item.code);
      } else {
        next.add(item.path || item.code);
      }
      localStorage.setItem('sidebar-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (item: NavItem) => favorites.has(item.path || item.code),
    [favorites]
  );

  // 搜索功能
  const allNavItems = useMemo(() => {
    const items: NavItem[] = [];
    const topItems = navigationRegistryV2.getTopNavItems(() => true);

    // 收集所有导航项
    const collectItems = (navItems: NavItem[]) => {
      navItems.forEach((item) => {
        if (item.path) items.push(item);
        if (item.children) collectItems(item.children);
      });
    };

    topItems.forEach((item) => {
      if (item.path) items.push(item);
      if (item.children) collectItems(item.children);
    });

    return items;
  }, []);

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allNavItems.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        (item.path && item.path.toLowerCase().includes(query))
    );
  }, [searchQuery, allNavItems]);

  // ---- 判断当前是否处于某个模块上下文 ----
  const currentModule = useMemo(() => {
    if (isPlatformPath(location.pathname)) return null;
    return getModuleFromPath(location.pathname);
  }, [location.pathname]);

  const moduleName = useMemo(() => {
    if (!currentModule) return '';
    const module = navigationRegistryV2.getModule(currentModule);
    if (module) return module.name;
    // fallback: 从 top_nav 中查找
    const topItems = navigationRegistryV2.getTopNavItems(() => true);
    const found = topItems.find((item) => item.code === currentModule);
    return found?.label || currentModule;
  }, [currentModule]);

  // ---- 平台级导航项（按核心/插件分组，带权限过滤） ----
  const [coreNavItems, setCoreNavItems] = useState<NavItem[]>([]);
  const [pluginNavItems, setPluginNavItems] = useState<NavItem[]>([]);

  const updateGroupedNavItems = () => {
    const coreModules = navigationRegistryV2.getCoreModules(checkPermission);
    const businessModules = navigationRegistryV2.getBusinessModules(checkPermission);
    const coreItems: NavItem[] = coreModules.map((m) => ({
      code: m.code,
      label: m.name,
      icon: m.icon,
      path: m.path,
      permission: m.permission,
      order: m.order,
      moduleCode: m.code,
      moduleName: m.name,
    }));
    const pluginItems: NavItem[] = businessModules.map((m) => ({
      code: m.code,
      label: m.name,
      icon: m.icon,
      path: m.path,
      permission: m.permission,
      order: m.order,
      moduleCode: m.code,
      moduleName: m.name,
    }));
    setCoreNavItems(coreItems);
    setPluginNavItems(pluginItems);
  };

  useEffect(() => {
    updateGroupedNavItems();
    navigationRegistryV2.emitter.on('navigationUpdated', updateGroupedNavItems);
    return () => {
      navigationRegistryV2.emitter.off('navigationUpdated', updateGroupedNavItems);
    };
  }, [checkPermission]);

  // ---- 模块级导航项（带权限过滤） ----
  const moduleNavItems = useMemo<NavItem[]>(() => {
    if (!currentModule) return [];
    return navigationRegistryV2.getSidebarNavItems(currentModule, checkPermission);
  }, [currentModule, checkPermission]);

  // ---- 最终渲染的导航项 ----
  const isModuleMode = currentModule !== null;
  const displayNavItems = isModuleMode ? moduleNavItems : [];

  // ---- 公共的导航项样式 ----
  const navItemSx = (isActive: boolean, _hasPath: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    px: collapsed ? 0 : 1.5,
    py: 1.25,
    borderRadius: 1,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: 0,
    borderLeft: '3px solid',
    borderLeftColor: isActive ? 'primary.main' : 'transparent',
    bgcolor: isActive ? 'primary.50' : 'transparent',
    color: isActive ? 'primary.main' : 'text.secondary',
    transition: (theme: any) => `all 200ms ${theme.transitions.easing.easeInOut}`,
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative' as const,
    width: '100%',
    '&:hover': {
      bgcolor: isActive ? 'primary.50' : 'action.hover',
      color: 'text.primary',
      transform: 'translateX(2px)',
    },
    '&:active': {
      transform: 'translateX(1px) scale(0.99)',
    },
    '&:focus-visible': {
      outline: '2px solid',
      outlineColor: 'primary.main',
      outlineOffset: -2,
    },
  });

  return (
    <Paper
      role='navigation'
      aria-label='主导航'
      elevation={0}
      sx={{
        width: collapsed ? 64 : 240,
        transition: (theme) =>
          `width 300ms ${theme.transitions.easing.sharp}, box-shadow 200ms ${theme.transitions.easing.easeInOut}`,
        height: forceVisible ? '100%' : 'calc(100vh - 56px)',
        position: forceVisible ? 'static' : 'sticky',
        top: forceVisible ? 'auto' : 56,
        flexShrink: 0,
        display: forceVisible ? 'flex' : { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ---- 增强功能：搜索、收藏、最近访问按钮 ---- */}
      {!collapsed && (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* 搜索按钮 */}
          <TextField
            size='small'
            placeholder='搜索菜单...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => setSearchAnchorEl(e.currentTarget)}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                fontSize: '0.8125rem',
                bgcolor: 'background.default',
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search style={{ width: 14, height: 14, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position='end'>
                    <IconButton
                      size='small'
                      onClick={() => setSearchQuery('')}
                      edge='end'
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* 收藏按钮 */}
          <Tooltip title={`收藏 (${favorites.size})`}>
            <IconButton
              size='small'
              onClick={(e) => setFavoritesAnchorEl(e.currentTarget)}
              sx={{
                color: favorites.size > 0 ? 'warning.main' : 'text.secondary',
              }}
            >
              {favorites.size > 0 ? (
                <BookmarkCheck style={{ width: 16, height: 16 }} />
              ) : (
                <Bookmark style={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* ---- 搜索结果弹窗 ---- */}
      <Popover
        open={Boolean(searchAnchorEl) && filteredNavItems.length > 0}
        anchorEl={searchAnchorEl}
        onClose={() => {
          setSearchAnchorEl(null);
          setSearchQuery('');
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{
          '& .MuiPaper-root': {
            width: 280,
            maxHeight: 320,
            mt: -0.5,
          },
        }}
      >
        <List dense>
          {filteredNavItems.slice(0, 8).map((item, index) => (
            <ListItemButton
              key={item.code || index}
              onClick={() => {
                if (item.path) navigate(item.path);
                setSearchAnchorEl(null);
                setSearchQuery('');
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {item.icon ? renderIcon(item.icon, 16) : <Star style={{ width: 16, height: 16 }} />}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.path}
                slotProps={{ primary: { sx: { fontSize: '0.875rem' } }, secondary: { sx: { fontSize: '0.75rem' } } }}
              />
            </ListItemButton>
          ))}
        </List>
      </Popover>

      {/* ---- 收藏弹窗 ---- */}
      <Popover
        open={Boolean(favoritesAnchorEl)}
        anchorEl={favoritesAnchorEl}
        onClose={() => setFavoritesAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{
          '& .MuiPaper-root': {
            width: 260,
            maxHeight: 320,
            mt: -0.5,
          },
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
            我的收藏 ({favorites.size})
          </Typography>
        </Box>
        {favorites.size === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
              暂无收藏，点击导航项上的星标添加
            </Typography>
          </Box>
        ) : (
          <List dense>
            {allNavItems
              .filter((item) => favorites.has(item.path || item.code))
              .slice(0, 10)
              .map((item, index) => (
                <ListItemButton
                  key={item.code || index}
                  onClick={() => {
                    if (item.path) navigate(item.path);
                    setFavoritesAnchorEl(null);
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {item.icon ? (
                      renderIcon(item.icon, 16)
                    ) : (
                      <Star style={{ width: 16, height: 16 }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{ primary: { sx: { fontSize: '0.875rem' } } }}
                  />
                  <IconButton
                    size='small'
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item);
                    }}
                    sx={{ ml: 'auto', flexShrink: 0 }}
                  >
                    <BookmarkCheck style={{ width: 14, height: 14, color: 'warning.main' }} />
                  </IconButton>
                </ListItemButton>
              ))}
          </List>
        )}
      </Popover>

      {/* ---- 1. 导航菜单 ---- */}
      <Box
        sx={{
          py: 1,
          px: 1,
          overflowY: 'auto',
          flex: 1,
          scrollbarWidth: 'thin',
          scrollbarColor: 'divider transparent',
          '&::-webkit-scrollbar': {
            width: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'divider',
            borderRadius: 99,
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        }}
      >
        {/* ---- 模块模式：返回平台按钮 + 模块名称 ---- */}
        {isModuleMode && (
          <>
            {/* 返回平台 */}
            <Box
              component='button'
              role='menuitem'
              tabIndex={0}
              onClick={() => navigate('/dashboard')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/dashboard');
                }
              }}
              sx={navItemSx(false, true)}
            >
              <Home style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!collapsed && (
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>返回平台</Typography>
              )}
            </Box>

            {/* 模块名称标题 */}
            {!collapsed && (
              <Typography
                sx={{
                  px: 2,
                  py: 1.5,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  userSelect: 'none',
                }}
              >
                {moduleName}
              </Typography>
            )}
          </>
        )}

        {/* ---- 导航项列表 ---- */}
        {/* 平台模式：按核心/插件分组 */}
        {!isModuleMode && (
          <>
            {coreNavItems.length > 0 && (
              <>
                {!collapsed && (
                  <Typography
                    sx={{
                      px: 2,
                      py: 1,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      userSelect: 'none',
                    }}
                  >
                    核心功能
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {coreNavItems.map((item: NavItem, index: number) => {
                    const isActive = Boolean(
                      item.path === location.pathname ||
                      (item.path && location.pathname.startsWith(`${item.path}/`))
                    );
                    const NavButton = (
                      <Box
                        component='button'
                        role='menuitem'
                        tabIndex={0}
                        key={item.code || `${item.label}-${index}`}
                        onClick={() => item.path && navigate(item.path)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            item.path && navigate(item.path);
                          }
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        sx={navItemSx(isActive, true)}
                      >
                        {renderIcon(item.icon, 18) || (
                          <Typography sx={{ width: 18, height: 18, fontSize: 18 }} />
                        )}
                        {!collapsed && (
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                              {item.label}
                            </Typography>
                            {item.badge && (
                              <Chip
                                size='small'
                                label={item.badge}
                                sx={{
                                  height: 16,
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  bgcolor: 'error.main',
                                  color: 'white',
                                  '& .MuiChip-label': {
                                    px: 0.5,
                                  },
                                }}
                              />
                            )}
                          </Box>
                        )}
                        {collapsed && item.badge && (
                          <MuiBadge
                            badgeContent={item.badge}
                            color='error'
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              '& .MuiBadge-badge': {
                                fontSize: '0.625rem',
                                height: 14,
                                minWidth: 14,
                              },
                            }}
                          />
                        )}
                      </Box>
                    );
                    return collapsed ? (
                      <Tooltip
                        key={item.code || `${item.label}-${index}`}
                        title={item.label}
                        placement='right'
                        arrow
                      >
                        {NavButton}
                      </Tooltip>
                    ) : (
                      NavButton
                    );
                  })}
                </Box>
              </>
            )}

            {pluginNavItems.length > 0 && (
              <>
                <Box sx={{ my: 1, mx: 1, borderBottom: 1, borderColor: 'divider' }} />
                {!collapsed && (
                  <Typography
                    sx={{
                      px: 2,
                      py: 1,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      userSelect: 'none',
                    }}
                  >
                    业务应用
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {pluginNavItems.map((item: NavItem, index: number) => {
                    const isActive = Boolean(
                      item.path === location.pathname ||
                      (item.path && location.pathname.startsWith(`${item.path}/`))
                    );
                    const NavButton = (
                      <Box
                        component='button'
                        role='menuitem'
                        tabIndex={0}
                        key={item.code || `${item.label}-${index}`}
                        onClick={() => item.path && navigate(item.path)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            item.path && navigate(item.path);
                          }
                        }}
                        aria-current={isActive ? 'page' : undefined}
                        sx={navItemSx(isActive, true)}
                      >
                        {renderIcon(item.icon, 18) || (
                          <Typography sx={{ width: 18, height: 18, fontSize: 18 }} />
                        )}
                        {!collapsed && (
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                              {item.label}
                            </Typography>
                            {item.badge && (
                              <Chip
                                size='small'
                                label={item.badge}
                                sx={{
                                  height: 16,
                                  fontSize: '0.625rem',
                                  fontWeight: 600,
                                  bgcolor: 'error.main',
                                  color: 'white',
                                  '& .MuiChip-label': {
                                    px: 0.5,
                                  },
                                }}
                              />
                            )}
                          </Box>
                        )}
                        {collapsed && item.badge && (
                          <MuiBadge
                            badgeContent={item.badge}
                            color='error'
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              '& .MuiBadge-badge': {
                                fontSize: '0.625rem',
                                height: 14,
                                minWidth: 14,
                              },
                            }}
                          />
                        )}
                      </Box>
                    );
                    return collapsed ? (
                      <Tooltip
                        key={item.code || `${item.label}-${index}`}
                        title={item.label}
                        placement='right'
                        arrow
                      >
                        {NavButton}
                      </Tooltip>
                    ) : (
                      NavButton
                    );
                  })}
                </Box>
              </>
            )}
          </>
        )}

        {/* 模块模式：sidebar_nav 列表 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {displayNavItems.map((item: NavItem, index: number) => {
            const isActive = Boolean(
              item.path === location.pathname ||
              (item.path && location.pathname.startsWith(`${item.path}/`))
            );
            const NavButton = (
              <Box
                component='button'
                role='menuitem'
                tabIndex={0}
                key={item.code || `${item.label}-${index}`}
                onClick={() => item.path && navigate(item.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    item.path && navigate(item.path);
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                sx={navItemSx(isActive, item.path ? true : false)}
              >
                {item.icon ? (
                  renderIcon(item.icon, 18)
                ) : (
                  <Typography
                    sx={{
                      width: 18,
                      height: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {item.label.charAt(0)}
                  </Typography>
                )}
                {!collapsed && (
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{item.label}</Typography>
                )}
              </Box>
            );
            return collapsed ? (
              <Tooltip
                key={item.code || `${item.label}-${index}`}
                title={item.label}
                placement='right'
                arrow
              >
                {NavButton}
              </Tooltip>
            ) : (
              NavButton
            );
          })}
        </Box>
      </Box>

      {/* ---- 3. 底部用户信息区 + 收起按钮 ---- */}
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {/* 用户信息区 */}
        {!collapsed ? (
          <Box
            sx={{
              px: 1.5,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, primary.main, secondary.main)',
              }}
            >
              陈
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                陈管理员
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                系统管理员
              </Typography>
            </Box>
            <Tooltip title='设置'>
              <IconButton
                size='small'
                onClick={() => navigate('/settings')}
                sx={{ width: 32, height: 32 }}
              >
                <Settings style={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Tooltip
              title='陈管理员 - 系统管理员'
              placement='right'
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  fontSize: 14,
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, primary.main, secondary.main)',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/profile')}
              >
                陈
              </Avatar>
            </Tooltip>
          </Box>
        )}

        {/* 收起/展开按钮 */}
        <Box sx={{ px: 1, pb: 1, pt: 0 }}>
          <Button
            onClick={onToggleCollapse}
            sx={{
              width: '100%',
              px: collapsed ? 0 : 1.5,
              py: 0.75,
              borderRadius: 1,
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 1,
              color: 'text.secondary',
              textTransform: 'none',
              fontSize: '0.8125rem',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <ChevronLeft
              style={{
                width: 14,
                height: 14,
                transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 300ms ease',
              }}
            />
            {!collapsed && <Typography sx={{ fontSize: 13, fontWeight: 500 }}>收起菜单</Typography>}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default AppSidebar;

// ---- Helpers ----

/** 确保导航列表首位有一个"首页"项 */
function _ensureHomeItem(items: NavItem[]): NavItem[] {
  const hasHome = items.some((item) => item.path === '/dashboard' || item.code === 'home');
  if (hasHome) {
    return items;
  }
  return [
    {
      code: 'home',
      label: '首页',
      icon: 'Home',
      path: '/dashboard',
      order: -1,
    },
    ...items,
  ];
}
