import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import { AppHeader } from '../AppHeader';

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

  const tMock = (key: string): string => {
    return i18nMap[key] || key;
  };

  return { tMock };
});

vi.mock('@/i18n', () => ({
  default: {
    t: tMock,
    language: 'zh',
    on: () => {},
    off: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
    changeLanguage: () => {},
  },
  SUPPORTED_LANGUAGES: [
    { code: 'zh', name: '中文', flag: 'CN' },
    { code: 'en', name: 'English', flag: 'US' },
  ],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: 'zh',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => {
    if (i18nKey) {
      return <span>{tMock(i18nKey)}</span>;
    }
    return <span>{children}</span>;
  },
}));

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material');
  return {
    ...actual,
    useMediaQuery: vi.fn(() => false),
  };
});

vi.mock('../HeaderLogo', () => ({
  HeaderLogo: () => <div data-testid='header-logo' />,
}));

vi.mock('../HeaderSearch', () => ({
  HeaderSearch: () => <div data-testid='header-search' />,
}));

vi.mock('../HeaderNotifications', () => ({
  HeaderNotifications: () => <div data-testid='header-notifications' />,
}));

vi.mock('../HeaderUserMenu', () => ({
  HeaderUserMenu: () => <div data-testid='header-user-menu' />,
}));

vi.mock('../HeaderBreadcrumbs', () => ({
  HeaderBreadcrumbs: () => <div data-testid='header-breadcrumbs' />,
}));

describe('AppHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header element with role banner', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders HeaderLogo component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-logo')).toBeInTheDocument();
  });

  it('renders HeaderSearch component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-search')).toBeInTheDocument();
  });

  it('renders HeaderNotifications component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-notifications')).toBeInTheDocument();
  });

  it('renders HeaderUserMenu component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-user-menu')).toBeInTheDocument();
  });

  it('renders HeaderBreadcrumbs component', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByTestId('header-breadcrumbs')).toBeInTheDocument();
  });

  it('renders rightActions when provided instead of default components', () => {
    renderWithProviders(<AppHeader rightActions={<div data-testid='custom-action'>Custom</div>} />);
    expect(screen.getByTestId('custom-action')).toBeInTheDocument();
    expect(screen.queryByTestId('header-notifications')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-user-menu')).not.toBeInTheDocument();
  });
});
