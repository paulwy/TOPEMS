/**
 * 客户管理 Schema — 驱动 CustomerManagementPage 的完整 CRUD
 */

import type { EntitySchema } from '@/schema';

export const customerSchema: EntitySchema = {
  entity: 'customer',
  title: '客户管理',

  api: {
    module: 'crm',
    resource: 'customers',
  },

  fields: [
    {
      name: 'customer_code',
      label: '客户编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 120,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'customer_name',
      label: '客户名称',
      type: 'text',
      required: true,
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'industry',
      label: '所属行业',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'manufacturing', label: '制造业' },
          { value: 'retail', label: '零售业' },
          { value: 'service', label: '服务业' },
          { value: 'tech', label: '科技' },
          { value: 'finance', label: '金融' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'level',
      label: '客户级别',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'strategic', label: '战略客户' },
          { value: 'key', label: '关键客户' },
          { value: 'normal', label: '普通客户' },
          { value: 'potential', label: '潜在客户' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'contact_person',
      label: '联系人',
      type: 'text',
      listWidth: 120,
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
      name: 'email',
      label: '邮箱',
      type: 'text',
      listWidth: 160,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'address',
      label: '地址',
      type: 'text',
      showInList: false,
      validation: [{ type: 'maxLength', value: 500 }],
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
          { value: 'pending', label: '待审核' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'credit_limit',
      label: '信用额度',
      type: 'number',
      showInList: false,
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'customer_code',
      'customer_name',
      'industry',
      'level',
      'contact_person',
      'phone',
      'status',
    ],
    searchFields: ['customer_code', 'customer_name', 'contact_person'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
        pending: 'warning',
      },
      labelMap: {
        active: '活跃',
        inactive: '非活跃',
        pending: '待审核',
      },
    },
    filters: [
      {
        id: 'industry',
        label: '所属行业',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '制造业', value: 'manufacturing' },
          { label: '零售业', value: 'retail' },
          { label: '服务业', value: 'service' },
          { label: '科技', value: 'tech' },
          { label: '金融', value: 'finance' },
          { label: '其他', value: 'other' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '活跃', value: 'active' },
          { label: '非活跃', value: 'inactive' },
          { label: '待审核', value: 'pending' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['customer_code', 'customer_name', 'industry', 'level'],
    },
    {
      title: '联系方式',
      fields: ['contact_person', 'phone', 'email', 'address'],
    },
    {
      title: '其他',
      fields: ['status', 'credit_limit', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增客户',
  editTitle: '编辑客户',
  detailTitle: '客户详情',
};
