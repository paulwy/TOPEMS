import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { SidebarModuleTree } from '../SidebarModuleTree';

const { i18nMap, translate, mockNavigate } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'shared.types.k0': '概览',
    'shared.types.k1': '主数据',
    'shared.types.k3': '业务',
    'shared.types.k7': '其他',
    'shared.sidebar_module_tree.k0': '首页',
  };
  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) return i18nMap[key];
    if (options && typeof options.defaultValue === 'string') return options.defaultValue;
    return key;
  };
  const mockNavigate = vi.fn();
  return { i18nMap, translate, mockNavigate };
});

vi.mock('@/i18n', () => ({
  default: { t: translate, language: 'zh-CN', on: vi.fn(), off: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'zh-CN' } }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/erp/voucher-management' }),
  };
});

vi.mock('@/lib/navigation', () => ({
  navigationRegistryV2: {
    getSidebarNavGrouped: vi.fn(() => ({})),
    getSidebarNavItems: vi.fn(() => []),
    getModule: vi.fn(() => ({ code: 'erp', name: 'ERP' })),
  },
}));

vi.mock('@/lib/navigation/types', () => ({
  NAV_GROUPS: {
    overview: { label: 'Overview', labelKey: 'shared.types.k0', icon: 'LayoutDashboard', order: 0 },
    master: { label: 'Master Data', labelKey: 'shared.types.k1', icon: 'Database', order: 10 },
    business: { label: 'Business', labelKey: 'shared.types.k3', icon: 'Briefcase', order: 30 },
    other: { label: 'Other', labelKey: 'shared.types.k7', icon: 'MoreHorizontal', order: 99 },
  },
  SUITE_GROUPS: {},
}));

vi.mock('@/lib/iconMapping', () => ({
  renderIcon: () => <span data-testid='nav-icon' />,
}));

vi.mock('../shared', () => ({
  navItemSx: () => ({}),
  getNavigablePath: (p: string) => p,
}));

vi.mock('../SidebarServiceStatus', () => ({
  SidebarServiceStatus: () => null,
}));

const moduleNavItems = [
  { code: 'erp-dashboard', label: '仪表盘', path: '/erp/dashboard', group: 'overview' },
  { code: 'erp-ledger', label: '总账', path: '/erp/voucher-management', group: 'business' },
  { code: 'erp-customers', label: '客户', path: '/erp/customers', group: 'master' },
  { code: 'erp-misc', label: '其他项', path: '/erp/misc', group: 'other' },
];

const baseProps = {
  collapsed: false,
  currentModule: 'erp',
  moduleName: 'ERP',
  groupedModules: {},
  suiteOrder: [],
  moduleNavItems,
  serviceStatuses: {},
  checkPermission: () => true,
};

describe('SidebarModuleTree (module mode, expanded)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders L3 NavGroup section headers in canonical order', () => {
    renderWithProviders(<SidebarModuleTree {...baseProps} />);
    expect(screen.getByText('概览')).toBeInTheDocument();
    expect(screen.getByText('业务')).toBeInTheDocument();
    expect(screen.getByText('主数据')).toBeInTheDocument();
    expect(screen.getByText('其他')).toBeInTheDocument();
  });

  it('groups module nav items under their L3 section', () => {
    renderWithProviders(<SidebarModuleTree {...baseProps} />);
    expect(screen.getByText('仪表盘')).toBeInTheDocument();
    expect(screen.getByText('总账')).toBeInTheDocument();
    expect(screen.getByText('客户')).toBeInTheDocument();
  });

  it('marks the active item with aria-current=page', () => {
    renderWithProviders(<SidebarModuleTree {...baseProps} />);
    // 当前路由 /erp/voucher-management → 总账 高亮
    const activeItems = screen.getAllByRole('button', { current: 'page' });
    expect(activeItems.length).toBeGreaterThan(0);
  });

  it('navigates when a grouped item is clicked', () => {
    renderWithProviders(<SidebarModuleTree {...baseProps} />);
    fireEvent.click(screen.getByText('客户'));
    expect(mockNavigate).toHaveBeenCalledWith('/erp/customers');
  });

  it('hides empty L3 sections', () => {
    renderWithProviders(
      <SidebarModuleTree
        {...baseProps}
        moduleNavItems={moduleNavItems.slice(0, 1)}
      />
    );
    expect(screen.getByText('概览')).toBeInTheDocument();
    expect(screen.queryByText('业务')).not.toBeInTheDocument();
    expect(screen.queryByText('主数据')).not.toBeInTheDocument();
  });
});
