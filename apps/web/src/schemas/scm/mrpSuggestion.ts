import React from 'react';
import { Box, Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

export const mrpMaterialSummarySchema: EntitySchema = {
  entity: 'mrpMaterialSummary',
  title: '物料汇总',
  description: 'MRP物料需求汇总，按物料维度统计总需求、总供给、净需求等',

  api: {
    module: 'scm',
    resource: 'mrpMaterialSummary',
  },

  fields: [
    {
      name: 'product_code',
      label: '物料编码',
      type: 'text',
      sortable: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) =>
        React.createElement(Box, { sx: { fontWeight: 500 } }, String(row.product_code ?? '')),
    },
    {
      name: 'product_name',
      label: '物料名称',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) =>
        row.specification ? String(row.specification) : '-',
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
      renderCell: (row: Record<string, unknown>) => (row.unit ? String(row.unit) : '-'),
    },
    {
      name: 'total_demand',
      label: '总需求',
      type: 'number',
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'total_supply',
      label: '总供给',
      type: 'number',
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'net_demand',
      label: '净需求',
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
      label: '安全库存',
      type: 'number',
      align: 'right',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) =>
        row.safety_stock != null ? Number(row.safety_stock) : 0,
    },
    {
      name: 'category',
      label: '分类',
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
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: 'A类', value: 'A' },
          { label: 'B类', value: 'B' },
          { label: 'C类', value: 'C' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: '物料汇总详情',
};

const suggestionTypeConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  purchase: { label: '采购建议', color: 'primary' },
  production: { label: '生产建议', color: 'success' },
  transfer: { label: '调拨建议', color: 'warning' },
};

const statusColorConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }
> = {
  pending: { label: '待确认', color: 'warning' },
  confirmed: { label: '已确认', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  completed: { label: '已完成', color: 'info' },
};

export const mrpSuggestionSchema: EntitySchema = {
  entity: 'mrpSuggestion',
  title: 'MRP建议',
  description: 'MRP运算建议列表，包括采购建议、生产建议，支持批量确认和生成订单',

  api: {
    module: 'scm',
    resource: 'mrpSuggestions',
  },

  fields: [
    {
      name: 'product_code',
      label: '物料编码',
      type: 'text',
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'product_name',
      label: '物料名称',
      type: 'text',
      listWidth: 160,
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'suggestion_type',
      label: '建议类型',
      type: 'select',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'purchase', label: '采购建议' },
          { value: 'production', label: '生产建议' },
          { value: 'transfer', label: '调拨建议' },
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
      label: '需求数量',
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
      label: '可用数量',
      type: 'number',
      hideInForm: true,
      align: 'right',
      listWidth: 100,
    },
    {
      name: 'suggested_quantity',
      label: '建议数量',
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
      label: '需求日期',
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
      label: '供应商',
      type: 'text',
      hideInForm: true,
      listWidth: 140,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      hideInForm: true,
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待确认' },
          { value: 'confirmed', label: '已确认' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'completed', label: '已完成' },
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
        pending: '待确认',
        confirmed: '已确认',
        rejected: '已拒绝',
        completed: '已完成',
      },
    },
    filters: [
      {
        id: 'suggestion_type',
        label: '建议类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '采购建议', value: 'purchase' },
          { label: '生产建议', value: 'production' },
          { label: '调拨建议', value: 'transfer' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待确认', value: 'pending' },
          { label: '已确认', value: 'confirmed' },
          { label: '已拒绝', value: 'rejected' },
          { label: '已完成', value: 'completed' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formColCount: 2,
  detailTitle: 'MRP建议详情',
};
