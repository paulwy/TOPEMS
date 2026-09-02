import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';

import { AppSidebar } from '../AppSidebar';

const { i18nMap, translate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'shared.app_sidebar.k0': '主导航',
    'shared.app_sidebar.k1': '展开',
    'shared.app_sidebar.k2': '收起',
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
  withTranslation: () => (Component: any) => Component,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
    i18nKey ? translate(i18nKey) : children,
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    language: 'zh-CN',
    changeLanguage: vi.fn(),
    exists: (key: string) => !!i18nMap[key],
    on: vi.fn(),
    off: vi.fn(),
  },
}));

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

vi.mock('@/hooks/usePermission', () => ({
  usePermission: vi.fn(() => ({
    hasPermission: () => true,
    loading: false,
    checkPermission: () => true,
  })),
}));

vi.mock('@/hooks/useServiceStatus', () => ({
  useServiceStatus: vi.fn(() => ({
    isAnyServiceOffline: false,
    offlineServices: [],
    serviceStatuses: [],
  })),
}));

vi.mock('@/store/authStore', () => ({
  useAuthAvatarUrl: vi.fn(() => {}),
  useAuthDisplayName: vi.fn(() => '测试用户'),
  useAuthUserRole: vi.fn(() => '管理员'),
}));

vi.mock('@/lib/navigation', () => ({
  navigationRegistryV2: {
    getModuleCards: vi.fn(() => []),
    getGroupedModules: vi.fn(() => []),
    getSidebarNavItems: vi.fn(() => []),
    getModule: vi.fn(() => null),
    getTopNavItems: vi.fn(() => []),
    getNavItemsGroupedByBusinessDomain: vi.fn(() => ({})),
    emitter: {
      on: vi.fn(),
      off: vi.fn(),
    },
  },
}));

vi.mock('@/lib/navigation/types', () => ({
  SUITE_GROUPS: [],
}));

vi.mock('@/theme/design-tokens', () => ({
  sizeTokens: {
    sidebarWidth: '220px',
    sidebarWidthCollapsed: '64px',
  },
}));

vi.mock('@/layouts/components', () => ({
  extractInitials: vi.fn(() => '测'),
}));

vi.mock('../shared', () => ({
  isPlatformPath: vi.fn(() => true),
  getModuleFromPath: vi.fn(() => null),
}));

vi.mock('../SidebarSearch', () => ({
  SidebarSearch: () => <div data-testid='sidebar-search' />,
}));

vi.mock('../SidebarFavorites', () => ({
  SidebarFavorites: () => <div data-testid='sidebar-favorites' />,
}));

vi.mock('../SidebarModuleTree', () => ({
  SidebarModuleTree: () => <div data-testid='sidebar-module-tree' />,
}));

vi.mock('../SidebarServiceStatus', () => ({
  SidebarServiceStatus: () => <div data-testid='sidebar-service-status' />,
}));

vi.mock('../SidebarUserPanel', () => ({
  SidebarUserPanel: ({ onToggleCollapse }: { onToggleCollapse: () => void }) => (
    <div data-testid='sidebar-user-panel'>
      <button
        data-testid='sidebar-user-panel-toggle'
        onClick={onToggleCollapse}
      >
        Toggle
      </button>
    </div>
  ),
}));

describe('AppSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation with aria-label 主导航', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
  });

  it('renders SidebarSearch child', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );
    expect(screen.getByTestId('sidebar-search')).toBeInTheDocument();
  });

  it('renders SidebarFavorites child', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );
    expect(screen.getByTestId('sidebar-favorites')).toBeInTheDocument();
  });

  it('renders SidebarModuleTree child', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );
    expect(screen.getByTestId('sidebar-module-tree')).toBeInTheDocument();
  });

  it('renders SidebarUserPanel child', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );
    expect(screen.getByTestId('sidebar-user-panel')).toBeInTheDocument();
  });

  it('applies expanded width when collapsed=false', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );
    const nav = screen.getByRole('navigation', { name: '主导航' });
    expect(nav).toHaveStyle({ width: '220px' });
  });

  it('applies collapsed width when collapsed=true', () => {
    renderWithProviders(
      <AppSidebar
        collapsed={true}
        onToggleCollapse={vi.fn()}
      />
    );
    const nav = screen.getByRole('navigation', { name: '主导航' });
    expect(nav).toHaveStyle({ width: '64px' });
  });

  it('calls onToggleCollapse when SidebarUserPanel toggle is clicked', () => {
    const onToggleCollapse = vi.fn();
    renderWithProviders(
      <AppSidebar
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
      />
    );
    fireEvent.click(screen.getByTestId('sidebar-user-panel-toggle'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });
});
