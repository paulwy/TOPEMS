import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  pending: { label: '询价中', color: 'warning' },
  quoted: { label: '已报价', color: 'primary' },
  comparing: { label: '比价中', color: 'info' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
};

export const priceComparisonSchema: EntitySchema = {
  entity: 'priceComparison',
  title: '询价比价',
  description: '采购询价比价管理',

  api: {
    module: 'scm',
    resource: 'priceComparisons',
  },

  fields: [
    {
      name: 'comparison_no',
      label: '询价单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'title',
      label: '标题',
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'product_name',
      label: '物料',
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      listWidth: 100,
    },
    {
      name: 'result_supplier_name',
      label: '供应商',
      type: 'text',
      hideInForm: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => (row.result_supplier_name as string) || '-',
    },
    {
      name: 'result_price',
      label: '报价',
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
      label: '最低价',
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
      label: '状态',
      type: 'select',
      hideInForm: true,
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '询价中' },
          { value: 'quoted', label: '已报价' },
          { value: 'comparing', label: '比价中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
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
      label: '截止日期',
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
        pending: '询价中',
        quoted: '已报价',
        comparing: '比价中',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '询价中', value: 'pending' },
          { label: '已报价', value: 'quoted' },
          { label: '比价中', value: 'comparing' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['comparison_no', 'title', 'product_name', 'quantity', 'deadline'],
    },
  ],

  formColCount: 2,
  createTitle: '新建询价单',
  editTitle: '编辑询价单',
  detailTitle: '询价单详情',
};
