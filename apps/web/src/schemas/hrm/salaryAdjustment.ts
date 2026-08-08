import type { EntitySchema } from '@/schema';

export const salaryAdjustmentSchema: EntitySchema = {
  entity: 'hrm_salary_adjustment',
  title: '薪酬调整',
  description: '管理员工薪酬调整记录，包括晋升、降薪、奖金等',

  api: {
    module: 'hrm',
    resource: 'salaryAdjustments',
  },

  fields: [
    {
      name: 'employee_id',
      label: '员工ID',
      type: 'text',
      listWidth: 120,
      showInForm: false,
      showInList: false,
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'department',
      label: '部门',
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'adjustment_type',
      label: '调整类型',
      type: 'select',
      required: true,
      defaultValue: 'bonus',
      options: {
        type: 'static',
        options: [
          { value: 'promotion', label: '晋升' },
          { value: 'demotion', label: '降薪' },
          { value: 'bonus', label: '奖金' },
          { value: 'deduction', label: '扣款' },
          { value: 'annual', label: '年度调薪' },
          { value: 'special', label: '特殊调整' },
          { value: 'correction', label: '更正' },
        ],
      },
      listWidth: 110,
      validation: [{ type: 'maxLength', value: 50 }],
    },
    {
      name: 'old_salary',
      label: '原薪酬',
      type: 'number',
      listWidth: 110,
      align: 'right',
      showInForm: false,
    },
    {
      name: 'new_salary',
      label: '新薪酬',
      type: 'number',
      listWidth: 110,
      align: 'right',
      showInForm: false,
    },
    {
      name: 'adjustment_amount',
      label: '调整金额',
      type: 'number',
      listWidth: 120,
      align: 'right',
      showInForm: false,
    },
    {
      name: 'effective_date',
      label: '生效日期',
      type: 'date',
      listWidth: 110,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已批准' },
          { value: 'rejected', label: '已驳回' },
        ],
      },
      listWidth: 100,
      showInForm: false,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'reason',
      label: '原因',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'created_at',
      label: '创建时间',
      type: 'date',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'updated_at',
      label: '更新时间',
      type: 'date',
      showInList: false,
      showInForm: false,
    },
  ],

  list: {
    searchFields: ['employee_name', 'department'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
      },
      labelMap: {
        pending: '待审批',
        approved: '已批准',
        rejected: '已驳回',
      },
    },
    filters: [
      {
        id: 'adjustment_type',
        label: '调整类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { value: 'promotion', label: '晋升' },
          { value: 'demotion', label: '降薪' },
          { value: 'bonus', label: '奖金' },
          { value: 'deduction', label: '扣款' },
          { value: 'annual', label: '年度调薪' },
          { value: 'special', label: '特殊调整' },
          { value: 'correction', label: '更正' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已批准' },
          { value: 'rejected', label: '已驳回' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['employee_id', 'department'],
    },
    {
      title: '薪酬调整',
      fields: [
        'adjustment_type',
        'old_salary',
        'new_salary',
        'adjustment_amount',
        'effective_date',
      ],
    },
    {
      title: '备注',
      fields: ['reason'],
    },
  ],

  formColCount: 2,
  createTitle: '新增薪酬调整',
  editTitle: '编辑薪酬调整',
  detailTitle: '薪酬调整详情',

  actions: ['detail'],
};
