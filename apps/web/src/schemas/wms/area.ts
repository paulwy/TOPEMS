import type { EntitySchema } from '@/schema';
import type { SchemaExtensions } from '@/schema/schemaExtensions';

export const areaSchema: EntitySchema & SchemaExtensions = {
  entity: 'wms_area',
  title: '库区管理',
  description: '管理仓库库区层级结构，支持仓库、区域、库区、库位等多级管理',

  api: {
    module: 'wms',
    resource: 'areas',
  },

  fields: [
    {
      name: 'name',
      label: '名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: '编码',
      type: 'text',
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'area_type',
      label: '类型',
      type: 'select',
      required: true,
      defaultValue: 'zone',
      options: {
        type: 'static',
        options: [
          { value: 'warehouse', label: '仓库' },
          { value: 'zone', label: '区域' },
          { value: 'area', label: '库区' },
          { value: 'location', label: '库位' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parent_id',
      label: '上级区域',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'capacity',
      label: '容量',
      type: 'number',
      listWidth: 100,
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
    },
  ],

  list: {
    columns: ['name', 'code', 'area_type', 'capacity', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        maintenance: 'warning',
      },
      labelMap: {
        active: '启用',
        inactive: '停用',
        maintenance: '维护中',
      },
    },
  },

  tree: {
    keyField: 'id',
    parentField: 'parent_id',
    labelField: 'name',
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'area_type'],
    },
    {
      title: '层级关系',
      fields: ['parent_id'],
    },
    {
      title: '容量与状态',
      fields: ['capacity', 'status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增库区',
  editTitle: '编辑库区',
  detailTitle: '库区详情',
};
