import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

vi.mock('react-i18next', () => {
  const merge = (...objs: Record<string, string>[]) => Object.assign({}, ...objs);
  const i18nMap = merge(
    require('../../../i18n/locales/zh/iam.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/schemas.json'),
    require('../../../i18n/locales/zh/routes.json')
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
    require('../../../i18n/locales/zh/routes.json')
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

import PermissionManagementPage from '../PermissionManagementPage';
import { authApi } from '@/api/iam';

let capturedProps: any = null;

vi.mock('@/components/templates/CrudPage', () => {
  return {
    default: (props: any) => {
      capturedProps = props;
      return (
        <div data-testid='crud-page'>
          <span data-testid='crud-schema'>{props.schema?.name || 'unknown'}</span>
          <span data-testid='crud-breadcrumbs'>
            {props.breadcrumbs?.map((b: any) => b.label).join(' / ')}
          </span>
          <span data-testid='crud-has-header'>{props.headerContent ? 'yes' : 'no'}</span>
        </div>
      );
    },
  };
});

vi.mock('@/schemas/iam', () => ({
  permissionSchema: { name: 'Permission', entity: 'permission', fields: [] },
}));

vi.mock('@/api/iam', () => ({
  authApi: {
    listPermissions: vi.fn(),
    createPermission: vi.fn(),
    updatePermission: vi.fn(),
    deletePermission: vi.fn(),
  },
}));

describe('PermissionManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedProps = null;
  });

  it('renders CrudPage with permission schema and headerContent', () => {
    renderWithProviders(<PermissionManagementPage />);

    expect(screen.getByTestId('crud-page')).toBeInTheDocument();
    expect(screen.getByTestId('crud-schema')).toHaveTextContent('Permission');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('首页');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('身份权限');
    expect(screen.getByTestId('crud-breadcrumbs')).toHaveTextContent('权限管理');
    expect(screen.getByTestId('crud-has-header')).toHaveTextContent('yes');
  });

  it('apiAdapter.list returns items array and length as total', async () => {
    (authApi.listPermissions as any).mockResolvedValue({
      success: true,
      data: [
        { id: 'p1', name: '读取', code: 'read' },
        { id: 'p2', name: '写入', code: 'write' },
        { id: 'p3', name: '删除', code: 'delete' },
      ],
    });

    renderWithProviders(<PermissionManagementPage />);
    const result = await capturedProps.apiAdapter.list();

    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
    expect(result.data[0].name).toBe('读取');
  });

  it('apiAdapter.list returns empty when no data', async () => {
    (authApi.listPermissions as any).mockResolvedValue({
      success: true,
      data: null,
    });

    renderWithProviders(<PermissionManagementPage />);
    const result = await capturedProps.apiAdapter.list();

    expect(result).toEqual({ data: [], total: 0 });
  });

  it('apiAdapter.create formats permission fields including module', async () => {
    (authApi.createPermission as any).mockResolvedValue({
      success: true,
      data: { id: 'p-new', name: '审核', code: 'audit', category: 'approval' },
    });

    renderWithProviders(<PermissionManagementPage />);
    const result = await capturedProps.apiAdapter.create({
      name: '审核',
      code: 'audit',
      category: 'approval',
      description: '审批权限',
    });

    expect(authApi.createPermission).toHaveBeenCalledWith({
      name: '审核',
      code: 'audit',
      category: 'approval',
      module: 'approval',
      description: '审批权限',
    });
    expect(result).toEqual({ id: 'p-new', name: '审核', code: 'audit', category: 'approval' });
  });

  it('apiAdapter.update and delete call API with correct params', async () => {
    (authApi.updatePermission as any).mockResolvedValue({
      success: true,
      data: { id: 'p1', name: '读取-v2' },
    });
    (authApi.deletePermission as any).mockResolvedValue({ success: true });

    renderWithProviders(<PermissionManagementPage />);

    const upd = await capturedProps.apiAdapter.update('p1', {
      name: '读取-v2',
      description: '更新的描述',
    });
    expect(authApi.updatePermission).toHaveBeenCalledWith('p1', {
      name: '读取-v2',
      description: '更新的描述',
    });
    expect(upd).toEqual({ id: 'p1', name: '读取-v2' });

    await capturedProps.apiAdapter.delete('p1');
    expect(authApi.deletePermission).toHaveBeenCalledWith('p1');
  });

  it('apiAdapter throws with custom message when API fails', async () => {
    (authApi.listPermissions as any).mockResolvedValue({
      success: false,
      message: '权限列表不可用',
    });

    renderWithProviders(<PermissionManagementPage />);
    await expect(capturedProps.apiAdapter.list()).rejects.toThrow('权限列表不可用');

    (authApi.createPermission as any).mockResolvedValue({
      success: false,
      message: '创建被拒绝',
    });
    await expect(
      capturedProps.apiAdapter.create({ name: 'x', code: 'x', category: 'y' }),
    ).rejects.toThrow('创建被拒绝');

    (authApi.deletePermission as any).mockResolvedValue({
      success: false,
      message: '删除失败',
    });
    await expect(capturedProps.apiAdapter.delete('p1')).rejects.toThrow('删除失败');
  });
});
