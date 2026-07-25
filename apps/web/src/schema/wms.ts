/**
 * WMS 模块 Schema 定义
 */

import type { EntitySchema, SchemaField } from './types';

// ============ 仓库 Schema ============

export const warehouseFields: SchemaField[] = [
  {
    name: 'code',
    label: '编码',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 120,
  },
  {
    name: 'name',
    label: '名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 150,
  },
  { name: 'address', label: '地址', type: 'text', listWidth: 200 },
  { name: 'contact', label: '联系人', type: 'text', listWidth: 100 },
  { name: 'phone', label: '电话', type: 'text', listWidth: 120 },
  { name: 'manager', label: '负责人', type: 'text', listWidth: 100 },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { value: 'active', label: '启用' },
      { value: 'inactive', label: '停用' },
    ],
    listWidth: 100,
    hideInForm: true,
  },
  {
    name: 'created_at',
    label: '创建时间',
    type: 'datetime',
    listWidth: 160,
    sortable: true,
    hideInForm: true,
  },
];

export const warehouseSchema: EntitySchema = {
  entity: 'warehouse',
  title: '仓库',
  description: '仓库管理',
  fields: warehouseFields,
  actions: ['create', 'edit', 'delete', 'detail'],
  list: { pageSize: 20, selectable: false },
  formColCount: 2,
  createTitle: '新建仓库',
  editTitle: '编辑仓库',
  detailTitle: '仓库详情',
};

// ============ 库位 Schema ============

export const locationFields: SchemaField[] = [
  {
    name: 'code',
    label: '库位编码',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 120,
  },
  {
    name: 'name',
    label: '名称',
    type: 'text',
    required: true,
    validation: [{ type: 'required' }],
    listWidth: 120,
  },
  { name: 'warehouse_id', label: '所属仓库', type: 'select', required: true, listWidth: 120 },
  {
    name: 'location_type',
    label: '类型',
    type: 'select',
    required: true,
    options: [
      { value: 'shelf', label: '货架' },
      { value: 'floor', label: '地面' },
      { value: 'rack', label: '高位货架' },
    ],
    listWidth: 100,
  },
  { name: 'capacity', label: '容量', type: 'number', listWidth: 80 },
  { name: 'weight_limit', label: '承重限制', type: 'number', listWidth: 100 },
  {
    name: 'status',
    label: '状态',
    type: 'select',
    options: [
      { value: 'empty', label: '空' },
      { value: 'partial', label: '部分占用' },
      { value: 'full', label: '满' },
    ],
    listWidth: 100,
    hideInForm: true,
  },
];

export const locationSchema: EntitySchema = {
  entity: 'location',
  title: '库位',
  description: '库位管理',
  fields: locationFields,
  actions: ['create', 'edit', 'delete'],
  list: { pageSize: 20, selectable: false },
  formColCount: 2,
  createTitle: '新建库位',
  editTitle: '编辑库位',
};
