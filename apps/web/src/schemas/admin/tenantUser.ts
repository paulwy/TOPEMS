import React from 'react';
import { Chip, Avatar, Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import type { EntitySchema } from '@/schema';

const roleLabels: Record<string, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
  guest: '访客',
};

const userStatusLabels: Record<string, string> = {
  active: '活跃',
  invited: '已邀请',
  suspended: '已停用',
};

const userStatusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'error',
};

function renderMemberCell(row: Record<string, unknown>) {
  const email = String(row.email ?? '');
  return React.createElement(Box, {
    sx: { display: 'flex', alignItems: 'center', gap: 2 },
    children: [
      React.createElement(Avatar, {
        sx: { width: 36, height: 36, fontSize: 14 },
        children: email.charAt(0).toUpperCase(),
      }),
      React.createElement(Box, {
        children: [
          React.createElement(Typography, {
            variant: 'body2',
            sx: { fontWeight: 500 },
            children: email,
          }),
          React.createElement(Typography, {
            variant: 'caption',
            color: 'text.secondary',
            children: roleLabels[String(row.role ?? '')] || '-',
          }),
        ],
      }),
    ],
  });
}

function renderRoleCell(row: Record<string, unknown>) {
  const role = String(row.role ?? 'member');
  return React.createElement(FormControl, {
    size: 'small',
    sx: { minWidth: 100 },
    children: React.createElement(Select, {
      value: role,
      size: 'small',
      onChange: () => {},
      children: [
        React.createElement(MenuItem, { value: 'owner', children: '所有者' }),
        React.createElement(MenuItem, { value: 'admin', children: '管理员' }),
        React.createElement(MenuItem, { value: 'member', children: '成员' }),
        React.createElement(MenuItem, { value: 'guest', children: '访客' }),
      ],
    }),
  });
}

function renderStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = userStatusColors[status] || 'default';
  const label = userStatusLabels[status] || status;
  return React.createElement(Chip, {
    label,
    color,
    size: 'small',
  });
}

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return field === 'last_login' ? '从未登录' : '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

export const tenantUserSchema: EntitySchema = {
  entity: 'tenantUser',
  title: '租户成员',
  description: '管理租户成员信息',

  api: {
    module: 'admin',
    resource: 'tenantUsers',
  },

  fields: [
    {
      name: 'id',
      label: 'ID',
      type: 'text',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'email',
      label: '成员',
      type: 'text',
      required: true,
      listWidth: 200,
      renderCell: renderMemberCell,
    },
    {
      name: 'role',
      label: '角色',
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: {
        type: 'static',
        options: [
          { value: 'owner', label: '所有者' },
          { value: 'admin', label: '管理员' },
          { value: 'member', label: '成员' },
          { value: 'guest', label: '访客' },
        ],
      },
      listWidth: 120,
      renderCell: renderRoleCell,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'invited', label: '已邀请' },
          { value: 'suspended', label: '已停用' },
        ],
      },
      listWidth: 100,
      renderCell: renderStatusCell,
    },
    {
      name: 'created_at',
      label: '加入时间',
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'last_login',
      label: '最近登录',
      type: 'datetime',
      readonly: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'last_login'),
    },
  ],

  list: {
    columns: ['email', 'role', 'status', 'created_at', 'last_login'],
    pageSize: 10,
    selectable: false,
  },

  formSections: [
    {
      title: '成员信息',
      fields: ['email', 'role', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '邀请成员',
  editTitle: '编辑成员',
  detailTitle: '成员详情',

  actions: ['detail', 'delete'],
};
