import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { renderWithProviders } from '@/__tests__/test-utils';
import { HeaderBreadcrumbs } from '../HeaderBreadcrumbs';

const { i18nMap, translate, mockNavigate, navRegistryMock } = vi.hoisted(() => {
  const i18nMap: Record<string, string> = {
    'shared.types.k12': '财务域',
    'shared.header_breadcrumbs.k0': '面包屑导航',
    'components.header_breadcrumbs.k0': '首页',
  };
  const translate = (key: string, options?: Record<string, unknown>): string => {
    if (i18nMap[key]) return i18nMap[key];
    if (options && typeof options.defaultValue === 'string') return options.defaultValue;
    return key;
  };
  const mockNavigate = vi.fn();
  const navRegistryMock = {
    findModuleByPath: vi.fn(() => ({
      code: 'erp',
      name: 'ERP',
      path: '/erp',
      suite: 'finance',
      icon: 'Database',
    })),
    getNavHierarchy: vi.fn(() => [
      {
        code: 'erp',
        label: 'ERP',
        labelKey: 'modules.erp.name',
        path: '/erp',
        showInBreadcrumb: true,
      },
      {
        code: 'erp-accounts',
        label: '总账',
        path: '/erp/accounts',
        showInBreadcrumb: true,
      },
    ]),
    getNavItemsGroupedByBusinessDomain: vi.fn(() => ({
      finance: [{ code: 'erp', name: 'ERP', path: '/erp' }],
    })),
  };
  return { i18nMap, translate, mockNavigate, navRegistryMock };
});

vi.mock('@/i18n', () => ({
  default: { t: translate, language: 'zh-CN', on: vi.fn(), off: vi.fn() },
  subscribeResourceVersion: vi.fn(() => () => {}),
  getResourceVersion: () => 0,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'zh-CN' } }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/erp/accounts' }),
  };
});

vi.mock('@/lib/navigation', () => ({
  navigationRegistryV2: navRegistryMock,
}));

vi.mock('@/lib/navigation/types', () => ({
  SUITE_GROUPS: {
    finance: {
      label: 'Finance',
      labelKey: 'shared.types.k12',
