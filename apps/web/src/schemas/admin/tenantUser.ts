import React from 'react';
import { Chip, Avatar, Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

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
  title: i18n.t('schema:admin.tenant_user.meta.title'),
  description: i18n.t('schema:admin.tenant_user.meta.description'),

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
      label: i18n.t('schema:admin.tenant_user.email.label'),
      type: 'text',
      required: true,
      listWidth: 200,
      renderCell: renderMemberCell,
    },
    {
      name: 'role',
      label: i18n.t('schema:admin.tenant_user.role.label'),
      type: 'select',
      required: true,
      defaultValue: 'member',
      options: {
        type: 'static',
        options: [
          { value: 'owner', label: i18n.t('schema:admin.tenant_user.role.option.owner') },
          { value: 'admin', label: i18n.t('schema:admin.tenant_user.role.option.admin') },
          { value: 'member', label: i18n.t('schema:admin.tenant_user.role.option.member') },
          { value: 'guest', label: i18n.t('schema:admin.tenant_user.role.option.guest') },
        ],
      },
      listWidth: 120,
      renderCell: renderRoleCell,
    },
    {
      name: 'status',
      label: i18n.t('schema:admin.tenant_user.status.label'),
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:admin.tenant_user.status.option.active') },
          { value: 'invited', label: i18n.t('schema:admin.tenant_user.status.option.invited') },
          { value: 'suspended', label: i18n.t('schema:admin.tenant_user.status.option.suspended') },
        ],
      },
      listWidth: 100,
      renderCell: renderStatusCell,
    },
    {
      name: 'created_at',
      label: i18n.t('schema:admin.tenant_user.created_at.label'),
      type: 'datetime',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'last_login',
      label: i18n.t('schema:admin.tenant_user.last_login.label'),
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
      title: i18n.t('schema:admin.tenant_user.section.0.title'),
      fields: ['email', 'role', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:admin.tenant_user.meta.createTitle'),
  editTitle: i18n.t('schema:admin.tenant_user.meta.editTitle'),
  detailTitle: i18n.t('schema:admin.tenant_user.meta.detailTitle'),

  actions: ['detail', 'delete'],
};
