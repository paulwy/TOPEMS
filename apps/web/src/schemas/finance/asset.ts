import React from 'react';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export const assetSchema: EntitySchema = {
  entity: 'finance_asset',
  title: i18n.t('finance.asset.k0'),
  description: i18n.t('finance.asset.k1'),

  api: {
    module: 'finance',
    resource: 'accounts',
  },

  fields: [
    {
      name: 'code',
      label: i18n.t('finance.asset.k2'),
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { fontWeight: 600, color: `var(--color-success-main, ${designTokens.colors.success.dark})` } },
          String(row.code || '')
        ),
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'name',
      label: i18n.t('finance.asset.k3'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement('span', { style: { fontWeight: 500 } }, String(row.name || '')),
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'category',
      label: i18n.t('finance.asset.k4'),
      type: 'select',
      required: true,
      defaultValue: 'asset',
      options: {
        type: 'static',
        options: [{ value: 'asset', label: i18n.t('finance.asset.k5') }],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          {
            style: {
              display: 'inline-block',
              padding: `${designTokens.spacing.xs} 8px`,
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              backgroundColor: `var(--color-primary-lighter, ${designTokens.colors.primary['50']})`,
              color: `var(--color-primary-main, ${designTokens.colors.primary.dark})`,
            },
          },
          row.category === 'asset' ? i18n.t('finance.asset.k6') : String(row.category || '')
        ),
    },
    {
      name: 'balance_direction',
      label: i18n.t('finance.asset.k7'),
      type: 'select',
      required: true,
      defaultValue: 'debit',
      options: {
        type: 'static',
        options: [
          { value: 'debit', label: i18n.t('finance.asset.k8') },
          { value: 'credit', label: i18n.t('finance.asset.k9') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const direction = String(row.balance_direction || '');
        const label = direction === 'debit' ? i18n.t('finance.asset.k11') : direction === 'credit' ? i18n.t('finance.asset.k10') : direction;
        const color =
          direction === 'debit'
            ? `var(--color-primary-main, ${designTokens.colors.primary.dark})`
            : `var(--color-error-main, ${designTokens.colors.error['800']})`;
        return React.createElement(
          'span',
          {
            style: {
              fontFamily: 'monospace',
              color,
            },
          },
          label
        );
      },
    },
    {
      name: 'level',
      label: i18n.t('finance.asset.k12'),
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: i18n.t('shared.asset.1_0') },
          { value: 2, label: i18n.t('shared.asset.2_1') },
          { value: 3, label: i18n.t('shared.asset.3_2') },
          { value: 4, label: i18n.t('shared.asset.4_3') },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(
          'span',
          { style: { color: `var(--color-warning-main, ${designTokens.colors.warning[500]}`, fontFamily: 'monospace' } },
          String(row.level ?? '')
        ),
    },
    {
      name: 'haschildren',
      label: i18n.t('finance.asset.k13'),
      type: 'switch',
      defaultValue: false,
      listWidth: 110,
      hideInForm: true,
      renderCell: (row: Record<string, unknown>) => {
        const hasChildren = row.haschildren === true;
        return React.createElement(
          'span',
          {
            style: {
              fontWeight: 700,
              color: hasChildren
                ? `var(--color-success-main, ${designTokens.colors.success.dark})`
                : `var(--color-text-secondary, ${designTokens.colors.cyber.metal.bottomShadow}`,
            },
          },
          hasChildren ? i18n.t('finance.asset.k15') : i18n.t('finance.asset.k14')
        );
      },
    },
    {
      name: 'status',
      label: i18n.t('finance.asset.k16'),
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: i18n.t('finance.asset.k17') },
          { value: 'disabled', label: i18n.t('finance.asset.k18') },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: i18n.t('finance.asset.k19'),
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['code', 'name', 'category', 'balance_direction', 'level', 'haschildren', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: i18n.t('finance.asset.k20'),
        disabled: i18n.t('finance.asset.k21'),
      },
    },
    filters: [
      {
        id: 'category',
        label: i18n.t('finance.asset.k22'),
        type: 'select',
        options: [{ label: i18n.t('finance.asset.k23'), value: 'asset' }],
        defaultValue: 'asset',
      },
      {
        id: 'status',
        label: i18n.t('finance.asset.k24'),
        type: 'select',
        options: [
          { label: i18n.t('finance.asset.k25'), value: 'all' },
          { label: i18n.t('finance.asset.k26'), value: 'active' },
          { label: i18n.t('finance.asset.k27'), value: 'disabled' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: i18n.t('finance.asset.k28'),
      fields: ['code', 'name', 'category', 'balance_direction', 'level', 'status'],
    },
    {
      title: i18n.t('finance.asset.k29'),
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('finance.asset.k30'),
  editTitle: i18n.t('finance.asset.k31'),
  detailTitle: i18n.t('finance.asset.k32'),
};
