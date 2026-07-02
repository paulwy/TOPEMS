import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, useTheme, useMediaQuery, Drawer } from '@mui/material';

import { useLocation, useNavigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import { useAppStore } from '@/store';
import { FloatingAIHelper } from '../ai/FloatingAIHelper';
import { MobileNav } from './MobileNav';
import { Sidebar as AIPluginSidebar } from './Sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { CommandPalette } from '../ui/CommandPalette';
import { BottomTabBar, type TabItem } from '../mobile/BottomTabBar';
import { PageTransition } from '../mobile/PageTransition';
import { Home, ListTodo, ScanLine, CheckSquare, User } from 'lucide-react';

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

function getModuleFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;
  return segments[0];
}

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const location = useLocation();
  const theme = useTheme();
  const { checkPermission } = usePermission();
  const navigate = useNavigate();
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useAppStore((state) => state.toggleSidebarCollapsed);

  // 响应式断点：优化计划要求 < 900px 折叠，< 768px 隐藏为 overlay
  // md = 900px，自定义 tablet = 768px
  const isMobile = useMediaQuery('(max-width:767px)'); // < 768px
  const isTabletCollapsed = useMediaQuery('(min-width:768px) and (max-width:899px)'); // 768px - 900px 自动折叠
  const shouldShowSidebar = useMediaQuery('(min-width:768px)'); // ≥ 768px 显示 Sidebar

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [_topNavItems, setTopNavItems] = useState<NavItem[]>(() => {
    return navigationRegistryV2.getTopNavItems(checkPermission);
  });

  useEffect(() => {
    const updateNavItems = () => {
      setTopNavItems(navigationRegistryV2.getTopNavItems(checkPermission));
    };
    navigationRegistryV2.emitter.on('navigationUpdated', updateNavItems);
    return function cleanup() {
      navigationRegistryV2.emitter.off('navigationUpdated', updateNavItems);
    };
  }, [checkPermission]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd/Ctrl + K: 打开命令面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // 不在输入框中时的快捷键
      if (!isInput) {
        // / 或 s: 聚焦搜索（打开命令面板）
        if (e.key === '/' || e.key === 's') {
          e.preventDefault();
          openCommandPalette();
          return;
        }

        // Esc: 关闭命令面板或移动端菜单
        if (e.key === 'Escape') {
          if (commandPaletteOpen) {
            closeCommandPalette();
          }
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
          return;
        }

        // b: 切换侧边栏收起/展开
        if (e.key === 'b') {
          e.preventDefault();
          toggleSidebarCollapsed();
          return;
        }

        // g + h: 跳转到首页
        if (e.key === 'g' && !e.repeat) {
          const handleGH = (evt: KeyboardEvent) => {
            if (evt.key === 'h') {
              evt.preventDefault();
              navigate('/dashboard');
            }
            document.removeEventListener('keydown', handleGH);
          };
          document.addEventListener('keydown', handleGH, { once: true });
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    openCommandPalette,
    closeCommandPalette,
    commandPaletteOpen,
    mobileMenuOpen,
    toggleSidebarCollapsed,
    navigate,
  ]);

  const currentModule = getModuleFromPath(location.pathname);

  // 移动端底部Tab配置
  const mobileTabs: TabItem[] = [
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  // 根据路径判断当前激活的Tab
  const activeMobileTab = (() => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') return 'home';
    if (path.startsWith('/tasks') || path.startsWith('/mobile/tasks')) return 'tasks';
    if (path.startsWith('/scan') || path.startsWith('/mobile/scan')) return 'scan';
    if (path.startsWith('/approval') || path.startsWith('/approvals')) return 'approval';
    if (path.startsWith('/profile') || path.startsWith('/mobile/profile')) return 'profile';
    return '';
  })();

  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate('/dashboard');
        break;
      case 'tasks':
        navigate('/mobile/tasks');
        break;
      case 'scan':
        navigate('/mobile/scan');
        break;
      case 'approval':
        navigate('/approvals');
        break;
      case 'profile':
        navigate('/mobile/profile');
        break;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SkipToContent />

      <AppHeader
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
        onMobileMenuClose={() => setMobileMenuOpen(false)}
        mobileNavComponent={MobileNav}
        showCentralNav
      />

      <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        {/* Sidebar：≥ 768px 显示，768-900px 自动折叠为图标栏 */}
        {shouldShowSidebar && (
          <AppSidebar
            collapsed={isTabletCollapsed || sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
          />
        )}

        {/* < 768px 使用 MobileNav overlay */}
        {isMobile && (
          <MobileNav
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            onOpen={() => setMobileMenuOpen(true)}
          />
        )}

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
            pb: { xs: 9, sm: 3, lg: 4 },
          }}
        >
          {isMobile ? <PageTransition>{children}</PageTransition> : children}
          <Box
            component='footer'
            sx={{
              mt: 'auto',
              backgroundColor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              py: 2,
              px: { xs: 2, sm: 3, lg: 4 },
              display: { xs: 'none', sm: 'flex' },
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
              © {new Date().getFullYear()} TOPEMS 化工新材料数字化平台
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

      <AIPluginSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pluginCode={currentModule || undefined}
      />
      <FloatingAIHelper />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={closeCommandPalette}
      />

      {isMobile && activeMobileTab && (
        <BottomTabBar
          tabs={mobileTabs}
          activeTab={activeMobileTab}
          onChange={handleTabChange}
        />
      )}
    </Box>
  );
};

export default GlobalLayout;
