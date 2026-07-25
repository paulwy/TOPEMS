import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { EntitySchema } from '@/schema';

const STATUS_COLOR_MAP: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  sufficient: 'success',
  normal: 'info',
  low: 'warning',
  insufficient: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  sufficient: '充足',
  normal: '正常',
  low: '偏低',
  insufficient: '不足',
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
  title: '研发物料',
  description: '管理研发物料库存，包括物料编码、名称、分类、库存数量等',

  api: {
    module: 'rd',
    resource: 'materials',
  },

  fields: [
    {
      name: 'code',
      label: '物料编码',
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
    },
    {
      name: 'name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 200,
    },
    {
      name: 'category',
      label: '分类',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const val = String(row.category ?? '');
        if (!val) return '-';
        return React.createElement(Chip, { label: val, size: 'small', variant: 'outlined' });
      },
    },
    {
      name: 'stock_quantity',
      label: '库存数量',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'status',
      label: '库存状态',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'sufficient', label: '充足' },
          { value: 'normal', label: '正常' },
          { value: 'low', label: '偏低' },
          { value: 'insufficient', label: '不足' },
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
    },
    {
      name: 'specification',
      label: '规格',
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'supplier',
      label: '供应商',
      type: 'text',
      listWidth: 120,
      showInList: false,
    },
    {
      name: 'min_stock',
      label: '最小库存',
      type: 'number',
      showInList: false,
    },
    {
      name: 'max_stock',
      label: '最大库存',
      type: 'number',
      showInList: false,
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      listWidth: 120,
      renderCell: () => '-',
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'created_by',
      label: '创建人',
      type: 'text',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      showInList: false,
    },
    {
      name: 'updated_at',
      label: '更新时间',
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
        label: '分类',
        type: 'select',
        options: [{ label: '全部', value: 'all' }],
        defaultValue: 'all',
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '充足', value: 'sufficient' },
          { label: '正常', value: 'normal' },
          { label: '偏低', value: 'low' },
          { label: '不足', value: 'insufficient' },
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
      title: '基本信息',
      fields: ['code', 'name', 'category', 'unit', 'specification', 'supplier'],
    },
    {
      title: '库存信息',
      fields: ['stock_quantity', 'min_stock', 'max_stock'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增物料',
  editTitle: '编辑物料',
  detailTitle: '物料详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
