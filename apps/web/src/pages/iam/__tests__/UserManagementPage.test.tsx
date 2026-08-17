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

  it('passes apiAdapter to CrudPage', () => {
    renderWithProviders(<UserManagementPage />);
    expect(capturedProps.apiAdapter).toBeDefined();
    expect(typeof capturedProps.apiAdapter.list).toBe('function');
    expect(typeof capturedProps.apiAdapter.create).toBe('function');
    expect(typeof capturedProps.apiAdapter.update).toBe('function');
    expect(typeof capturedProps.apiAdapter.delete).toBe('function');
  });

  it('apiAdapter.list converts params and unwraps response', async () => {
    (authApi.listUsers as any).mockResolvedValue({
      success: true,
      data: {
        users: [
          { id: 'u1', username: 'alice' },
          { id: 'u2', username: 'bob' },
        ],
        total: 2,
      },
    });

    renderWithProviders(<UserManagementPage />);
    const result = await capturedProps.apiAdapter.list({
      page: 1,
      pageSize: 20,
      search: 'alice',
    });

    expect(authApi.listUsers).toHaveBeenCalledWith({
      page: 1,
      pagesize: 20,
      search: 'alice',
    });
    expect(result).toEqual({
      data: [
        { id: 'u1', username: 'alice' },
        { id: 'u2', username: 'bob' },
      ],
      total: 2,
    });
  });

  it('apiAdapter.list throws when API returns success=false', async () => {
    (authApi.listUsers as any).mockResolvedValue({
      success: false,
      message: '网络超时',
    });

    renderWithProviders(<UserManagementPage />);
    await expect(capturedProps.apiAdapter.list()).rejects.toThrow('网络超时');
  });

  it('apiAdapter.list throws default message when success=false and no message', async () => {
    (authApi.listUsers as any).mockResolvedValue({ success: false });

    renderWithProviders(<UserManagementPage />);
    await expect(capturedProps.apiAdapter.list()).rejects.toThrow('加载用户失败');
  });

  it('apiAdapter.create formats fields and handles success/failure', async () => {
    (authApi.createUser as any).mockResolvedValue({
      success: true,
      data: { id: 'new-1', username: 'charlie' },
    });

    renderWithProviders(<UserManagementPage />);

    const result = await capturedProps.apiAdapter.create({
      username: 'charlie',
      email: 'charlie@example.com',
      password: 'secret123',
      full_name: 'Charlie',
    });

    expect(authApi.createUser).toHaveBeenCalledWith({
      username: 'charlie',
      email: 'charlie@example.com',
      password: 'secret123',
      full_name: 'Charlie',
    });
    expect(result).toEqual({ id: 'new-1', username: 'charlie' });

    (authApi.createUser as any).mockResolvedValue({
      success: false,
      message: '邮箱已存在',
    });
    await expect(
      capturedProps.apiAdapter.create({ username: 'dup', email: 'dup@x.com', password: 'p' })
    ).rejects.toThrow('邮箱已存在');
  });

  it('apiAdapter.update and delete call authApi correctly', async () => {
    (authApi.updateUser as any).mockResolvedValue({
      success: true,
      data: { id: 'u1', email: 'new@x.com' },
    });
    (authApi.deleteUser as any).mockResolvedValue({ success: true });

    renderWithProviders(<UserManagementPage />);

    const upResult = await capturedProps.apiAdapter.update('u1', {
      full_name: 'Alice Smith',
      email: 'new@x.com',
      isactive: true,
    });
    expect(authApi.updateUser).toHaveBeenCalledWith('u1', {
      full_name: 'Alice Smith',
      email: 'new@x.com',
      isactive: true,
    });
    expect(upResult).toEqual({ id: 'u1', email: 'new@x.com' });

    await capturedProps.apiAdapter.delete('u1');
    expect(authApi.deleteUser).toHaveBeenCalledWith('u1');
  });

  it('apiAdapter.create handles missing full_name gracefully', async () => {
    (authApi.createUser as any).mockResolvedValue({
      success: true,
      data: { id: 'n1' },
    });

    renderWithProviders(<UserManagementPage />);
    await capturedProps.apiAdapter.create({
      username: 'x',
      email: 'x@x.com',
      password: 'p',
    });

    const call = authApi.createUser.mock.calls[0][0];
    expect(call.username).toBe('x');
    expect(call.full_name).toBeUndefined();
  });
});
