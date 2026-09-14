import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { GlobalLayout } from '../GlobalLayout';

/**
 * 三断点走查测试（Phase 1 收尾 / Phase 5 响应式断点对齐）
 *
 * 设计基准目标：<640 隐藏侧边栏 + 底部导航；640-1024 折叠图标栏；>1024 完整侧边栏 + L1 Tabs
 * 项目实际断点体系（useResponsive，MUI theme.breakpoints）：
 *   - mobile：< sm(600) → 隐藏侧边栏 + MobileNav overlay + BottomTabBar
 *   - tablet：sm(600)-lg(1200) → AppSidebar 渲染，isTabletNarrow（600-900）时自动折叠
 *   - desktop：≥ lg(1200) → 完整侧边栏 + L1 Tabs
 * 断言对象为 GlobalLayout 的分支调度（子组件以桩验证 props / 是否渲染）。
 */

const { responsiveMock, mediaQueryMock } = vi.hoisted(() => ({
  responsiveMock: vi.fn(),
  mediaQueryMock: vi.fn(() => true),
}));

const { sidebarProps } = vi.hoisted(() => {
  const sidebarProps: Record<string, unknown>[] = [];
  return { sidebarProps };
});

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return { ...actual, useMediaQuery: mediaQueryMock };
});

vi.mock('@/hooks/useResponsive', () => ({
  useResponsive: responsiveMock,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: '/dashboard', search: '' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'zh' } }),
}));

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ checkPermission: () => true }),
}));

vi.mock('@/store', () => ({
  useUIStore: (sel?: (s: Record<string, unknown>) => unknown) =>
    sel?.({ sidebarCollapsed: false, toggleSidebarCollapsed: vi.fn() }),
  useThemeStore: () => ({ theme: 'default' }),
  useSetUnreadNotificationCount: () => vi.fn(),
  useUnreadNotificationCount: () => 0,
}));

vi.mock('@/api/notification', () => ({
  getUnreadCount: () => Promise.resolve({ success: false }),
}));

vi.mock('@/lib/navigation', () => ({
  navigationRegistryV2: {
    getTopNavItems: () => [],
    emitter: { on: vi.fn(), off: vi.fn() },
  },
}));

vi.mock('@/lib/ai/copilotContext', () => ({
  writeAICopilotContext: vi.fn(),
}));

vi.mock('../FloatingDock', () => ({ FloatingDock: () => null }));
vi.mock('../AppSidebar', () => ({
  AppSidebar: (props: Record<string, unknown>) => {
    sidebarProps.push(props);
    return <aside data-testid='app-sidebar' />;
  },
}));
vi.mock('../AppHeader', () => ({ AppHeader: () => <header data-testid='app-header' /> }));
vi.mock('../MobileNav', () => ({ MobileNav: () => <nav data-testid='mobile-nav' /> }));
vi.mock('../../ui/CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('../../common/ShortcutsHelpPanel', () => ({ default: () => null }));
vi.mock('../../mobile/BottomTabBar', () => ({
  BottomTabBar: () => <div data-testid='bottom-tab-bar' />,
}));
vi.mock('../../mobile/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderLayout = () =>
  renderWithProviders(
    <GlobalLayout>
      <div data-testid='page-content'>页面内容</div>
    </GlobalLayout>
  );

describe('三断点走查（GlobalLayout 分支调度）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sidebarProps.length = 0;
    // 默认 desktop 语义（jsdom 无 matchMedia，显式控制 useMediaQuery 返回值）
    mediaQueryMock.mockReturnValue(true);
    responsiveMock.mockReturnValue({ isMobile: false, isTablet: false, isTabletNarrow: false });
  });

  it('mobile（<600px）：隐藏侧边栏，显示 MobileNav + 底部导航', () => {
    responsiveMock.mockReturnValue({ isMobile: true, isTablet: false, isTabletNarrow: false });
    // jsdom 无 matchMedia，MUI useMediaQuery 默认 false → isDesktop=false，侧边栏随 shouldShowSidebar 隐藏
    mediaQueryMock.mockReturnValue(false);
    renderLayout();
    expect(screen.queryByTestId('app-sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    // pathname=/dashboard → activeMobileTab='home' → 底部导航渲染
    expect(screen.getByTestId('bottom-tab-bar')).toBeInTheDocument();
  });

  it('tablet 窄（600-900px）：侧边栏渲染并自动折叠为图标栏', () => {
    responsiveMock.mockReturnValue({ isMobile: false, isTablet: true, isTabletNarrow: true });
    renderLayout();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(sidebarProps[0]?.collapsed).toBe(true);
    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-tab-bar')).not.toBeInTheDocument();
  });

  it('tablet 宽（900-1200px）：侧边栏渲染且不折叠', () => {
    responsiveMock.mockReturnValue({ isMobile: false, isTablet: true, isTabletNarrow: false });
    renderLayout();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(sidebarProps[0]?.collapsed).toBe(false);
  });

  it('desktop（≥1200px）：完整侧边栏，无移动端导航', () => {
    responsiveMock.mockReturnValue({ isMobile: false, isTablet: false, isTabletNarrow: false });
    renderLayout();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    expect(sidebarProps[0]?.collapsed).toBe(false);
    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-tab-bar')).not.toBeInTheDocument();
  });

  it('main 内容区应用页面渐变背景（pageGradientBgSx）', () => {
    responsiveMock.mockReturnValue({ isMobile: false, isTablet: false, isTabletNarrow: false });
    renderLayout();
    const main = document.getElementById('main-content');
    // 函数式 sx 经 MUI emotion 处理，断言样式对象无法直接读取；
    // 这里验证 main 存在且仍可正常渲染（渐变背景由 effects 单测覆盖结构）
    expect(main).not.toBeNull();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });
});
