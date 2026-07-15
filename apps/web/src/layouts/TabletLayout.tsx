import React, { useEffect } from 'react';
import { Box, Drawer, Grid, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/layout';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { useUIStore } from '@/store';
import { getDeviceInfo } from '@/utils/mobileDetector';

interface TabletLayoutProps {
  children: React.ReactNode;
}

export const TabletLayout: React.FC<TabletLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);

  // 横屏/竖屏检测：横屏时内容区支持双栏布局
  const isLandscape = useMediaQuery('(orientation: landscape)');

  // 侧边栏宽度：折叠 64px（仅图标），展开 240px
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  // 监听设备变化：切换为 Mobile 时跳转回 dashboard
  useEffect(() => {
    const handleResize = () => {
      const deviceInfo = getDeviceInfo();
      if (deviceInfo.isMobile) {
        navigate('/dashboard');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 顶部导航：保留搜索栏和用户菜单 */}
      <AppHeader showCentralNav={false} />

      <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        {/* 持久化侧边栏（非抽屉式）：宽度 240px，可折叠为 64px */}
        <Drawer
          variant='permanent'
          sx={{
            width: sidebarWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: sidebarWidth,
              boxSizing: 'border-box',
              position: 'static',
              border: 'none',
              overflow: 'hidden',
              boxShadow: 'none',
              bgcolor: 'transparent',
              height: '100%',
            },
          }}
        >
          <AppSidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapsed}
            forceVisible
          />
        </Drawer>

        {/* 内容区：Grid 布局，横屏支持双栏模式（列表+详情） */}
        <Box
          component='main'
          id='main-content'
          sx={{
            flex: 1,
            backgroundColor: 'background.default',
            p: { xs: 2, sm: 3 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <Grid
            container
            spacing={isLandscape ? 3 : 2}
            sx={{ flex: 1, alignContent: 'flex-start' }}
          >
            <Grid size={{ xs: 12 }}>{children}</Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
};

export default TabletLayout;
