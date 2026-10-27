import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PageHeader from '../PageHeader';
import { useAutoBreadcrumbs } from '@/hooks';

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'components.page_header.k0': '搜索...',
    'templates.page_header.k0': '更多操作',
    'templates.page_header.k1': '更多操作',
    'templates.page_header.k2': '刷新',
    'templates.page_header.k3': '刷新',
  };

  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) {
      let result = i18nMap[key];
      if (options) {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
        }
      }
      return result;
    }
    if (!options) return key;
    return `${key}:${Object.values(options).join(',')}`;
  };

  return { i18nMap, translate };
});

vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    i18n: { language: 'zh-CN', changeLanguage: vi.fn(), exists: (k: string) => !!i18nMap[k] },
    ready: true,
  }),
  withTranslation: () => (Component: unknown) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: unknown }) =>
    i18nKey ? translate(i18nKey) : children,
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
  },
}));

vi.mock('@/hooks', () => ({
  useAutoBreadcrumbs: vi.fn(),
  useBackNavigation: vi.fn().mockReturnValue({
    goBack: vi.fn(),
    hasFrom: false,
    from: null,
    fromFullPath: null,
    createNavigateState: vi.fn(),
  }),
}));

const mockUseAutoBreadcrumbs = useAutoBreadcrumbs as vi.Mock;

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAutoBreadcrumbs.mockReturnValue([]);
  });

  it('should render title', () => {
    renderWithRouter(<PageHeader title='测试页面' />);
    expect(screen.getByText('测试页面')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    renderWithRouter(
      <PageHeader
