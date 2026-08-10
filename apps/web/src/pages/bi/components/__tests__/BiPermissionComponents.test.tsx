import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderWithProviders, screen } from '@/__tests__/test-utils';

import BiPermissionStatsCards from '../BiPermissionStatsCards';
import BiPermissionDataTable from '../BiPermissionDataTable';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      typeof options?.count === 'number' ? `${key}:${options.count}` : key,
  }),
}));

const permissions = [
  {
    id: 'perm-1',
    name: '销售看板查看权限',
    resource_type: 'dashboard',
    resource_id: 'dashboard-1',
    permission_type: 'view',
    role_ids: ['sales', 'manager', 'admin'],
    user_ids: ['u1', 'u2'],
    created_at: '2026-08-11T00:00:00.000Z',
    updated_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'perm-2',
    name: '数据集导出权限',
    resource_type: 'dataset',
    resource_id: 'dataset-1',
    permission_type: 'export',
    role_ids: [],
    user_ids: [],
    created_at: '2026-08-10T00:00:00.000Z',
    updated_at: '2026-08-10T00:00:00.000Z',
  },
];

const labelHelpers = {
  getResourceTypeLabel: (type: string) => `资源:${type}`,
  getPermissionTypeLabel: (type: string) => `权限:${type}`,
  getPermissionTypeColor: (type: string) =>
    type === 'view' ? ('primary' as const) : ('warning' as const),
};

describe('BiPermission components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('BiPermissionStatsCards', () => {
    it('renders all stat labels', () => {
      renderWithProviders(
        <BiPermissionStatsCards
          rowPermissionsCount={12}
          dataPermissionsCount={8}
          enabledRowPermissionsCount={5}
        />
      );

      expect(screen.getByText('bi.bi_permission_page.text_ae1917')).toBeInTheDocument();
      expect(screen.getByText('bi.bi_permission_page.text_9f56c8')).toBeInTheDocument();
      expect(screen.getByText('bi.bi_permission_page.text_2f54ee')).toBeInTheDocument();
      expect(screen.getByText('bi.bi_permission_page.text_c23dd1')).toBeInTheDocument();
    });

    it('renders provided counts and fixed user group count', () => {
      renderWithProviders(
        <BiPermissionStatsCards
          rowPermissionsCount={12}
          dataPermissionsCount={8}
          enabledRowPermissionsCount={5}
        />
      );

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getAllByText('8')).toHaveLength(2);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('BiPermissionDataTable', () => {
    it('renders empty state', () => {
      renderWithProviders(
        <BiPermissionDataTable
          permissions={[]}
          {...labelHelpers}
        />
      );

      expect(screen.getByText('bi.bi_permission_page.text_10510a')).toBeInTheDocument();
    });

    it('renders table headers and permission rows', () => {
      renderWithProviders(
        <BiPermissionDataTable
          permissions={permissions}
          {...labelHelpers}
        />
      );

      expect(screen.getByText('bi.bi_permission_page.text_870802')).toBeInTheDocument();
      expect(screen.getByText('销售看板查看权限')).toBeInTheDocument();
      expect(screen.getByText('数据集导出权限')).toBeInTheDocument();
      expect(screen.getByText('资源:dashboard')).toBeInTheDocument();
      expect(screen.getByText('资源:dataset')).toBeInTheDocument();
      expect(screen.getByText('权限:view')).toBeInTheDocument();
      expect(screen.getByText('权限:export')).toBeInTheDocument();
    });

    it('renders role chips, overflow count and user count', () => {
      renderWithProviders(
        <BiPermissionDataTable
          permissions={permissions}
          {...labelHelpers}
        />
      );

      expect(screen.getByText('sales')).toBeInTheDocument();
      expect(screen.getByText('manager')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByText('bi.bi_permission_page.text_54dd4b:2')).toBeInTheDocument();
      expect(screen.getAllByText('-')).toHaveLength(2);
    });

    it('renders edit and delete icon buttons for each row', () => {
      renderWithProviders(
        <BiPermissionDataTable
          permissions={permissions}
          {...labelHelpers}
        />
      );

      expect(screen.getAllByLabelText('bi.bi_permission_page.edit_2')).toHaveLength(2);
      expect(screen.getAllByLabelText('bi.bi_permission_page.delete_2')).toHaveLength(2);
    });
  });
});
