/**
 * 仓库管理 Schema — 驱动 WarehouseManagementPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';

export const warehouseSchema: EntitySchema = {
  entity: 'warehouse',
  title: '仓库管理',
  description: '管理仓库基础信息，包括名称、编码、地址、负责人、联系方式等',

  api: {
    module: 'wms',
    resource: 'warehouses',
  },

  fields: [
    {
      name: 'name',
      label: '仓库名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
      tableEditable: true,
    },
    {
      name: 'code',
      label: '仓库编码',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'address',
      label: '地址',
      type: 'text',
      listWidth: 180,
      tableEditable: true,
    },
    {
      name: 'manager',
      label: '负责人',
      type: 'text',
      listWidth: 100,
      tableEditable: true,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'phone',
      label: '电话',
      type: 'text',
      listWidth: 120,
      tableEditable: true,
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
          { value: 'maintenance', label: '维护中' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
  ],

  list: {
    columns: ['name', 'code', 'address', 'manager', 'phone', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    inlineEditable: true,
    inlineEditMode: 'cell',
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'info',
        maintenance: 'warning',
      },
      labelMap: {
        active: '启用',
        inactive: '停用',
        maintenance: '维护中',
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
          { label: '维护中', value: 'maintenance' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code'],
    },
    {
      title: '联系信息',
      fields: ['address', 'manager', 'phone'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增仓库',
  editTitle: '编辑仓库',
  detailTitle: '仓库详情',
};
