import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export const inventoryTurnoverSchema: EntitySchema = {
  entity: 'inventoryTurnover',
  title: i18n.t('scm.inventory_turnover.k0'),
  description: i18n.t('scm.inventory_turnover.k1'),

  api: {
    module: 'scm',
    resource: 'inventoryTurnover',
  },

  fields: [
    {
      name: 'product_code',
      label: i18n.t('scm.inventory_turnover.k2'),
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const style: React.CSSProperties = { fontWeight: 500 };
        return React.createElement('span', { style }, String(row.product_code ?? ''));
      },
    },
    {
      name: 'product_name',
      label: i18n.t('scm.inventory_turnover.k3'),
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'category',
      label: i18n.t('scm.inventory_turnover.k4'),
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const value = row.category as string | undefined;
        if (!value) return '-';
        return React.createElement(Chip, {
          label: value,
          size: 'small',
          variant: 'outlined',
        });
      },
    },
    {
      name: 'turnover_rate',
      label: i18n.t('scm.inventory_turnover.k5'),
      type: 'number',
      align: 'right',
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.turnover_rate as number | undefined;
        if (val == null) return '-';
        const isLow = val < 3;
        const style: React.CSSProperties = {
          fontWeight: 600,
          color: isLow ? designTokens.colors.error.dark : designTokens.colors.success.dark,
        };
        return React.createElement(
          Typography,
          { variant: 'body2', style },
          `${val.toFixed(2)}${isLow ? i18n.t('shared.inventory_turnover.k0') : ''}`
        );
      },
    },
    {
      name: 'turnover_days',
      label: i18n.t('scm.inventory_turnover.k6'),
      type: 'number',
      align: 'right',
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.turnover_days as number | undefined;
        if (val == null) return '-';
        const isHigh = val > 90;
        const style: React.CSSProperties = {
          color: isHigh ? designTokens.colors.error.dark : undefined,
        };
        return React.createElement(
          Typography,
          { variant: 'body2', style },
          `${val}${i18n.t('shared.inventory_turnover.k1')}`
        );
      },
    },
    {
      name: 'average_inventory',
      label: i18n.t('scm.inventory_turnover.k7'),
      type: 'number',
      align: 'right',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.average_inventory as number | null | undefined;
        return val != null ? val.toLocaleString() : '-';
      },
    },
    {
      name: 'cost_of_goods_sold',
      label: i18n.t('scm.inventory_turnover.k8'),
      type: 'number',
      align: 'right',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.cost_of_goods_sold as number | null | undefined;
        if (val == null) return '-';
        return React.createElement(
          Typography,
          { variant: 'body2' },
          val.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
        );
      },
    },
    {
      name: 'abc_category',
      label: i18n.t('shared.inventory_turnover.abc_2'),
      type: 'text',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.abc_category as string | undefined;
        if (!val) return '-';
        const colorMap: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
          A: 'error',
          B: 'warning',
          C: 'success',
        };
        return React.createElement(Chip, {
          label: val,
          size: 'small',
          color: colorMap[val] || 'default',
        });
      },
    },
    {
      name: 'period',
      label: i18n.t('scm.inventory_turnover.k9'),
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'sales_quantity',
      label: i18n.t('scm.inventory_turnover.k10'),
      type: 'number',
      align: 'right',
      listWidth: 110,
      showInList: false,
    },
    {
      name: 'beginning_inventory',
      label: i18n.t('scm.inventory_turnover.k11'),
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'ending_inventory',
      label: i18n.t('scm.inventory_turnover.k12'),
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'specification',
      label: i18n.t('scm.inventory_turnover.k13'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'unit',
      label: i18n.t('scm.inventory_turnover.k14'),
      type: 'text',
      showInList: false,
    },
    {
      name: 'calculated_at',
      label: i18n.t('scm.inventory_turnover.k15'),
      type: 'datetime',
      listWidth: 160,
      showInForm: false,
    },
  ],

  list: {
    columns: [
      'product_code',
      'product_name',
      'category',
      'turnover_rate',
      'turnover_days',
      'average_inventory',
      'cost_of_goods_sold',
      'abc_category',
    ],
    searchFields: ['product_code', 'product_name'],
    pageSize: 10,
    filters: [
      {
        id: 'category',
        label: i18n.t('scm.inventory_turnover.k16'),
        type: 'select',
        options: [
          { label: i18n.t('scm.inventory_turnover.k17'), value: 'all' },
          {
            label: i18n.t('scm.inventory_turnover.k18'),
            value: i18n.t('scm.inventory_turnover.k19'),
          },
          {
            label: i18n.t('scm.inventory_turnover.k20'),
            value: i18n.t('scm.inventory_turnover.k21'),
          },
          {
            label: i18n.t('scm.inventory_turnover.k22'),
            value: i18n.t('scm.inventory_turnover.k23'),
          },
          {
            label: i18n.t('scm.inventory_turnover.k24'),
            value: i18n.t('scm.inventory_turnover.k25'),
          },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: i18n.t('scm.inventory_turnover.k26'),
      fields: ['product_code', 'product_name', 'category', 'specification', 'unit', 'period'],
    },
    {
      title: i18n.t('scm.inventory_turnover.k27'),
      fields: ['turnover_rate', 'turnover_days', 'abc_category'],
    },
    {
      title: i18n.t('scm.inventory_turnover.k28'),
      fields: [
        'average_inventory',
        'beginning_inventory',
        'ending_inventory',
        'cost_of_goods_sold',
        'sales_quantity',
      ],
    },
  ],

  formColCount: 2,
  detailTitle: i18n.t('scm.inventory_turnover.k29'),
};
