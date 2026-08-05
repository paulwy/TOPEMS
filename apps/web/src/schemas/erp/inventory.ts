import React from 'react';
import { Chip } from '@mui/material';
import type { EntitySchema } from '@/schema';
import i18n from '@/i18n';

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
  } else if (safetyStock > 0 && quantity < safetyStock) {
    label = '低于安全库存';
    color = 'warning';
  }

  return React.createElement(Chip, {
    label,
    size: 'small',
    color,
    variant: (color as string) === 'default' ? 'outlined' : 'filled',
    sx: { fontWeight: 500 },
  });
}

export const inventorySchema: EntitySchema = {
  entity: 'erpInventory',
  title: i18n.t('schema:erp.inventory.meta.title'),
  description: i18n.t('schema:erp.inventory.meta.description'),

  api: {
    module: 'erp',
    resource: 'inventory',
  },

  fields: [
    {
      name: 'material_code',
      label: i18n.t('schema:erp.inventory.material_code.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 120,
      placeholder: i18n.t('schema:erp.inventory.material_code.placeholder'),
    },
    {
      name: 'material_name',
      label: i18n.t('schema:erp.inventory.material_name.label'),
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      placeholder: i18n.t('schema:erp.inventory.material_name.placeholder'),
    },
    {
      name: 'material_id',
      label: i18n.t('schema:erp.inventory.material_id.label'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'specification',
      label: i18n.t('schema:erp.inventory.specification.label'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('schema:erp.inventory.specification.placeholder'),
    },
    {
      name: 'unit',
      label: i18n.t('schema:erp.inventory.unit.label'),
      type: 'text',
      listWidth: 80,
      placeholder: i18n.t('schema:erp.inventory.unit.placeholder'),
    },
    {
      name: 'warehouse_name',
      label: i18n.t('schema:erp.inventory.warehouse_name.label'),
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '原材料仓库', label: i18n.t('schema:erp.inventory.warehouse_name.option.原材料仓库') },
          { value: '成品仓库', label: i18n.t('schema:erp.inventory.warehouse_name.option.成品仓库') },
          { value: '半成品仓库', label: i18n.t('schema:erp.inventory.warehouse_name.option.半成品仓库') },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'warehouse_id',
      label: i18n.t('schema:erp.inventory.warehouse_id.label'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'location_name',
      label: i18n.t('schema:erp.inventory.location_name.label'),
      type: 'text',
      listWidth: 100,
      placeholder: i18n.t('schema:erp.inventory.location_name.placeholder'),
    },
    {
      name: 'location_id',
      label: i18n.t('schema:erp.inventory.location_id.label'),
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'quantity',
      label: i18n.t('schema:erp.inventory.quantity.label'),
      type: 'number',
      defaultValue: 0,
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'available_quantity',
      label: i18n.t('schema:erp.inventory.available_quantity.label'),
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'reserved_quantity',
      label: i18n.t('schema:erp.inventory.reserved_quantity.label'),
      type: 'number',
      readonly: true,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'safety_stock',
      label: i18n.t('schema:erp.inventory.safety_stock.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'max_stock',
      label: i18n.t('schema:erp.inventory.max_stock.label'),
      type: 'number',
      defaultValue: 0,
      showInList: false,
      showInDetail: true,
    },
    {
      name: 'unit_cost',
      label: i18n.t('schema:erp.inventory.unit_cost.label'),
      type: 'number',
      defaultValue: 0,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderCostCell(row, 'unit_cost'),
    },
    {
      name: 'total_cost',
      label: i18n.t('schema:erp.inventory.total_cost.label'),
      type: 'number',
      readonly: true,
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => renderCostCell(row, 'total_cost'),
    },
    {
      name: 'batch_number',
      label: i18n.t('schema:erp.inventory.batch_number.label'),
      type: 'text',
      listWidth: 120,
      placeholder: i18n.t('schema:erp.inventory.batch_number.placeholder'),
    },
    {
      name: 'production_date',
      label: i18n.t('schema:erp.inventory.production_date.label'),
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'production_date'),
    },
    {
      name: 'expiry_date',
      label: i18n.t('schema:erp.inventory.expiry_date.label'),
      type: 'date',
      showInList: false,
      showInDetail: true,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'expiry_date'),
    },
    {
      name: 'stock_status',
      label: i18n.t('schema:erp.inventory.stock_status.label'),
      type: 'text',
      readonly: true,
      listWidth: 120,
      renderCell: renderStockStatusCell,
    },
    {
      name: 'created_at',
      label: i18n.t('schema:erp.inventory.created_at.label'),
      type: 'date',
      readonly: true,
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => renderDateCell(row, 'created_at'),
    },
    {
      name: 'updated_at',
      label: i18n.t('schema:erp.inventory.updated_at.label'),
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
        label: i18n.t('schema:erp.inventory.filter.warehouse.label'),
        type: 'select',
        options: [
          { label: i18n.t('schema:erp.inventory.filter.warehouse.option.all'), value: 'all' },
          { label: i18n.t('schema:erp.inventory.filter.warehouse.option.W001'), value: 'W001' },
          { label: i18n.t('schema:erp.inventory.filter.warehouse.option.W002'), value: 'W002' },
          { label: i18n.t('schema:erp.inventory.filter.warehouse.option.W003'), value: 'W003' },
        ],
        defaultValue: 'all',
      },
    ],
  },

  formSections: [
    {
      title: i18n.t('schema:erp.inventory.section.0.title'),
      fields: ['material_code', 'material_name', 'specification', 'unit'],
    },
    {
      title: i18n.t('schema:erp.inventory.section.1.title'),
      fields: ['warehouse_name', 'location_name'],
    },
    {
      title: i18n.t('schema:erp.inventory.section.2.title'),
      fields: ['quantity', 'safety_stock', 'max_stock', 'unit_cost'],
    },
    {
      title: i18n.t('schema:erp.inventory.section.3.title'),
      fields: ['batch_number', 'production_date', 'expiry_date'],
    },
  ],

  formColCount: 2,
  createTitle: i18n.t('schema:erp.inventory.meta.createTitle'),
  editTitle: i18n.t('schema:erp.inventory.meta.editTitle'),
  detailTitle: i18n.t('schema:erp.inventory.meta.detailTitle'),

  actions: ['create', 'edit', 'detail', 'delete'],
};
