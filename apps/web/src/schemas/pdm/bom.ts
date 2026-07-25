import type { EntitySchema } from '@/schema';

export const bomSchema: EntitySchema = {
  entity: 'pdm_bom',
  title: 'BOM 管理',
  description: '管理物料清单（BOM），包括产品结构、版本、状态等',

  api: {
    module: 'pdm',
    resource: 'bomVersions',
  },

  fields: [
    {
      name: 'bom_no',
      label: 'BOM 编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: 'BOM 名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'product_id',
      label: '产品ID',
      type: 'text',
      showInList: false,
    },
    {
      name: 'product_name',
      label: '产品',
      type: 'text',
      listWidth: 140,
    },
    {
      name: 'product_code',
      label: '产品编码',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'version',
      label: '版本',
      type: 'text',
      defaultValue: '1.0',
      listWidth: 80,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'active', label: '激活' },
          { value: 'archived', label: '归档' },
          { value: 'superseded', label: '替代' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'effective_date',
      label: '生效日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'expiry_date',
      label: '失效日期',
      type: 'date',
      showInList: false,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      listWidth: 160,
    },
  ],

  list: {
    columns: ['bom_no', 'name', 'product_name', 'version', 'status', 'effective_date', 'created_at'],
    searchFields: ['bom_no', 'name', 'product_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        active: 'success',
        archived: 'default',
        superseded: 'warning',
      },
      labelMap: {
        draft: '草稿',
        active: '激活',
        archived: '归档',
        superseded: '替代',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '激活', value: 'active' },
          { label: '归档', value: 'archived' },
          { label: '替代', value: 'superseded' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['bom_no', 'name', 'product_id', 'version'],
    },
    {
      title: '产品信息',
      fields: ['product_code', 'product_name'],
    },
    {
      title: '状态与日期',
      fields: ['status', 'effective_date', 'expiry_date'],
    },
    {
      title: '描述',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '添加 BOM',
  editTitle: '编辑 BOM',
  detailTitle: 'BOM 详情',
};
