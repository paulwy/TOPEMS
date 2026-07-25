import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const tenantStatusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  trial: 'warning',
  suspended: 'error',
  deleted: 'default',
};

const tenantStatusLabelMap: Record<string, string> = {
  active: '已激活',
  trial: '试用中',
  suspended: '已停用',
  deleted: '已删除',
};

const tenantPlanLabelMap: Record<string, string> = {
  free: '免费版',
  basic: '基础版',
  professional: '专业版',
  enterprise: '企业版',
};

const tenantPlanColorMap: Record<string, 'default' | 'primary' | 'secondary' | 'success'> = {
  free: 'default',
  basic: 'primary',
  professional: 'secondary',
  enterprise: 'success',
};

function renderTenantStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = tenantStatusColorMap[status] || 'default';
  const label = tenantStatusLabelMap[status] || status;
  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: color === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderTenantPlanCell(row: Record<string, unknown>) {
  const plan = String(row.plan ?? '');
  const color = tenantPlanColorMap[plan] || 'default';
  const label = tenantPlanLabelMap[plan] || plan;
  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: 'outlined',
    sx: { fontWeight: 500 },
  });
}

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

export const tenantSchema: EntitySchema = {
  entity: 'adminTenant',
  title: '租户管理',
  description: '管理租户信息，包括租户名称、套餐、状态等',

  api: {
    module: 'admin',
    resource: 'tenants',
  },

  fields: [
    {
      name: 'name',
      label: '租户名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      placeholder: '请输入租户名称',
    },
    {
      name: 'slug',
      label: '租户标识',
      type: 'text',
      required: true,
      listWidth: 140,
      placeholder: '请输入租户标识',
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '已激活' },
          { value: 'trial', label: '试用中' },
          { value: 'suspended', label: '已停用' },
          { value: 'deleted', label: '已删除' },
        ],
      },
      listWidth: 100,
      renderCell: renderTenantStatusCell,
    },
    {
      name: 'plan',
      label: '套餐',
      type: 'select',
      defaultValue: 'professional',
      options: {
        type: 'static',
        options: [
          { value: 'free', label: '免费版' },
          { value: 'basic', label: '基础版' },
          { value: 'professional', label: '专业版' },
          { value: 'enterprise', label: '企业版' },
        ],
      },
      listWidth: 100,
      renderCell: renderTenantPlanCell,
    },
    {
      name: 'max_users',
      label: '用户数',
      type: 'number',
      readonly: true,
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'max_storage_gb',
      label: '存储配额 (GB)',
      type: 'number',
      readonly: true,
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'updated_at'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['name', 'slug'],
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已激活', value: 'active' },
          { label: '试用中', value: 'trial' },
          { label: '已停用', value: 'suspended' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'plan',
        label: '套餐',
        type: 'select',
        options: [
          { label: '全部套餐', value: 'all' },
          { label: '免费版', value: 'free' },
          { label: '基础版', value: 'basic' },
          { label: '专业版', value: 'professional' },
          { label: '企业版', value: 'enterprise' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: tenantStatusColorMap,
      labelMap: tenantStatusLabelMap,
    },
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'slug', 'plan', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '创建租户',
  editTitle: '编辑租户',
  detailTitle: '租户详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
