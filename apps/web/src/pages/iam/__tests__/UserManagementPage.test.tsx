import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import UserManagementPage from '../UserManagementPage';
import { authApi } from '@/api/iam';

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

let capturedProps: any = null;

vi.mock('@/components/templates/CrudPage', () => {
  return {
    default: (props: any) => {
      capturedProps = props;
      return (
        <div data-testid='crud-page'>
          <span data-testid='crud-schema'>
            {props.schema?.name || props.schema?.entity || 'unknown'}
          </span>
          <span data-testid='crud-breadcrumbs'>
            {props.breadcrumbs?.map((b: any) => b.label).join(' / ')}
          </span>
        </div>
      );
    },
  };
});

vi.mock('@/schemas/iam/user', () => ({
  userSchema: { name: 'User', entity: 'user', fields: [] },
}));

vi.mock('@/modules/iam/config', () => ({
  IAM_PATHS: { root: '/admin/iam', users: '/admin/iam/users' },
}));

vi.mock('@/api/iam', () => ({
  authApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

describe('UserManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  it('renders CrudPage with user schema and breadcrumbs', () => {
    renderWithProviders(<UserManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(screen.getByTestId('crud-schema')).toHaveTextContent('User');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('首页');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('身份管理');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('用户管理');
  });
});
