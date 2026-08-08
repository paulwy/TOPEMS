import type { EntitySchema } from '@/schema';

export const evaluationSchema: EntitySchema = {
  entity: 'srm_evaluation',
  title: '供应商评估',
  description: '管理供应商评估记录，跟踪评估进度，分析评分数据',

  api: {
    module: 'srm',
    resource: 'supplier-evaluations',
  },

  fields: [
    {
      name: 'evaluation_no',
      label: '评估编号',
      type: 'text',
      readonly: true,
      sortable: true,
      listWidth: 150,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'select',
      required: true,
      listWidth: 180,
    },
    {
      name: 'evaluation_date',
      label: '评估日期',
      type: 'date',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'overall_score',
      label: '综合评分',
      type: 'number',
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'quality_score',
      label: '质量评分',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'delivery_score',
      label: '交付评分',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'service_score',
      label: '服务评分',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'price_score',
      label: '价格评分',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'evaluator',
      label: '评估人',
      type: 'text',
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 100 }],
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'in_progress',
      options: {
        type: 'static',
        options: [
          { value: 'in_progress', label: '进行中' },
          { value: 'pending', label: '待审核' },
          { value: 'completed', label: '已完成' },
          { value: 'rejected', label: '已驳回' },
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
  ],

  list: {
    columns: [
      'evaluation_no',
      'supplier_id',
      'evaluation_date',
      'overall_score',
      'quality_score',
      'delivery_score',
      'service_score',
      'price_score',
      'evaluator',
      'status',
    ],
    searchFields: ['evaluation_no', 'supplier_id', 'evaluator'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        in_progress: 'primary',
        pending: 'warning',
        completed: 'success',
        rejected: 'error',
      },
      labelMap: {
        in_progress: '进行中',
        pending: '待审核',
        completed: '已完成',
        rejected: '已驳回',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '进行中', value: 'in_progress' },
          { label: '待审核', value: 'pending' },
          { label: '已完成', value: 'completed' },
          { label: '已驳回', value: 'rejected' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['evaluation_no', 'supplier_id', 'evaluation_date', 'evaluator', 'status'],
    },
    {
      title: '评分详情',
      fields: ['quality_score', 'delivery_score', 'service_score', 'price_score'],
    },
  ],

  formColCount: 2,
  createTitle: '新增供应商评估',
  editTitle: '编辑供应商评估',
  detailTitle: '供应商评估详情',
};
