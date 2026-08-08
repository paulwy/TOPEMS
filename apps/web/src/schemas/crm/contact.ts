/**
 * 联系人管理 Schema — 驱动 ContactManagementPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';

export const contactSchema: EntitySchema = {
  entity: 'contact',
  title: '联系人管理',
  description: '管理联系人信息，包括姓名、联系方式、职位等',

  api: {
    module: 'crm',
    resource: 'contacts',
  },

  fields: [
    {
      name: 'first_name',
      label: '名',
      type: 'text',
      required: true,
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'last_name',
      label: '姓',
      type: 'text',
      listWidth: 80,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'email',
      label: '邮箱',
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'phone',
      label: '电话',
      type: 'text',
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'position',
      label: '职位',
      type: 'text',
      listWidth: 120,
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
          { value: 'inactive', label: '非活跃' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'customer_id',
      label: '客户ID',
      type: 'text',
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['first_name', 'last_name', 'email', 'phone', 'position', 'status'],
    searchFields: ['first_name', 'last_name', 'email'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: '活跃',
        inactive: '非活跃',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '非活跃', value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['first_name', 'last_name', 'email', 'phone', 'position'],
    },
    {
      title: '其他',
      fields: ['status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增联系人',
  editTitle: '编辑联系人',
  detailTitle: '联系人详情',
};
