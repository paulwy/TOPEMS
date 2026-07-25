import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const inventoryTurnoverSchema: EntitySchema = {
  entity: 'inventoryTurnover',
  title: '库存周转分析',
  description: '库存周转率与库存天数分析，支持按分类筛选',

  api: {
    module: 'scm',
    resource: 'inventoryTurnover',
  },

  fields: [
    {
      name: 'product_code',
      label: '物料编码',
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
      label: '物料名称',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'category',
      label: '分类',
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
      label: '周转率',
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
          color: isLow ? '#d32f2f' : '#2e7d32',
        };
        return React.createElement(
          Typography,
          { variant: 'body2', style },
          `${val.toFixed(2)}${isLow ? ' (低)' : ''}`
        );
      },
    },
    {
      name: 'turnover_days',
      label: '库存天数',
      type: 'number',
      align: 'right',
      sortable: true,
      listWidth: 110,
      renderCell: (row: Record<string, unknown>) => {
        const val = row.turnover_days as number | undefined;
        if (val == null) return '-';
        const isHigh = val > 90;
        const style: React.CSSProperties = {
          color: isHigh ? '#d32f2f' : undefined,
        };
        return React.createElement(Typography, { variant: 'body2', style }, `${val}天`);
      },
    },
    {
      name: 'average_inventory',
      label: '平均库存',
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
      label: '成本',
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
      label: 'ABC分类',
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
      label: '统计周期',
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'sales_quantity',
      label: '销售数量',
      type: 'number',
      align: 'right',
      listWidth: 110,
      showInList: false,
    },
    {
      name: 'beginning_inventory',
      label: '期初库存',
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'ending_inventory',
      label: '期末库存',
      type: 'number',
      align: 'right',
      showInList: false,
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      showInList: false,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      showInList: false,
    },
    {
      name: 'calculated_at',
      label: '计算时间',
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
        label: '分类',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '原材料', value: '原材料' },
          { label: '零部件', value: '零部件' },
          { label: '成品', value: '成品' },
          { label: '包装材料', value: '包装材料' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['product_code', 'product_name', 'category', 'specification', 'unit', 'period'],
    },
    {
      title: '周转指标',
      fields: ['turnover_rate', 'turnover_days', 'abc_category'],
    },
    {
      title: '库存与成本',
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
  detailTitle: '库存周转详情',
};
