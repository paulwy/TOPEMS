import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const STATUS_COLOR_MAP: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  sufficient: 'success',
  normal: 'info',
  low: 'warning',
  insufficient: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  sufficient: i18n.t('rd.material.k0'),
  normal: i18n.t('rd.material.k1'),
  low: i18n.t('rd.material.k2'),
  insufficient: i18n.t('rd.material.k3'),
};

function getStockStatus(row: Record<string, unknown>): string {
  const stock = Number(row.stock_quantity ?? 0);
  const max = Number(row.max_stock ?? 0);

  if (max > 0) {
    const ratio = stock / max;
    if (ratio >= 0.7) return 'sufficient';
    if (ratio >= 0.4) return 'normal';
    if (ratio >= 0.2) return 'low';
    return 'insufficient';
  }

  return 'normal';
}

export const materialSchema: EntitySchema = {
  entity: 'rd_material',
  title: i18n.t('rd.material.k4'),
  description: i18n.t('rd.material.k5'),

  api: {
    module: 'rd',
    resource: 'materials',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('rd.material.k6'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        return React.createElement(
          Typography,
          { variant: 'body2', sx: { fontWeight: 'medium' } },
          String(row.code ?? '')
        );
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('rd.material.k7'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'category',
      label: i18n.t('rd.material.k8'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.category ?? '');
        if (!val) return '-';
        return React.createElement(Chip, { label: val, size: 'small', variant: 'outlined' });
      },
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'stock_quantity',
      label: i18n.t('rd.material.k9'),
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'unit',
      label: i18n.t('rd.material.k10'),
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'status',
      label: i18n.t('rd.material.k11'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'sufficient', label: i18n.t('rd.material.k12') },
          { value: 'normal', label: i18n.t('rd.material.k13') },
          { value: 'low', label: i18n.t('rd.material.k14') },
          { value: 'insufficient', label: i18n.t('rd.material.k15') },
        ],
      },
      sortable: true,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const status = getStockStatus(row);
        const label = STATUS_LABEL_MAP[status] || status;
        const color = STATUS_COLOR_MAP[status] || 'default';
        return React.createElement(Chip, { label, size: 'small', color });
      },
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'specification',
      label: i18n.t('rd.material.k16'),
      type: 'text',
      listWidth: 120,
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'supplier',
      label: i18n.t('rd.material.k17'),
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'min_stock',
      label: i18n.t('rd.material.k18'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'max_stock',
      label: i18n.t('rd.material.k19'),
      type: 'number',
      showInList: false,
    },
    {
      name: 'location',
      label: i18n.t('rd.material.k20'),
      type: 'text',
      listWidth: 120,
      renderCell: () => '-',
    },
    {
      name: 'description',
      label: i18n.t('rd.material.k21'),
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'created_by',
      label: i18n.t('rd.material.k22'),
      type: 'text',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'created_at',
      label: i18n.t('rd.material.k23'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: i18n.t('rd.material.k24'),
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'stock_quantity', 'unit', 'status', 'location'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    filters: [
      {
        id: 'category',
        label: i18n.t('rd.material.k25'),
        type: 'select',
        options: [{ label: i18n.t('rd.material.k26'), value: 'all' }],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: i18n.t('rd.material.k27'),
        type: 'select',
        options: [
          { label: i18n.t('rd.material.k28'), value: 'all' },
          { label: i18n.t('rd.material.k29'), value: 'sufficient' },
          { label: i18n.t('rd.material.k30'), value: 'normal' },
          { label: i18n.t('rd.material.k31'), value: 'low' },
          { label: i18n.t('rd.material.k32'), value: 'insufficient' },
        ],
        defaultValue: 'all',
      },
    ],
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
  },

  formSections: [
    {
      title: i18n.t('rd.material.k33'),
      fields: ['code', 'name', 'category', 'unit', 'specification', 'supplier'],
    },
    {
      title: i18n.t('rd.material.k34'),
      fields: ['stock_quantity', 'min_stock', 'max_stock'],
    },
    {
      title: i18n.t('rd.material.k35'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('rd.material.k36'),
  editTitle: i18n.t('rd.material.k37'),
  detailTitle: i18n.t('rd.material.k38'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
