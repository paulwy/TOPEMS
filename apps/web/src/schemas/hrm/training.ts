import type { EntitySchema } from '@/schema';

export const trainingSchema: EntitySchema = {
  entity: 'hrm_training',
  title: '培训管理',
  description: '管理培训计划，包括培训名称、讲师、时间、状态、预算等',

  api: {
    module: 'hrm',
    resource: 'trainingPlans',
  },

  fields: [
    {
      name: 'name',
      label: '培训名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'code',
      label: '培训编码',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'planned',
      options: {
        type: 'static',
        options: [
          { value: 'planned', label: '已规划' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'budget',
      label: '预算',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['name', 'code', 'start_date', 'end_date', 'budget', 'status'],
    searchFields: ['name', 'code'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        planned: 'default',
        in_progress: 'info',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        planned: '已规划',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '已规划', value: 'planned' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['name', 'code', 'description'],
    },
    {
      title: '时间与预算',
      fields: ['start_date', 'end_date', 'budget'],
    },
    {
      title: '状态',
      fields: ['status'],
    },
  ],

  formColCount: 2,
  createTitle: '新增培训计划',
  editTitle: '编辑培训计划',
  detailTitle: '培训详情',
};
