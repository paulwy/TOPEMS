import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const tenantStatusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  trial: 'warning',
  suspended: 'error',
  deleted: 'default',
};

const tenantStatusLabelMap: Record<string, string> = {
  active: i18n.t('admin.tenant.k0'),
  trial: i18n.t('admin.tenant.k1'),
  suspended: i18n.t('admin.tenant.k2'),
  deleted: i18n.t('admin.tenant.k3'),
};

const tenantPlanLabelMap: Record<string, string> = {
  free: i18n.t('admin.tenant.k4'),
  basic: i18n.t('admin.tenant.k5'),
  professional: i18n.t('admin.tenant.k6'),
  enterprise: i18n.t('admin.tenant.k7'),
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
  title: i18n.t('schema:admin.tenant.meta.title'),
  description: i18n.t('schema:admin.tenant.meta.description'),

  api: {
    module: 'admin',
    resource: 'tenants',
  },

  fields: [
    {
      name: 'name',
      label: i18n.t('schema:admin.tenant.name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      placeholder: i18n.t('schema:admin.tenant.name.placeholder'),
      validation: [{ type: 'maxLength', value: 128 }],
    },
    {
      name: 'slug',
      label: i18n.t('schema:admin.tenant.slug.label'),
      type: 'text',
      required: true,
      listWidth: 140,
      placeholder: i18n.t('schema:admin.tenant.slug.placeholder'),
    },
    {
      name: 'status',
      label: i18n.t('schema:admin.tenant.status.label'),
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('schema:admin.tenant.status.option.active') },
          { value: 'trial', label: i18n.t('schema:admin.tenant.status.option.trial') },
          { value: 'suspended', label: i18n.t('schema:admin.tenant.status.option.suspended') },
          { value: 'deleted', label: i18n.t('schema:admin.tenant.status.option.deleted') },
        ],
      },
      listWidth: 100,
      renderCell: renderTenantStatusCell,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'plan',
      label: i18n.t('schema:admin.tenant.plan.label'),
      type: 'select',
      defaultValue: 'professional',
      options: {
        type: 'static',
        options: [
          { value: 'free', label: i18n.t('schema:admin.tenant.plan.option.free') },
          { value: 'basic', label: i18n.t('schema:admin.tenant.plan.option.basic') },
          { value: 'professional', label: i18n.t('schema:admin.tenant.plan.option.professional') },
          { value: 'enterprise', label: i18n.t('schema:admin.tenant.plan.option.enterprise') },
        ],
      },
      listWidth: 100,
      renderCell: renderTenantPlanCell,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'max_users',
      label: i18n.t('schema:admin.tenant.max_users.label'),
      type: 'number',
      readonly: true,
      listWidth: 100,
      showInList: false,
    },
    {
      name: 'max_storage_gb',
      label: i18n.t('schema:admin.tenant.max_storage_gb.label'),
      type: 'number',
      readonly: true,
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('schema:admin.tenant.created_at.label'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'updated_at',
      label: i18n.t('schema:admin.tenant.updated_at.label'),
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
        label: i18n.t('schema:admin.tenant.filter.status.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:admin.tenant.filter.status.option.all'), value: 'all' },
          { label: i18n.t('schema:admin.tenant.filter.status.option.active'), value: 'active' },
          { label: i18n.t('schema:admin.tenant.filter.status.option.trial'), value: 'trial' },
          {
            label: i18n.t('schema:admin.tenant.filter.status.option.suspended'),
            value: 'suspended',
          },
        ],
        defaultValue: 'all',
      },
      {
        id: 'plan',
        label: i18n.t('schema:admin.tenant.filter.plan.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:admin.tenant.filter.plan.option.all'), value: 'all' },
          { label: i18n.t('schema:admin.tenant.filter.plan.option.free'), value: 'free' },
          { label: i18n.t('schema:admin.tenant.filter.plan.option.basic'), value: 'basic' },
          {
            label: i18n.t('schema:admin.tenant.filter.plan.option.professional'),
            value: 'professional',
          },
          {
            label: i18n.t('schema:admin.tenant.filter.plan.option.enterprise'),
            value: 'enterprise',
          },
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
      title: i18n.t('schema:admin.tenant.section.0.title'),
      fields: ['name', 'slug', 'plan', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:admin.tenant.meta.createTitle'),
  editTitle: i18n.t('schema:admin.tenant.meta.editTitle'),
  detailTitle: i18n.t('schema:admin.tenant.meta.detailTitle'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
