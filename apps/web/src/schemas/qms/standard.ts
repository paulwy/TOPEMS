import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  draft: 'warning',
  expired: 'error',
  archived: 'default',
};

const statusLabelMap: Record<string, string> = {
  active: i18n.t('qms.standard.k0'),
  draft: i18n.t('qms.standard.k1'),
  expired: i18n.t('qms.standard.k2'),
  archived: i18n.t('qms.standard.k3'),
};

function renderStatusCell(row: Record<string, unknown>) {
  const status = String(row.status ?? '');
  const color = statusColorMap[status] || 'default';
  const label = statusLabelMap[status] || status;
  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: color === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

function renderVersionCell(row: Record<string, unknown>) {
  const version = row.version as string | null | undefined;
  return `v${version || '1.0'}`;
}

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

export const qualityStandardSchema: EntitySchema = {
  entity: 'qmsQualityStandard',
  title: i18n.t('qms.standard.k4'),
  description: i18n.t('qms.standard.k5'),

  api: {
    module: 'qms',
    resource: 'standards',
    listMethod: 'listStandards',
    createMethod: 'createStandard',
    updateMethod: 'updateStandard',
    deleteMethod: 'deleteStandard',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('qms.standard.k6'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      placeholder: 'QS-XXXX-XXX',
      validation: [{ type: 'maxLength', value: 64 }],
    },
    {
      name: 'name',
      label: i18n.t('qms.standard.k7'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      placeholder: i18n.t('qms.standard.k8'),
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'category',
      label: i18n.t('qms.standard.k9'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('qms.standard.k10'),
    },
    {
      name: 'version',
      label: i18n.t('qms.standard.k11'),
      type: 'text',
      listWidth: 100,
      renderCell: renderVersionCell,
      placeholder: i18n.t('shared.standard.10_0'),
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'status',
      label: i18n.t('qms.standard.k12'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('qms.standard.k13') },
          { value: 'draft', label: i18n.t('qms.standard.k14') },
          { value: 'expired', label: i18n.t('qms.standard.k15') },
          { value: 'archived', label: i18n.t('qms.standard.k16') },
        ],
      },
      listWidth: 100,
      renderCell: renderStatusCell,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'effective_date',
      label: i18n.t('qms.standard.k17'),
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'effective_date'),
    },
    {
      name: 'created_at',
      label: i18n.t('qms.standard.k18'),
      type: 'date',
      readonly: true,
      sortable: true,
      listWidth: 120,
      showInList: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'description',
      label: i18n.t('qms.standard.k19'),
      type: 'textarea',
      showInList: false,
      placeholder: i18n.t('qms.standard.k20'),
    },
    {
      name: 'content',
      label: i18n.t('qms.standard.k21'),
      type: 'textarea',
      showInList: false,
      showInDetail: true,
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['code', 'name'],
    filters: [
      {
        id: 'status',
        label: i18n.t('qms.standard.k22'),
        type: 'select',
        options: [
          { label: i18n.t('qms.standard.k23'), value: 'all' },
          { label: i18n.t('qms.standard.k24'), value: 'active' },
          { label: i18n.t('qms.standard.k25'), value: 'draft' },
          { label: i18n.t('qms.standard.k26'), value: 'expired' },
          { label: i18n.t('qms.standard.k27'), value: 'archived' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: statusColorMap,
      labelMap: statusLabelMap,
    },
  },

  formSections: [
    {
      title: i18n.t('qms.standard.k28'),
      fields: ['code', 'name', 'category', 'version', 'status'],
    },
    {
      title: i18n.t('qms.standard.k29'),
      fields: ['effective_date', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('qms.standard.k30'),
  editTitle: i18n.t('qms.standard.k31'),
  detailTitle: i18n.t('qms.standard.k32'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
