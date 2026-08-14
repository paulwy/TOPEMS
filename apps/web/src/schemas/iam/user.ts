/**
 * 用户管理 Schema — 驱动 UserManagementPage 的完整 CRUD
 *
 * 包含动态选项（角色列表）、批量操作、状态徽章等高级功能。
 */

import React from 'react';
import type { EntitySchema, SchemaField } from '@/schema';
import { authApi } from '@/api/iam';


import { QUERY_KEYS } from '@/lib/reactQuery';

/**
 * 加载角色列表（动态选项）
 */
async function loadRoles(): Promise<{ value: string; label: string }[]> {
  const response = await authApi.listRoles();
  if (!response.success) {
    throw new Error('加载角色失败');
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
  title: '用户管理',
  description: '管理平台用户账户、角色和权限',

  api: {
    module: 'iam',
    resource: 'users',
  },

  fields: [
    {
      name: 'username',
      label: '用户名',
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
                backgroundColor: 'var(--color-primary-main, #1976d2)',
                color: 'common.white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
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
                style: { fontWeight: 500, fontSize: '0.875rem' },
              },
              fullName || username
            ),
            React.createElement(
              'div',
              {
                style: { fontSize: '0.75rem', color: 'text.secondary' },
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
      label: '姓名',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      required: true,
      listWidth: 180,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'password',
      label: '密码',
      type: 'text',
      required: true,
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'role',
      label: '角色',
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
                padding: '2px 8px',
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
      label: '状态',
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
            { style: { fontSize: '0.875rem' } },
            isActive ? '活跃' : '禁用'
          )
        );
      },
    },
    {
      name: 'created_at',
      label: '创建时间',
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
        true: '活跃',
        false: '禁用',
      },
    },
  },

  actions: ['create', 'edit', 'delete'],

  batchActions: [
    {
      key: 'batch-enable',
      label: '批量启用',
      color: 'success',
      onClick: async (selectedIds) => {
        const response = await authApi.batchUpdateUsers({
          user_ids: selectedIds,
          isactive: true,
        });
        if (!response.success) {
          throw new Error(response.message || '操作失败');
        }
      },
      confirm: true,
      confirmMessage: '确定要启用选中的用户吗？',
    },
    {
      key: 'batch-disable',
      label: '批量禁用',
      color: 'warning',
      onClick: async (selectedIds) => {
        const response = await authApi.batchUpdateUsers({
          user_ids: selectedIds,
          isactive: false,
        });
        if (!response.success) {
          throw new Error(response.message || '操作失败');
        }
      },
      confirm: true,
      confirmMessage: '确定要禁用选中的用户吗？',
    },
    {
      key: 'batch-delete',
      label: '批量删除',
      color: 'error',
      onClick: async (selectedIds) => {
        const response = await authApi.batchDeleteUsers({
          user_ids: selectedIds,
        });
        if (!response.success) {
          throw new Error(response.message || '删除失败');
        }
      },
      confirm: true,
      confirmMessage: '确定要删除选中的用户吗？此操作不可恢复。',
    },
  ],

  formSections: [
    {
      title: '基本信息',
      fields: ['username', 'full_name', 'email', 'password'],
    },
  ],

  formColCount: 2,
  createTitle: '创建用户',
  editTitle: '编辑用户',
  detailTitle: '用户详情',

  dynamicOptions: [
    {
      field: 'role',
      loader: loadRoles,
      queryKey: QUERY_KEYS.AD_HOC.ROLES_BASE,
    },
  ],
};
