import type { EntitySchema } from '@/schema';

export const performanceSchema: EntitySchema = {
  entity: 'hrm_performance',
  title: '绩效管理',
  description: '管理员工绩效评估，包括员工、周期、评分、评价人、状态等',

  api: {
    module: 'hrm',
    resource: 'performanceReviews',
  },

  fields: [
    {
      name: 'employee_id',
      label: '员工ID',
      type: 'text',
      required: true,
      showInList: false,
      showInDetail: false,
    },
    {
      name: 'review_period',
      label: '考核周期',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'reviewer_id',
      label: '评价人',
      type: 'text',
      listWidth: 120,
    },
    {
      name: 'overall_rating',
      label: '综合评分',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'self_rating',
      label: '自评得分',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'manager_rating',
      label: '主管评分',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'final_rating',
      label: '最终评分',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待自评' },
          { value: 'self_reviewed', label: '已自评' },
          { value: 'manager_reviewed', label: '主管已评' },
          { value: 'completed', label: '已完成' },
          { value: 'archived', label: '已归档' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'comments',
      label: '评价详情',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'employee_id',
      'review_period',
      'reviewer_id',
      'overall_rating',
      'self_rating',
      'manager_rating',
      'final_rating',
      'status',
    ],
    searchFields: ['employee_id', 'review_period'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'default',
        self_reviewed: 'info',
        manager_reviewed: 'warning',
        completed: 'success',
        archived: 'default',
      },
      labelMap: {
        pending: '待自评',
        self_reviewed: '已自评',
        manager_reviewed: '主管已评',
        completed: '已完成',
        archived: '已归档',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待自评', value: 'pending' },
          { label: '已自评', value: 'self_reviewed' },
          { label: '主管已评', value: 'manager_reviewed' },
          { label: '已完成', value: 'completed' },
          { label: '已归档', value: 'archived' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['employee_id', 'review_period', 'reviewer_id'],
    },
    {
      title: '评分信息',
      fields: ['self_rating', 'manager_rating', 'overall_rating', 'final_rating'],
    },
    {
      title: '状态与评价',
      fields: ['status', 'comments'],
    },
  ],

  formColCount: 2,
  createTitle: '新增绩效评估',
  editTitle: '编辑绩效评估',
  detailTitle: '绩效详情',
};
