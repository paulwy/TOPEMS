import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/__tests__/test-utils';

import RoleManagementPage from '../RoleManagementPage';
import { authApi } from '@/api/iam';

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../i18n/locales/zh/iam.json'),
    require('../../../i18n/locales/zh/common.json'),
    require('../../../i18n/locales/zh/components.json'),
    require('../../../i18n/locales/zh/pages.json'),
    require('../../../i18n/locales/zh/templates.json'),
    require('../../../i18n/locales/zh/schema.json'),
    require('../../../i18n/locales/zh/routes.json'),
    require('../../../i18n/locales/zh/shared.json'),
    require('../../../i18n/locales/zh/admin.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string) => i18nMap[key] ?? key;
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

vi.mock('@/api/iam', () => ({
  authApi: {
    listRoles: vi.fn(),
    listPermissions: vi.fn(),
    getRolePermissions: vi.fn(),
    createRole: vi.fn(),
    updateRole: vi.fn(),
    deleteRole: vi.fn(),
    addRolePermission: vi.fn(),
    removeRolePermission: vi.fn(),
  },
}));

describe('RoleManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authApi.listRoles as any).mockResolvedValue({ success: true, data: [] });
    (authApi.listPermissions as any).mockResolvedValue({ success: true, data: [] });
  });

  it('renders role management page with title and empty state', async () => {
    renderWithProviders(<RoleManagementPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '角色管理' })).toBeInTheDocument();
    });

    expect(screen.getByText('管理角色及其权限分配')).toBeInTheDocument();
    expect(screen.getAllByText('新建角色').length).toBeGreaterThanOrEqual(1);
  });

  it('renders role rows when data is available', async () => {
    (authApi.listRoles as any).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'role-1',
          name: '管理员',
          description: '系统管理员',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    });

    renderWithProviders(<RoleManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('管理员')).toBeInTheDocument();
    });

    expect(screen.getByText('系统管理员')).toBeInTheDocument();
  });
});
