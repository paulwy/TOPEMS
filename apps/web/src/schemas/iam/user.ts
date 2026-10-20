/**
 * 用户管理 Schema — 驱动 UserManagementPage 的完整 CRUD
 *
 * 包含动态选项（角色列表）、批量操作、状态徽章等高级功能。
 */

import React from 'react';
import type { EntitySchema } from '@/schema';
import { authApi } from '@/api/iam';

import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

/**
 * 加载角色列表（动态选项）
 */
async function loadRoles(): Promise<{ value: string; label: string }[]> {
  const response = await authApi.listRoles();
  if (!response.success) {
    throw new Error(i18n.t('shared.user.k0'));
  }
  const roles = response.data ?? [];
  return roles.map((role) => ({
    value: role.name || role.id,
    label: role.name || role.id,
  }));
}

/**
 * 用户管理 Schema
 */
export const userSchema: EntitySchema = {
  entity: 'user',
  title: i18n.t('shared.user.k1'),
  description: i18n.t('shared.user.k2'),

  api: {
    module: 'iam',
    resource: 'users',
  },

  fields: [
    {
      name: 'username',
      label: i18n.t('shared.user.k3'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const username = String(row.username || '');
        const fullName = String(row.full_name || '');
        const email = String(row.email || '');
        const initial = username.charAt(0).toUpperCase();
        return React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
                color: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                fontWeight: 500,
                flexShrink: 0,
              },
            },
            initial
          ),
          React.createElement(
            'div',
            null,
            React.createElement(
              'div',
              {
                style: {
                  fontWeight: 500,
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                },
              },
              fullName || username
            ),
            React.createElement(
              'div',
              {
                style: {
                  fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                  color: 'text.secondary',
                },
              },
              email
            )
          )
        );
      },
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'full_name',
      label: i18n.t('shared.user.k4'),
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'email',
      label: i18n.t('shared.user.k5'),
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'password',
      label: i18n.t('shared.user.k6'),
      type: 'text',
      required: true,
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'role',
      label: i18n.t('shared.user.k7'),
      type: 'select',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const role = String(row.role || 'user');
        const roles = (row.roles as Array<{ name?: string }>) || [];
        return React.createElement(
          'div',
          {
            style: { display: 'flex', alignItems: 'center', gap: 4 },
          },
          React.createElement(
            'span',
            {
              style: {
                display: 'inline-block',
                padding: `${designTokens.spacing.xs} 8px`,
                borderRadius: 'lg',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#primary.lighter',
                color: 'primary.main',
              },
            },
            role
          ),
          roles.length > 1
            ? React.createElement(
                'span',
                {
                  style: { fontSize: '12px', color: 'text.secondary' },
                },
                `+${roles.length - 1}`
              )
            : null
        );
      },
    },
    {
      name: 'isactive',
      label: i18n.t('shared.user.k8'),
      type: 'switch',
      defaultValue: true,
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => {
        // V64 防御：row 为空兜底（上层已防御，这里做双保险避免未来重构/换模板时再炸）
        const isActive = row?.isactive !== false;
        return React.createElement(
          'div',
          {
            style: { display: 'flex', alignItems: 'center', gap: 4 },
          },
          React.createElement('span', {
            style: {
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isActive ? 'success.main' : 'error.main',
            },
          }),
          React.createElement(
            'span',
            { style: { fontSize: designTokens.typography.fontSize.scale['0.875rem'] } },
            isActive ? i18n.t('shared.user.k10') : i18n.t('shared.user.k9')
          )
        );
      },
    },
    {
      name: 'created_at',
      label: i18n.t('shared.user.k11'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        row.created_at ? new Date(row.created_at as string).toLocaleDateString('zh-CN') : '-',
    },
  ],

  list: {
    columns: ['username', 'full_name', 'email', 'role', 'isactive', 'created_at'],
    searchFields: ['username', 'email', 'full_name'],
    pageSize: 20,
    statusBadge: {
      field: 'isactive',
      colorMap: {
        true: 'success',
        false: 'error',
      },
      labelMap: {
        true: i18n.t('shared.user.k12'),
        false: i18n.t('shared.user.k13'),
      },
    },
  },

  actions: ['create', 'edit', 'delete'],

  batchActions: [
    {
      key: 'batch-enable',
      label: i18n.t('shared.user.k14'),
      color: 'success',
      onClick: async (selectedIds) => {
        const response = await authApi.batchUpdateUsers({
          user_ids: selectedIds,
          isactive: true,
        });
        if (!response.success) {
          throw new Error(response.message || i18n.t('shared.user.k15'));
        }
      },
      confirm: true,
      confirmMessage: i18n.t('shared.user.k16'),
    },
    {
      key: 'batch-disable',
      label: i18n.t('shared.user.k17'),
      color: 'warning',
      onClick: async (selectedIds) => {
        const response = await authApi.batchUpdateUsers({
          user_ids: selectedIds,
          isactive: false,
        });
        if (!response.success) {
          throw new Error(response.message || i18n.t('shared.user.k18'));
        }
      },
      confirm: true,
      confirmMessage: i18n.t('shared.user.k19'),
    },
    {
      key: 'batch-delete',
      label: i18n.t('shared.user.k20'),
      color: 'error',
      onClick: async (selectedIds) => {
        const response = await authApi.batchDeleteUsers({
          user_ids: selectedIds,
        });
        if (!response.success) {
          throw new Error(response.message || i18n.t('shared.user.k21'));
        }
      },
      confirm: true,
      confirmMessage: i18n.t('shared.user.k22'),
    },
  ],

  formSections: [
    {
      title: i18n.t('shared.user.k23'),
      fields: ['username', 'full_name', 'email', 'password'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('shared.user.k24'),
  editTitle: i18n.t('shared.user.k25'),
  detailTitle: i18n.t('shared.user.k26'),

  dynamicOptions: [
    {
      field: 'role',
      loader: loadRoles,
      queryKey: QUERY_KEYS.AD_HOC.ROLES_BASE,
    },
  ],
};
