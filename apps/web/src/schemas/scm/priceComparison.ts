import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  pending: { label: i18n.t('scm.price_comparison.k0'), color: 'warning' },
  quoted: { label: i18n.t('scm.price_comparison.k1'), color: 'primary' },
  comparing: { label: i18n.t('scm.price_comparison.k2'), color: 'info' },
  completed: { label: i18n.t('scm.price_comparison.k3'), color: 'success' },
  cancelled: { label: i18n.t('scm.price_comparison.k4'), color: 'default' },
};

export const priceComparisonSchema: EntitySchema = {
  entity: 'priceComparison',
  title: i18n.t('scm.price_comparison.k5'),
  description: i18n.t('scm.price_comparison.k6'),

  api: {
    module: 'scm',
    resource: 'priceComparisons',
  },

  fields: [
    {
      name: 'comparison_no',
      label: i18n.t('scm.price_comparison.k7'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'title',
      label: i18n.t('scm.price_comparison.k8'),
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'product_name',
      label: i18n.t('scm.price_comparison.k9'),
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'quantity',
      label: i18n.t('scm.price_comparison.k10'),
      type: 'number',
      required: true,
      listWidth: 100,
    },
    {
      name: 'result_supplier_name',
      label: i18n.t('scm.price_comparison.k11'),
      type: 'text',
      hideInForm: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => (row.result_supplier_name as string) || '-',
    },
    {
      name: 'result_price',
      label: i18n.t('scm.price_comparison.k12'),
      type: 'number',
      hideInForm: true,
      align: 'right',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.result_price as number | undefined;
        return val != null ? val.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '-';
      },
    },
    {
      name: 'result_amount',
      label: i18n.t('scm.price_comparison.k13'),
      type: 'number',
      hideInForm: true,
      align: 'right',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.result_amount as number | undefined;
        return val != null ? val.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '-';
      },
    },
    {
      name: 'status',
      label: i18n.t('scm.price_comparison.k14'),
      type: 'select',
      hideInForm: true,
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: i18n.t('scm.price_comparison.k15') },
          { value: 'quoted', label: i18n.t('scm.price_comparison.k16') },
          { value: 'comparing', label: i18n.t('scm.price_comparison.k17') },
          { value: 'completed', label: i18n.t('scm.price_comparison.k18') },
          { value: 'cancelled', label: i18n.t('scm.price_comparison.k19') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const value = String(row.status ?? '');
        const config = statusConfig[value];
        return React.createElement(Chip, {
          label: config?.label ?? value,
          size: 'small',
          color: config?.color ?? 'default',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'deadline',
      label: i18n.t('scm.price_comparison.k20'),
      type: 'date',
      sortable: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.deadline as string | undefined;
        return val ? new Date(val).toLocaleDateString('zh-CN') : '-';
      },
    },
  ],

  list: {
    columns: [
      'comparison_no',
      'title',
      'product_name',
      'result_supplier_name',
      'result_price',
      'result_amount',
      'status',
      'deadline',
    ],
    searchFields: ['comparison_no', 'title', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        quoted: 'primary',
        comparing: 'info',
        completed: 'success',
        cancelled: 'default',
      },
      labelMap: {
        pending: i18n.t('scm.price_comparison.k21'),
        quoted: i18n.t('scm.price_comparison.k22'),
        comparing: i18n.t('scm.price_comparison.k23'),
        completed: i18n.t('scm.price_comparison.k24'),
        cancelled: i18n.t('scm.price_comparison.k25'),
      },
    },
    filters: [
      {
        id: 'status',
        label: i18n.t('scm.price_comparison.k26'),
        type: 'select',
        options: [
          { label: i18n.t('scm.price_comparison.k27'), value: 'all' },
          { label: i18n.t('scm.price_comparison.k28'), value: 'pending' },
          { label: i18n.t('scm.price_comparison.k29'), value: 'quoted' },
          { label: i18n.t('scm.price_comparison.k30'), value: 'comparing' },
          { label: i18n.t('scm.price_comparison.k31'), value: 'completed' },
          { label: i18n.t('scm.price_comparison.k32'), value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('scm.price_comparison.k33'),
      fields: ['comparison_no', 'title', 'product_name', 'quantity', 'deadline'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('scm.price_comparison.k34'),
  editTitle: i18n.t('scm.price_comparison.k35'),
  detailTitle: i18n.t('scm.price_comparison.k36'),
};
