/**
 * 物料管理 Schema — 驱动 MaterialManagementPage 的完整 CRUD
 *
 * 包含表单分组、状态徽章、筛选、自定义头部统计等高级功能。
 */

import React from 'react';
import type { EntitySchema, SchemaField } from '@/schema';

/**
 * 物料管理 Schema
 */
export const materialSchema: EntitySchema = {
  entity: 'material',
  title: '物料管理',
  description: '管理物料基础信息，包括编码、名称、规格、分类等',

  api: {
    module: 'erp',
    resource: 'materials',
  },

  fields: [
    {
      name: 'material_code',
      label: '物料编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'material_name',
      label: '物料名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'specification',
      label: '规格型号',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: '电子元件', label: '电子元件' },
          { value: '机械零件', label: '机械零件' },
          { value: '原材料', label: '原材料' },
          { value: '包装材料', label: '包装材料' },
          { value: '辅助材料', label: '辅助材料' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'unit',
      label: '单位',
      type: 'text',
      listWidth: 80,
    },
    {
      name: 'unit_price',
      label: '单价',
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const price = row.unit_price as number | undefined;
        return price ? `¥${price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'supplier_id',
      label: '供应商ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'supplier_name',
      label: '主供应商',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
          { value: 'obsolete', label: '淘汰' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'barcode',
      label: '条形码',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'weight',
      label: '重量 (kg)',
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'volume',
      label: '体积 (m³)',
      type: 'number',
      defaultValue: 0,
      showInList: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'material_code',
      'material_name',
      'specification',
      'category',
      'unit',
      'unit_price',
      'supplier_name',
      'status',
    ],
    searchFields: ['material_code', 'material_name', 'barcode'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        obsolete: 'error',
      },
      labelMap: {
        active: '启用',
        inactive: '停用',
        obsolete: '淘汰',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '淘汰', value: 'obsolete' },
        ],
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '电子元件', value: '电子元件' },
          { label: '机械零件', value: '机械零件' },
          { label: '原材料', value: '原材料' },
          { label: '包装材料', value: '包装材料' },
          { label: '辅助材料', value: '辅助材料' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['material_code', 'material_name', 'specification', 'category', 'unit'],
    },
    {
      title: '价格与供应商',
      fields: ['unit_price', 'supplier_name', 'barcode'],
    },
    {
      title: '物理属性',
      fields: ['weight', 'volume'],
    },
    {
      title: '状态与描述',
      fields: ['status', 'description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增物料',
  editTitle: '编辑物料',
  detailTitle: '物料详情',
};
