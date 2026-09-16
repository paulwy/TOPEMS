import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import UserManagementPage from '../UserManagementPage';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/iam.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/schemas.json'),
    require('../../../i18n/locales/zh/routes.json'),
    require('../../../i18n/locales/zh/api.json')
  );
  return {
    useTranslation: () => ({
      t: (key: string) => i18nMap[key] ?? key,
      i18n: { language: 'zh' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/iam.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/schemas.json'),
    require('../../../i18n/locales/zh/routes.json'),
    require('../../../i18n/locales/zh/api.json')
  );
  return {
    default: {
      t: (key: string) => i18nMap[key] ?? key,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('@/api/iam', () => ({
  authApi: {
    list: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    delete: vi.fn(),
  },
}));

vi.mock('@/modules/iam/config', () => ({
  IAM_PATHS: { root: '/admin/iam', users: '/admin/iam/users' },
}));

describe('UserManagementPage', () => {
  it('renders page title', () => {
    renderWithProviders(<UserManagementPage />);

    // 页面标题应该显示（h1 元素）
    const headings = screen.getAllByText('用户管理');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('renders breadcrumbs', () => {
    renderWithProviders(<UserManagementPage />);

    // 面包屑应该显示首页和身份管理
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('身份管理')).toBeInTheDocument();
  });
});
