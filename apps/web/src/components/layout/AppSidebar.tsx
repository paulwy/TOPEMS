import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { ChevronLeft, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { navigationRegistry, type NavItem } from '@/lib/NavigationRegistry';

// ---- Lucide 图标映射（与 GlobalLayout.tsx 保持一致的 renderIcon 模式） ----
import {
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  User,
  FileText,
  Calendar,
  DollarSign,
  LayoutDashboard,
  FolderKanban,
  FlaskConical,
  Truck,
  Wallet,
  Factory,
  Bot,
  Map,
  MessageCircle,
  Shield,
  GitBranch,
  Warehouse,
  Activity,
  Package,
  FileSearch,
  BookOpen,
  Layers,
  Tag,
  ListTodo,
  CheckCircle,
  Leaf,
  FlaskRound,
  Microscope,
  TestTube,
  ClipboardCheck,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Handshake,
  Award,
  Target,
  ShoppingCart,
  FileSignature,
  Download,
  Upload,
  ClipboardList,
  Hash,
  ListOrdered,
  PieChart,
  Database,
  FolderOpen,
  LayoutTemplate,
  HelpCircle,
  Archive,
  BarChart2,
  Clock,
  Mail,
  Smartphone,
  CloudOff,
  ScanLine,
  Network,
  Link,
  SlidersHorizontal,
  Globe,
  Plug,
  Zap,
  Star,
  Wrench,
  Monitor,
  AlertOctagon,
  FileCheck,
  Rocket,
  Pencil,
  History,
  Key,
  UserCheck,
  Building,
  Calculator,
  Book,
  CreditCard,
  GraduationCap,
  MessageSquare,
  Grid3X3,
  GanttChart,
  ShieldAlert,
  Plus,
} from 'lucide-react';

const lucideIcons: Record<string, React.ComponentType<{ style?: React.CSSProperties }> | null> = {
  Home,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  User,
  FileText,
  Calendar,
  DollarSign,
  LayoutDashboard,
  FolderKanban,
  FlaskConical,
  Truck,
  Wallet,
  Factory,
  Bot,
  Map,
  MessageCircle,
  Shield,
  GitBranch,
  Warehouse,
  Activity,
  Package,
  FileSearch,
  BookOpen,
  Layers,
  Tag,
  ListTodo,
  CheckCircle,
  Leaf,
  FlaskRound,
  Microscope,
  TestTube,
  ClipboardCheck,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Handshake,
  Award,
  Target,
  ShoppingCart,
  FileSignature,
  Download,
  Upload,
  ClipboardList,
  Hash,
  ListOrdered,
  PieChart,
  Database,
  FolderOpen,
  LayoutTemplate,
  HelpCircle,
  Archive,
  BarChart2,
  Clock,
  Mail,
  Smartphone,
  CloudOff,
  ScanLine,
  Network,
  Link,
  SlidersHorizontal,
  Globe,
  Plug,
  Zap,
  Star,
  Wrench,
  Monitor,
  AlertOctagon,
  FileCheck,
  Rocket,
  Pencil,
  History,
  Key,
  UserCheck,
  Building,
  Calculator,
  Book,
  CreditCard,
  GraduationCap,
  MessageSquare,
  Grid3X3,
  GanttChart,
  ShieldAlert,
  Plus,
};

const renderIcon = (iconName?: string, size = 18) => {
  if (!iconName) return null;
  const IconComponent = lucideIcons[iconName];
  if (!IconComponent) return null;
  return <IconComponent style={{ width: size, height: size }} />;
};

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
  if (!mod) return true; // "/" 或无路径段 → 平台级
  // 已知的平台级路由
  if (PLATFORM_ROOT_PATHS.has(mod)) return true;
  // 是否在注册的模块中
  const allPluginCodes = navigationRegistry.getAllPluginCodes();
  return !allPluginCodes.includes(mod);
}

