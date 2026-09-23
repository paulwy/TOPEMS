import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';

import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePermission } from '../../hooks/usePermission';
import { useResponsive } from '../../hooks/useResponsive';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { NavItem } from '@/lib/navigation/types';
import {
  useUIStore,
  useSetUnreadNotificationCount,
  useUnreadNotificationCount,
} from '@/store';
import i18n from '@/i18n';
import { getUnreadCount } from '@/api/notification';
import { apiLogger } from '@/utils/logger';
import { FloatingDock } from './FloatingDock';
import { MobileNav } from './MobileNav';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { CommandPalette } from '../ui/CommandPalette';
import ShortcutsHelpPanel from '../common/ShortcutsHelpPanel';
import { BottomTabBar, type TabItem } from '../mobile/BottomTabBar';
import { PageTransition } from '../mobile/PageTransition';
import { pageGradientBgSx } from '@/theme/effects';
import { Home, ListTodo, ScanLine, CheckSquare, User } from 'lucide-react';
import { DASHBOARD_PATHS, MOBILE_TAB_PATHS } from '@/routes/dashboard';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { DOC_PATHS } from '@/modules/doc/config';
import { AI_PATHS } from '@/modules/ai/config';
import { writeAICopilotContext } from '@/lib/ai/copilotContext';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { checkPermission } = usePermission();
  const navigate = useNavigate();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);

  const muiTheme = useTheme();
  const { isMobile, isTablet, isTabletNarrow } = useResponsive();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('lg'));

  // 动态获取未读通知数（移动端审批 Tab 徽章）— 作为应用唯一的 unread 请求源
  const setUnreadNotificationCount = useSetUnreadNotificationCount();
  const unreadCount = useUnreadNotificationCount();

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await getUnreadCount();
        if (!cancelled && res.success && typeof res.data === 'number') {
          setUnreadNotificationCount(res.data);
        }
      } catch (err) {
        apiLogger.debug('Failed to fetch unread count for badge:', err);
      }
    };
    fetchUnread();
    const timer = setInterval(fetchUnread, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [setUnreadNotificationCount]);

  const shouldShowSidebar = isTablet || isDesktop;
  const isTabletAutoCollapsed = isTabletNarrow;

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

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), []);
  const openAiCopilot = useCallback(() => {
    writeAICopilotContext({
      pathname: window.location.pathname || '/',
      source: 'shortcut',
      intent: 'chat',
      breadcrumbs: [i18n.t('shared.global_layout.k0')],
    });
    navigate(AI_PATHS.root);
  }, [navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Cmd/Ctrl + K: 打开命令面板
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShortcutHelpOpen(false);
        openCommandPalette();
        return;
      }

      // Cmd/Ctrl + /: 显示快捷键帮助
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        }
        setShortcutHelpOpen((v) => !v);
        return;
      }

      // Cmd/Ctrl + Space: 唤起 AI Copilot
      if ((e.metaKey || e.ctrlKey) && e.key === ' ') {
        e.preventDefault();
        openAiCopilot();
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

        // Esc: 关闭命令面板 / 快捷键帮助 / 移动端菜单
        if (e.key === 'Escape') {
          if (shortcutHelpOpen) {
            setShortcutHelpOpen(false);
            return;
          }
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
              navigate(DASHBOARD_PATHS.dashboard);
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
    openAiCopilot,
    commandPaletteOpen,
    shortcutHelpOpen,
    mobileMenuOpen,
    toggleSidebarCollapsed,
    navigate,
  ]);

  // 移动端底部Tab配置
  const mobileTabs: TabItem[] = [
    { id: 'home', label: t('layout.home'), icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: t('layout.tasks'), icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: t('layout.scan'), icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: t('layout.approval'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { id: 'profile', label: t('layout.profile'), icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  // 根据路径判断当前激活的Tab
  const activeMobileTab = (() => {
    const path = location.pathname;
    if (path === DASHBOARD_PATHS.dashboard || path === DASHBOARD_PATHS.root) return 'home';
    if (path.startsWith(MOBILE_TAB_PATHS.tasks) || path.startsWith(MOBILE_PATHS.tasks))
      return 'tasks';
    if (path.startsWith(MOBILE_TAB_PATHS.scan) || path.startsWith(MOBILE_PATHS.scan)) return 'scan';
    if (path.startsWith(MOBILE_TAB_PATHS.approval) || path.startsWith(MOBILE_TAB_PATHS.approvals))
      return 'approval';
    if (path.startsWith(DASHBOARD_PATHS.profile) || path.startsWith(MOBILE_PATHS.profile))
      return 'profile';
    return '';
  })();

  const handleTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(DASHBOARD_PATHS.dashboard);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scan);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        navigate(MOBILE_PATHS.profile);
        break;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
          color: 'common.white',
          textDecoration: 'none',
          borderRadius: '0 0 8px 0',
          fontWeight: 600,
          '&:focus': {
            left: 0,
          },
        }}
      >
        {t('layout.skip_to_content')}
      </Box>

      <AppHeader
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
        onMobileMenuClose={() => setMobileMenuOpen(false)}
        mobileNavComponent={MobileNav}
        showCentralNav
        checkPermission={checkPermission}
      />

      <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        {/* Sidebar：平板端（sm-md = 600px-1199px）持久化显示，窄平板（sm = 600-899px）自动折叠为图标栏 */}
        {shouldShowSidebar && (
          <AppSidebar
            collapsed={isTabletAutoCollapsed || sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
            forceVisible={isTablet}
          />
        )}

        {/* < sm (< 600px) 使用 MobileNav overlay */}
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
          sx={(theme) => ({
            ...pageGradientBgSx(theme),
            flex: 1,
            p: { xs: 2, sm: 3, lg: 4 },
            maxWidth: 1800,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            pb: { xs: 9, sm: 3, lg: 4 },
          })}
        >
          {isMobile ? (
            <PageTransition>{children}</PageTransition>
          ) : (
            <Box
              key={location.pathname}
              className='cyber-page-enter'
            >
              {children}
            </Box>
          )}
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
              {t('layout.copyright', { year: new Date().getFullYear() })}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography
                component='a'
                href={DASHBOARD_PATHS.helpCenter}
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {t('layout.help_center')}
              </Typography>
              <Typography
                component='a'
                href={DOC_PATHS.knowledgeBase}
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {t('layout.user_guide')}
              </Typography>
              <Typography
                component='a'
                href='mailto:support@topems.com'
                sx={{
                  fontSize: 12,
                  color: 'text.secondary',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                {t('layout.contact_support')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <FloatingDock />

      <CommandPalette
        open={commandPaletteOpen}
        onClose={closeCommandPalette}
      />

      <ShortcutsHelpPanel
        isOpen={shortcutHelpOpen}
        onClose={() => setShortcutHelpOpen(false)}
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
