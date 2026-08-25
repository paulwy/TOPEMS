/**
 * MobilePageTemplate - 移动端页面模板
 *
 * 面向 `apps/web/src/pages/mobile/*` 的小屏页面，封装 MobileLayout + PageContainer
 * + 可选 PullToRefresh 的标准外壳，消除各页面重复的布局胶水代码。
 *
 * 与桌面端模板（ListPageTemplate 等）的差异：
 * - 全屏宽度（maxWidth=false）、触摸友好的头部按钮（44x44 命中区）
 * - 通过 `bottomNav` 插槽注入底部导航（BottomTabBar 为 position:fixed，由各页自配 tabs）
 * - 通过 `onRefresh` 启用下拉刷新
 *
 * 使用 designTokens 控制间距，不硬编码 px/rem。
 */
import React from 'react';
import { Box } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { MobileLayout, PullToRefresh } from '@/components/mobile';
import type { MobileHeaderProps } from '@/components/mobile';
import { PageContainer } from '@/components/common';

export interface MobilePageTemplateProps {
  /** 页面标题（渲染于 MobileHeader 居中） */
  title: string;
  /** 页面主体内容 */
  children: React.ReactNode;
  /** 底部导航插槽；通常传入 <BottomTabBar tabs={...} activeTab={...} onChange={...} /> */
  bottomNav?: React.ReactNode;
  /** 头部右侧操作按钮数组，横向排列于通知铃铛左侧 */
  actions?: React.ReactNode[];
  /** 下拉刷新回调；传入后用 PullToRefresh 包裹 children */
  onRefresh?: () => Promise<void>;
  /**
   * 透传到 MobileHeader 的额外配置（showBack / onBackClick / showMenu /
   * showNotifications / notificationCount / showSearch / onSearchClick 等）。
   * 注意：`rightActions` 由 `actions` prop 接管，此处传入会被忽略。
   */
  headerProps?: Partial<MobileHeaderProps>;
}

/**
 * 底部导航固定栏保留高度（BottomTabBar 内部 height: 56）。
 * 用 designTokens 组合表达，避免硬编码。
 */
const BOTTOM_NAV_RESERVED_HEIGHT = designTokens.spacing['2xl'] + designTokens.spacing.sm; // 48 + 8 = 56

export const MobilePageTemplate: React.FC<MobilePageTemplateProps> = ({
  title,
  children,
  bottomNav,
  actions,
  onRefresh,
  headerProps,
}) => {
  const hasBottomNav = !!bottomNav;

  // actions prop 接管 rightActions；从 headerProps 中剔除避免冲突
  const { rightActions: _ignoredRightActions, ...restHeaderProps } = headerProps ?? {};

  const rightActions =
    actions && actions.length > 0 ? (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: designTokens.spacing.xs }}>
        {actions}
      </Box>
    ) : undefined;

  const body = onRefresh ? (
    <PullToRefresh onRefresh={onRefresh}>{children}</PullToRefresh>
  ) : (
    children
  );

  return (
    <MobileLayout
      title={title}
      rightActions={rightActions}
      showTabBar={false}
      bottomPadding={false}
      {...restHeaderProps}
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
      >
        {body}
        {hasBottomNav && <Box sx={{ height: BOTTOM_NAV_RESERVED_HEIGHT, flexShrink: 0 }} />}
      </PageContainer>
      {hasBottomNav && bottomNav}
    </MobileLayout>
  );
};

export default MobilePageTemplate;
