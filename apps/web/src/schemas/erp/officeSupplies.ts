/**
 * 办公用品管理 Schema — 驱动 OfficeSuppliesPage 的完整 CRUD
 */

import React from 'react';
import type { EntitySchema } from '@/schema';

export const officeSuppliesSchema: EntitySchema = {
  entity: 'office_supply',
  title: '办公用品管理',
  description: '管理办公用品库存，包括文具、电子设备、家具、耗材等',

  api: {
    module: 'erp',
    resource: 'officeSupplies',
  },

  fields: [
    {
      name: 'name',
      label: '名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'category',
      label: '类别',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'stationery', label: '文具' },
          { value: 'electronics', label: '电子设备' },
          { value: 'furniture', label: '家具' },
          { value: 'consumables', label: '耗材' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 80,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'price',
      label: '单价',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const price = row.price as number | undefined;
        return price ? `¥${price.toFixed(2)}` : '-';
      },
    },
    {
      name: 'location',
      label: '存放位置',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'in_stock',
      options: {
        type: 'static',
        options: [
          { value: 'in_stock', label: '在库' },
          { value: 'low_stock', label: '库存不足' },
          { value: 'out_of_stock', label: '缺货' },
          { value: 'discontinued', label: '已停用' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: ['name', 'category', 'quantity', 'unit', 'price', 'location', 'status'],
    searchFields: ['name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        in_stock: 'success',
        low_stock: 'warning',
        out_of_stock: 'error',
        discontinued: 'default',
      },
      labelMap: {
        in_stock: '在库',
        low_stock: '库存不足',
        out_of_stock: '缺货',
        discontinued: '已停用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '在库', value: 'in_stock' },
          { label: '库存不足', value: 'low_stock' },
          { label: '缺货', value: 'out_of_stock' },
          { label: '已停用', value: 'discontinued' },
        ],
      },
      {
        id: 'category',
        label: '类别',
        type: 'select',
        options: [
          { label: '全部类别', value: 'all' },
          { label: '文具', value: 'stationery' },
          { label: '电子设备', value: 'electronics' },
          { label: '家具', value: 'furniture' },
          { label: '耗材', value: 'consumables' },
          { label: '其他', value: 'other' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'category', 'unit', 'location'],
    },
    {
      title: '库存信息',
      fields: ['quantity', 'price', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增办公用品',
  editTitle: '编辑办公用品',
  detailTitle: '办公用品详情',
};
