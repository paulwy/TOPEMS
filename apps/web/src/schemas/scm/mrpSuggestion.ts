import React from 'react';
import { Box, Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

export const mrpMaterialSummarySchema: EntitySchema = {
  entity: 'mrpMaterialSummary',
  title: i18n.t('scm.mrp_suggestion.k0'),
  description: i18n.t('shared.mrp_suggestion.k0'),

  api: {
    module: 'scm',
    resource: 'mrpMaterialSummary',
  },

  fields: [
    {
      name: 'product_code',
      label: i18n.t('scm.mrp_suggestion.k1'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Box, { sx: { fontWeight: 500 } }, String(row.product_code ?? '')),
    },
    {
      name: 'product_name',
      label: i18n.t('scm.mrp_suggestion.k2'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'specification',
      label: i18n.t('scm.mrp_suggestion.k3'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        row.specification ? String(row.specification) : '-',
    },
    {
      name: 'unit',
      label: i18n.t('scm.mrp_suggestion.k4'),
      type: 'text',
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => (row.unit ? String(row.unit) : '-'),
    },
    {
      name: 'total_demand',
      label: i18n.t('scm.mrp_suggestion.k5'),
      type: 'number',
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'total_supply',
      label: i18n.t('scm.mrp_suggestion.k6'),
      type: 'number',
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'net_demand',
      label: i18n.t('scm.mrp_suggestion.k7'),
      type: 'number',
      align: 'right',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.net_demand as number | undefined;
        const color = (val ?? 0) > 0 ? 'error.main' : 'success.main';
        return React.createElement(Box, { sx: { fontWeight: 500, color } }, val ?? 0);
      },
    },
    {
      name: 'safety_stock',
      label: i18n.t('scm.mrp_suggestion.k8'),
      type: 'number',
      align: 'right',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        row.safety_stock != null ? Number(row.safety_stock) : 0,
    },
    {
      name: 'category',
      label: i18n.t('scm.mrp_suggestion.k9'),
      type: 'text',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => (row.category ? String(row.category) : '-'),
    },
  ],

  list: {
    columns: [
      'product_code',
      'product_name',
      'specification',
      'unit',
      'total_demand',
      'total_supply',
      'net_demand',
      'safety_stock',
      'category',
    ],
    searchFields: ['product_code', 'product_name'],
    pageSize: 10,
    filters: [
      {
        id: 'category',
        label: i18n.t('scm.mrp_suggestion.k10'),
        type: 'select',
        options: [
          { label: i18n.t('scm.mrp_suggestion.k11'), value: 'all' },
          { label: i18n.t('shared.mrp_suggestion.a_1'), value: 'A' },
          { label: i18n.t('shared.mrp_suggestion.b_2'), value: 'B' },
          { label: i18n.t('shared.mrp_suggestion.c_3'), value: 'C' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('scm.mrp_suggestion.k12'),
};

const suggestionTypeConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  purchase: { label: i18n.t('scm.mrp_suggestion.k13'), color: 'primary' },
  production: { label: i18n.t('scm.mrp_suggestion.k14'), color: 'success' },
  transfer: { label: i18n.t('scm.mrp_suggestion.k15'), color: 'warning' },
};

const statusColorConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  pending: { label: i18n.t('scm.mrp_suggestion.k16'), color: 'warning' },
  confirmed: { label: i18n.t('scm.mrp_suggestion.k17'), color: 'success' },
  rejected: { label: i18n.t('scm.mrp_suggestion.k18'), color: 'error' },
  completed: { label: i18n.t('scm.mrp_suggestion.k19'), color: 'info' },
};

export const mrpSuggestionSchema: EntitySchema = {
  entity: 'mrpSuggestion',
  title: i18n.t('shared.mrp_suggestion.mrp_4'),
  description: i18n.t('shared.mrp_suggestion.k5'),

  api: {
    module: 'scm',
    resource: 'mrpSuggestions',
  },

  fields: [
    {
      name: 'product_code',
      label: i18n.t('scm.mrp_suggestion.k20'),
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: i18n.t('scm.mrp_suggestion.k21'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'specification',
      label: i18n.t('scm.mrp_suggestion.k22'),
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'suggestion_type',
      label: i18n.t('scm.mrp_suggestion.k23'),
      type: 'select',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'purchase', label: i18n.t('scm.mrp_suggestion.k24') },
          { value: 'production', label: i18n.t('scm.mrp_suggestion.k25') },
          { value: 'transfer', label: i18n.t('scm.mrp_suggestion.k26') },
        ],
      },
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.suggestion_type ?? '');
        const config = suggestionTypeConfig[value];
        return React.createElement(Chip, {
          label: config?.label ?? value,
          size: 'small',
          color: config?.color ?? 'default',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'required_quantity',
      label: i18n.t('scm.mrp_suggestion.k27'),
      type: 'number',
      hideInForm: true,
      align: 'right',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const qty = row.required_quantity as number | undefined;
        const unit = (row.unit as string | undefined) || '';
        return `${qty ?? 0} ${unit}`.trim();
      },
    },
    {
      name: 'available_quantity',
      label: i18n.t('scm.mrp_suggestion.k28'),
      type: 'number',
      hideInForm: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'suggested_quantity',
      label: i18n.t('scm.mrp_suggestion.k29'),
      type: 'number',
      hideInForm: true,
      align: 'right',
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const qty = row.suggested_quantity as number | undefined;
        const unit = (row.unit as string | undefined) || '';
        return `${qty ?? 0} ${unit}`.trim();
      },
    },
    {
      name: 'due_date',
      label: i18n.t('scm.mrp_suggestion.k30'),
      type: 'date',
      hideInForm: true,
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.due_date as string | undefined;
        return val ? new Date(val).toLocaleDateString('zh-CN') : '-';
      },
    },
    {
      name: 'supplier_name',
      label: i18n.t('scm.mrp_suggestion.k31'),
      type: 'text',
      hideInForm: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'status',
      label: i18n.t('scm.mrp_suggestion.k32'),
      type: 'select',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('scm.mrp_suggestion.k33') },
          { value: 'confirmed', label: i18n.t('scm.mrp_suggestion.k34') },
          { value: 'rejected', label: i18n.t('scm.mrp_suggestion.k35') },
          { value: 'completed', label: i18n.t('scm.mrp_suggestion.k36') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.status ?? '');
        const config = statusColorConfig[value];
        return React.createElement(Chip, {
          label: config?.label ?? value,
          size: 'small',
          color: config?.color ?? 'default',
          variant: 'outlined',
        });
      },
      validation: [{ type: 'maxLength', value: 50 }],
    },
  ],

  list: {
    columns: [
      'product_code',
      'product_name',
      'specification',
      'suggestion_type',
      'required_quantity',
      'available_quantity',
      'suggested_quantity',
      'due_date',
      'supplier_name',
      'status',
    ],
    searchFields: ['product_code', 'product_name', 'supplier_name'],
    pageSize: 10,
    selectable: true,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        confirmed: 'success',
        rejected: 'error',
        completed: 'info',
      },
      labelMap: {
        pending: i18n.t('scm.mrp_suggestion.k37'),
        confirmed: i18n.t('scm.mrp_suggestion.k38'),
        rejected: i18n.t('scm.mrp_suggestion.k39'),
        completed: i18n.t('scm.mrp_suggestion.k40'),
      },
    },
    filters: [
      {
        id: 'suggestion_type',
        label: i18n.t('scm.mrp_suggestion.k41'),
        type: 'select',
        options: [
          { label: i18n.t('scm.mrp_suggestion.k42'), value: 'all' },
          { label: i18n.t('scm.mrp_suggestion.k43'), value: 'purchase' },
          { label: i18n.t('scm.mrp_suggestion.k44'), value: 'production' },
          { label: i18n.t('scm.mrp_suggestion.k45'), value: 'transfer' },
        ],
      },
      {
        id: 'status',
        label: i18n.t('scm.mrp_suggestion.k46'),
        type: 'select',
        options: [
          { label: i18n.t('scm.mrp_suggestion.k47'), value: 'all' },
          { label: i18n.t('scm.mrp_suggestion.k48'), value: 'pending' },
          { label: i18n.t('scm.mrp_suggestion.k49'), value: 'confirmed' },
          { label: i18n.t('scm.mrp_suggestion.k50'), value: 'rejected' },
          { label: i18n.t('scm.mrp_suggestion.k51'), value: 'completed' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: i18n.t('shared.mrp_suggestion.mrp_6'),
};
