import React from 'react';
import { Box } from '@mui/material';
import { BottomTabBar, MobileHeader, PageTransition } from '@/components/mobile';
import type { MobileHeaderProps, TabItem } from '@/components/mobile';

/**
 * MobileLayoutV3 — Industrial OS 移动端布局（mobile module 宿主壳）
 *
 * 定案（2026-10-16）：
 * - 主路由恒用 GlobalLayoutV3（桌面壳），不再有设备分流 / SmartLayout。
 * - `route.module === 'mobile'`（/mobile/*）的路由不套全局壳，
 *   由本布局承载（ProtectedRouteWrapper 分流），即移动端模块自带壳。
 *
 * 与旧 `components/mobile/MobileLayout` 的差异：仅替换外层为 Industrial OS
 * 视觉（CSS 变量 `--bg-primary`，随 `data-theme` 明暗自适应），内部复用同一套
 * 移动端原语（MobileHeader / BottomTabBar / PageTransition），
 * API 与旧布局完全对齐，迁移为纯 import 替换、行为不丢。
 */
export interface MobileLayoutV3Props extends MobileHeaderProps {
  children: React.ReactNode;
  showTabBar?: boolean;
  activeTab?: string;
  tabs?: TabItem[];
  onTabChange?: (tabId: string) => void;
  bottomPadding?: boolean;
  enableTransition?: boolean;
  safeAreaBottom?: boolean;
}

export const MobileLayoutV3: React.FC<MobileLayoutV3Props> = ({
  children,
  showTabBar = true,
  activeTab,
  tabs,
  onTabChange,
  bottomPadding = true,
  enableTransition = true,
  safeAreaBottom = true,
  ...headerProps
}) => {
  const content = enableTransition ? <PageTransition>{children}</PageTransition> : children;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <MobileHeader {...headerProps} />

      <Box
        component='main'
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          pb: showTabBar && bottomPadding ? 7 : 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {content}
      </Box>

      {showTabBar && tabs && tabs.length > 0 && (
        <Box sx={{ pb: safeAreaBottom ? 'env(safe-area-inset-bottom, 20px)' : 0 }}>
          <BottomTabBar
            tabs={tabs}
            activeTab={activeTab || ''}
            onChange={onTabChange}
          />
        </Box>
      )}
    </Box>
  );
};

export default MobileLayoutV3;