// ---- Props ----
export interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkPermission } = usePermission();

  // ---- 判断当前是否处于某个模块上下文 ----
  const currentModule = useMemo(() => {
    if (isPlatformPath(location.pathname)) return null;
    return getModuleFromPath(location.pathname);
  }, [location.pathname]);

  const moduleName = useMemo(() => {
    if (!currentModule) return '';
    const card = navigationRegistry.getModuleCard(currentModule);
    if (card) return card.name;
    // fallback: 从 top_nav 中查找
    const topItems = navigationRegistry.getNavItemsByPermission(() => true);
    const found = topItems.find((item) => item.code === currentModule);
    return found?.label || currentModule;
  }, [currentModule]);

  // ---- 平台级导航项（按核心/插件分组，带权限过滤） ----
  const [coreNavItems, setCoreNavItems] = useState<NavItem[]>([]);
  const [pluginNavItems, setPluginNavItems] = useState<NavItem[]>([]);

  const updateGroupedNavItems = () => {
    const grouped = navigationRegistry.getNavItemsGroupedBySource(checkPermission);
    setCoreNavItems(grouped.core);
    setPluginNavItems(grouped.plugin);
  };

  useEffect(() => {
    updateGroupedNavItems();
    navigationRegistry.emitter.on('navigationUpdated', updateGroupedNavItems);
    return () => {
      navigationRegistry.emitter.off('navigationUpdated', updateGroupedNavItems);
    };
  }, [checkPermission]);

  // ---- 模块级导航项（带权限过滤） ----
  const moduleNavItems = useMemo<NavItem[]>(() => {
    if (!currentModule) return [];
    const allItems = navigationRegistry.getSidebarNavItems(currentModule);
    // 按权限过滤
    return allItems.filter((item) => !item.permission || checkPermission(item.permission));
  }, [currentModule, checkPermission]);

  // ---- 最终渲染的导航项 ----
  const isModuleMode = currentModule !== null;
  const displayNavItems = isModuleMode ? moduleNavItems : [];

  // ---- 公共的导航项样式 ----
  const navItemSx = (isActive: boolean, hasPath: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    px: collapsed ? 0 : 1.5,
    py: 1.25,
    borderRadius: 1,
    cursor: hasPath ? 'pointer' : 'default',
    borderLeft: '3px solid',
    borderLeftColor: isActive ? 'primary.main' : 'transparent',
    bgcolor: isActive ? 'primary.50' : 'transparent',
    color: isActive ? 'primary.main' : 'text.secondary',
    transition: 'all 150ms ease',
    justifyContent: collapsed ? 'center' : 'flex-start',
    '&:hover': {
      bgcolor: isActive ? 'primary.50' : 'action.hover',
      color: 'text.primary',
    },
  });

  return (
    <Paper
      elevation={0}
      sx={{
        width: collapsed ? 64 : 240,
        transition: 'width 300ms ease',
        height: 'calc(100vh - 56px)',
        position: 'sticky',
        top: 56,
        flexShrink: 0,
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
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
              onClick={() => navigate('/dashboard')}
              sx={navItemSx(false, true)}
            >
              <Home style={{ width: 18, height: 18, flexShrink: 0 }} />
              {!collapsed && (
                <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                  返回平台
                </Typography>
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
                      px: 2, py: 1, fontSize: 12, fontWeight: 600,
                      color: 'text.secondary', textTransform: 'uppercase',
                      letterSpacing: '0.5px', userSelect: 'none',
                    }}
                  >
                    核心功能
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {coreNavItems.map((item: NavItem, index: number) => {
                    const isActive = Boolean(
                      item.path === location.pathname ||
                      (item.path && location.pathname.startsWith(item.path + '/'))
                    );
                    return (
                      <Box
                        key={item.code || `${item.label}-${index}`}
                        onClick={() => item.path && navigate(item.path)}
                        sx={navItemSx(isActive, true)}
                      >
                        {renderIcon(item.icon, 18) || (
                          <Typography sx={{ width: 18, height: 18, fontSize: 18 }} />
                        )}
                        {!collapsed && (
                          <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                            {item.label}
                          </Typography>
                        )}
                      </Box>
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
                      px: 2, py: 1, fontSize: 12, fontWeight: 600,
                      color: 'text.secondary', textTransform: 'uppercase',
                      letterSpacing: '0.5px', userSelect: 'none',
                    }}
                  >
                    业务应用
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {pluginNavItems.map((item: NavItem, index: number) => {
                    const isActive = Boolean(
                      item.path === location.pathname ||
                      (item.path && location.pathname.startsWith(item.path + '/'))
                    );
                    return (
                      <Box
                        key={item.code || `${item.label}-${index}`}
                        onClick={() => item.path && navigate(item.path)}
                        sx={navItemSx(isActive, true)}
                      >
                        {renderIcon(item.icon, 18) || (
                          <Typography sx={{ width: 18, height: 18, fontSize: 18 }} />
                        )}
                        {!collapsed && (
                          <Typography sx={{ fontSize: 14, fontWeight: isActive ? 600 : 500 }}>
                            {item.label}
                          </Typography>
                        )}
                      </Box>
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
              (item.path && location.pathname.startsWith(item.path + '/'))
            );

            return (
              <Box
                key={item.code || `${item.label}-${index}`}
                onClick={() => item.path && navigate(item.path)}
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
                  <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                    {item.label}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ---- 3. 收起/展开按钮 ---- */}
      <Box
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          onClick={onToggleCollapse}
          sx={{
            width: '100%',
            px: collapsed ? 0 : 1.5,
            py: 1,
            borderRadius: 1,
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1,
            color: 'text.secondary',
            textTransform: 'none',
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
          {!collapsed && (
            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
              收起菜单
            </Typography>
          )}
        </Button>
      </Box>
    </Paper>
  );
};

export default AppSidebar;

// ---- Helpers ----

/** 确保导航列表首位有一个"首页"项 */
function ensureHomeItem(items: NavItem[]): NavItem[] {
  const hasHome = items.some(
    (item) => item.path === '/dashboard' || item.code === 'home'
  );
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
