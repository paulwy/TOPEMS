import type { EntitySchema } from '@/schema';

export const interactionSchema: EntitySchema = {
  entity: 'interaction',
  title: '交互记录管理',
  description: '管理客户交互记录，包括电话、邮件、会议、拜访等',

  api: {
    module: 'crm',
    resource: 'interactions',
  },

  fields: [
    {
      name: 'customer_id',
      label: '客户ID',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'contact_id',
      label: '联系人ID',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      required: true,
      defaultValue: 'call',
      options: {
        type: 'static',
        options: [
          { value: 'call', label: '电话' },
          { value: 'email', label: '邮件' },
          { value: 'meeting', label: '会议' },
          { value: 'visit', label: '拜访' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'subject',
      label: '主题',
      type: 'text',
      listWidth: 200,
      validation: [{ type: 'maxLength', value: 255 }],
    },
    {
      name: 'content',
      label: '内容',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'scheduled_at',
      label: '计划时间',
      type: 'datetime',
      listWidth: 160,
    },
    {
      name: 'completed_at',
      label: '完成时间',
      type: 'datetime',
      showInList: false,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: '已计划' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 160,
    },
  ],

  list: {
    columns: ['subject', 'type', 'scheduled_at', 'completed_at', 'status'],
    searchFields: ['subject', 'content'],
    pageSize: 20,
    statusBadge: {
      field: 'status',
      colorMap: {
        scheduled: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        scheduled: '已计划',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'type',
        label: '类型',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '电话', value: 'call' },
          { label: '邮件', value: 'email' },
          { label: '会议', value: 'meeting' },
          { label: '拜访', value: 'visit' },
          { label: '其他', value: 'other' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '已计划', value: 'scheduled' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '关联信息',
      fields: ['customer_id', 'contact_id', 'type'],
    },
    {
      title: '交互详情',
      fields: ['subject', 'content', 'scheduled_at'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增交互记录',
  editTitle: '编辑交互记录',
  detailTitle: '交互记录详情',
};
