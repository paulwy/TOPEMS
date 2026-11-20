import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import NotFoundPage from '../NotFoundPage';

const { tMock, mockNavigate } = vi.hoisted(() => {
  const notFoundPageTranslations: Record<string, string> = {
    'pages.not_found_page.k0': '页面未找到',
    'pages.not_found_page.k1': '抱歉，您访问的页面不存在，可能链接已失效或已被移除',
    'pages.not_found_page.k2': '返回首页',
    'pages.not_found_page.k3': '浏览模块',
    'pages.not_found_page.k4': '返回上一页',
    'pages.not_found_page.k5': '也许您想访问：',
  };

  const tMock = (key: string): string => {
    return notFoundPageTranslations[key] || key;
  };

  const mockNavigate = vi.fn();

  return { tMock, mockNavigate };
});

vi.mock('@/i18n', () => ({
  default: {
    t: tMock,
    language: 'zh',
    on: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
  },
  SUPPORTED_LANGUAGES: [
    { code: 'zh-CN', name: '简体中文' },
    { code: 'en-US', name: 'English' },
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/navigation', () => ({
  navigationRegistryV2: {
    getModuleCards: vi.fn(() => []),
  },
}));

vi.mock('@/routes/dashboard', () => ({
  DASHBOARD_PATHS: {
    dashboard: '/dashboard',
    modules: '/modules',
  },
}));

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 404 text', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders 页面未找到 heading', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText('页面未找到')).toBeInTheDocument();
  });

  it('renders 返回首页 button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /返回首页/ })).toBeInTheDocument();
  });

  it('renders 浏览模块 button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /浏览模块/ })).toBeInTheDocument();
  });

  it('renders 返回上一页 button', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('button', { name: /返回上一页/ })).toBeInTheDocument();
  });

  it('clicking 返回首页 calls navigate with dashboard path', () => {
    renderWithProviders(<NotFoundPage />);
    fireEvent.click(screen.getByRole('button', { name: /返回首页/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('clicking 返回上一页 calls navigate with -1', () => {
    renderWithProviders(<NotFoundPage />);
    fireEvent.click(screen.getByRole('button', { name: /返回上一页/ }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
