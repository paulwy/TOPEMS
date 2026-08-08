import type { EntitySchema } from '@/schema';

export const supplierSchema: EntitySchema = {
  entity: 'wms_supplier',
  title: '供应商管理',
  description: '管理供应商基础信息，包括名称、联系人、联系方式、银行账户等',

  api: {
    module: 'scm',
    resource: 'suppliers',
  },

  fields: [
    {
      name: 'name',
      label: '供应商名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 200 }],
    },
    {
      name: 'short_name',
      label: '简称',
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'contact_name',
      label: '联系人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_phone',
      label: '联系电话',
      type: 'text',
      listWidth: 130,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '活跃' },
          { value: 'inactive', label: '停用' },
          { value: 'blocked', label: '锁定' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'address',
      label: '地址',
      type: 'textarea',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
    },
    {
      name: 'bank_account',
      label: '银行账户',
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'tax_number',
      label: '税号',
      type: 'text',
      showInList: false,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'datetime',
      readonly: true,
      hideInForm: true,
      sortable: true,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['name', 'short_name', 'contact_name', 'contact_phone', 'email', 'status'],
    searchFields: ['name', 'contact_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        blocked: 'error',
      },
      labelMap: {
        active: '活跃',
        inactive: '停用',
        blocked: '锁定',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '锁定', value: 'blocked' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'short_name', 'status'],
    },
    {
      title: '联系信息',
      fields: ['contact_name', 'contact_phone', 'email', 'address'],
    },
    {
      title: '财务信息',
      fields: ['bank_account', 'tax_number'],
    },
  ],

  formColCount: 2,
  createTitle: '新增供应商',
  editTitle: '编辑供应商',
  detailTitle: '供应商详情',
};
