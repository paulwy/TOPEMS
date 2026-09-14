import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import axe from 'axe-core';
import { renderWithProviders } from '@/__tests__/test-utils';
import { AppHeader } from '../layout/AppHeader/AppHeader';
import { TabGroup } from '../ui/Tabs';
import { SidebarItem } from '../layout/AppSidebar/SidebarItem';

const { tMock } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'components.header_breadcrumbs.k0': '首页',
    'components.header_notifications.k0': '通知中心',
    'components.header_notifications.k1': '暂无通知',
    'components.header_notifications.k2': '查看全部通知',
    'shared.header_breadcrumbs.k0': '面包屑导航',
    'shared.header_notifications.k0': '通知',
    'shared.header_notifications.k1': '通知',
    'shared.header_notifications.k2': '全部已读',
    'shared.header_notifications.k3': '全部确认',
    'shared.header_notifications.k4': '通知设置',
    'shared.header_notifications.k5': '设置',
    'shared.header_notifications.k6': '删除',
    'components.index.k0': '请选择',
    'components.index.k1': '暂无数据',
    'components.index.k2': '确认',
    'components.index.k3': '取消',
    'layouts.global_actions.k0': '工具箱',
    'layouts.global_actions.k1': '工具箱',
    'layouts.mobile_layout.k0': '退出登录',
    'layouts.user_menu.k0': '退出登录',
    'layouts.user_menu.k1': '确认退出登录？',
    'layouts.user_menu.k2': '退出后清除本地会话需重登。您确定要退出当前账号吗？',
    'layouts.user_menu.k3': '取消',
    'layouts.user_menu.k4': '确认退出',
    'layouts.userMenu.k0': '帮助中心 & 快捷键',
  };
  return {
    tMock: (key: string): string => i18nMap[key] || key,
  };
});

vi.mock('@/i18n', () => ({
  default: { t: tMock, language: 'zh', on: () => {}, off: () => {} },
  SUPPORTED_LANGUAGES: [{ code: 'zh', name: '中文', flag: 'CN' }],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock, i18n: { language: 'zh' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return { ...actual, useMediaQuery: vi.fn(() => false) };
});

vi.mock('../layout/AppHeader/HeaderLogo', () => ({
  HeaderLogo: () => <div data-testid='header-logo' />,
}));
vi.mock('../layout/AppHeader/HeaderSearch', () => ({
  HeaderSearch: () => <div data-testid='header-search' />,
}));
vi.mock('../layout/AppHeader/HeaderNotifications', () => ({
  HeaderNotifications: () => <div data-testid='header-notifications' />,
}));
vi.mock('../layout/AppHeader/HeaderUserMenu', () => ({
  HeaderUserMenu: () => <div data-testid='header-user-menu' />,
}));
vi.mock('../layout/AppHeader/HeaderBreadcrumbs', () => ({
  HeaderBreadcrumbs: () => <div data-testid='header-breadcrumbs' />,
}));

const runAxe = async (container: HTMLElement) => {
  const results = await axe.run(container, {
    rules: {
      // jsdom 无真实视口，跳过仅运行时可判定的规则
      'color-contrast': { enabled: false },
    },
  });
  return results.violations;
};

describe('a11y runtime scan (axe-core)', () => {
  it('AppHeader（含 BusinessDomainTabs L1 Tabs）无严重违规', async () => {
    const { container } = renderWithProviders(<AppHeader checkPermission={() => true} />);
    const violations = await runAxe(container);
    const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });

  it('TabGroup 无严重违规', async () => {
    const { container } = renderWithProviders(
      <TabGroup
        items={[
          { key: 'a', label: '业务域 A' },
          { key: 'b', label: '业务域 B', disabled: true },
        ]}
        value='a'
        onChange={() => {}}
        label='测试 Tabs'
      />
    );
    const violations = await runAxe(container);
    const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });

  it('SidebarItem 无严重违规', async () => {
    const { container } = renderWithProviders(
      <SidebarItem
        active
        label='模块项'
        ariaCurrent='page'
        onClick={() => {}}
      />
    );
    const violations = await runAxe(container);
    const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious).toEqual([]);
  });
});
