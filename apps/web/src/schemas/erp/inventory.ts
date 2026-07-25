import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';

function renderDateCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as string | null | undefined;
  if (!val) return '-';
  return new Date(val).toLocaleDateString('zh-CN');
}

function renderCostCell(row: Record<string, unknown>, field: string) {
  const val = row[field] as number | null | undefined;
  if (val === undefined || val === null) return '-';
  return `¥${Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

function renderStockStatusCell(row: Record<string, unknown>) {
  const quantity = Number(row.quantity) || 0;
  const safetyStock = Number(row.safety_stock) || 0;

  let label = '正常';
  let color: 'success' | 'warning' | 'error' | 'default' = 'success';

  if (quantity <= 0) {
    label = '缺货';
    color = 'error';
  } else if (safety_stock > 0 && quantity < safetyStock) {
    label = '低于安全库存';
    color = 'warning';
  }

  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: color === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

export const inventorySchema: EntitySchema = {
  entity: 'erpInventory',
  title: '库存管理',
  description: '管理库存信息，包括物料、数量、仓库、库位等',

  api: {
    module: 'erp',
    resource: 'inventory',
  },

  fields: [
    {
      name: 'material_code',
      label: '物料编码',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      placeholder: '请输入物料编码',
    },
    {
      name: 'material_name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      placeholder: '请输入物料名称',
    },
    {
      name: 'material_id',
      label: '物料ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'specification',
      label: '规格型号',
      type: 'text',
      listWidth: 120,
      placeholder: '请输入规格型号',
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
      placeholder: '请输入单位',
    },
    {
      name: 'warehouse_name',
      label: '仓库',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '原材料仓库', label: '原材料仓库' },
          { value: '成品仓库', label: '成品仓库' },
          { value: '半成品仓库', label: '半成品仓库' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'warehouse_id',
      label: '仓库ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'location_name',
      label: '库位',
      type: 'text',
      listWidth: 100,
      placeholder: '请输入库位',
    },
    {
      name: 'location_id',
      label: '库位ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'quantity',
      label: '库存数量',
      type: 'number',
      defaultValue: 0,
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: '可用数量',
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'reserved_quantity',
      label: '预留数量',
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'safety_stock',
      label: '安全库存',
      type: 'number',
      defaultValue: 0,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'max_stock',
      label: '最大库存',
      type: 'number',
      defaultValue: 0,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'unit_cost',
      label: '单位成本',
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderCostCell(row, 'unit_cost'),
    },
    {
      name: 'total_cost',
      label: '库存金额',
      type: 'number',
      readonly: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => renderCostCell(row, 'total_cost'),
    },
    {
      name: 'batch_number',
      label: '批次号',
      type: 'text',
      listWidth: 120,
      placeholder: '请输入批次号',
    },
    {
      name: 'production_date',
      label: '生产日期',
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'production_date'),
    },
    {
      name: 'expiry_date',
      label: '有效期',
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'expiry_date'),
    },
    {
      name: 'stock_status',
      label: '库存状态',
      type: 'text',
      readonly: true,
      listWidth: 120,
      renderCell: renderStockStatusCell,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      readonly: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'date',
      readonly: true,
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'updated_at'),
    },
  ],

  list: {
    pageSize: 10,
    searchFields: ['material_code', 'material_name', 'batch_number'],
    filters: [
      {
        id: 'warehouse',
        label: '仓库',
        type: 'select',
        options: [
          { label: '全部仓库', value: 'all' },
          { label: '原材料仓库', value: 'W001' },
          { label: '成品仓库', value: 'W002' },
          { label: '半成品仓库', value: 'W003' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: '物料信息',
      fields: ['material_code', 'material_name', 'specification', 'unit'],
    },
    {
      title: '仓库库位',
      fields: ['warehouse_name', 'location_name'],
    },
    {
      title: '数量与成本',
      fields: ['quantity', 'safety_stock', 'max_stock', 'unit_cost'],
    },
    {
      title: '批次信息',
      fields: ['batch_number', 'production_date', 'expiry_date'],
    },
  ],

  formColCount: 2,
  createTitle: '新增库存',
  editTitle: '编辑库存',
  detailTitle: '库存详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
