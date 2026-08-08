import type { EntitySchema } from '@/schema';

export const companySchema: EntitySchema = {
  entity: 'hrm_company',
  title: '公司管理',
  description: '管理企业公司信息，包括公司名称、注册号、税号、联系方式等',

  api: {
    module: 'hrm',
    resource: 'companies',
  },

  fields: [
    {
      name: 'name',
      label: '公司名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'short_name',
      label: '公司简称',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'registration_number',
      label: '注册号',
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'tax_number',
      label: '税号',
      type: 'text',
      listWidth: 140,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'address',
      label: '地址',
      type: 'text',
      listWidth: 200,
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
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'website',
      label: '网站',
      type: 'text',
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '禁用' },
          { value: 'archived', label: '归档' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
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
      showInList: false,
    },
  ],

  list: {
    columns: [
      'name',
      'short_name',
      'registration_number',
      'tax_number',
      'contact_phone',
      'email',
      'status',
    ],
    searchFields: ['name', 'short_name', 'registration_number'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        archived: 'warning',
      },
      labelMap: {
        active: '启用',
        inactive: '禁用',
        archived: '归档',
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
          { label: '禁用', value: 'inactive' },
          { label: '归档', value: 'archived' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'short_name', 'status'],
    },
    {
      title: '注册信息',
      fields: ['registration_number', 'tax_number'],
    },
    {
      title: '联系信息',
      fields: ['address', 'contact_phone', 'email', 'website'],
    },
  ],

  formColCount: 2,
  createTitle: '新增公司',
  editTitle: '编辑公司',
  detailTitle: '公司详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};
