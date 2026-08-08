import type { EntitySchema } from '@/schema';

export const payrollSchema: EntitySchema = {
  entity: 'hrm_payroll',
  title: '工资发放',
  description: '管理工资发放批次，包括工资核算、发放等流程',

  api: {
    module: 'hrm',
    resource: 'payroll',
  },

  fields: [
    {
      name: 'pay_period',
      label: '工资周期',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'employee_count',
      label: '员工数量',
      type: 'number',
      listWidth: 100,
    },
    {
      name: 'total_amount',
      label: '总金额',
      type: 'number',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'calculated', label: '已核算' },
          { value: 'paid', label: '已发放' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'paid_at',
      label: '支付时间',
      type: 'datetime',
      listWidth: 160,
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
      showInList: false,
    },
  ],

  list: {
    columns: ['pay_period', 'employee_count', 'total_amount', 'status', 'paid_at', 'created_at'],
    searchFields: ['pay_period'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'warning',
        calculated: 'primary',
        paid: 'success',
      },
      labelMap: {
        draft: '草稿',
        calculated: '已核算',
        paid: '已发放',
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
          { label: '已核算', value: 'calculated' },
          { label: '已发放', value: 'paid' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['pay_period', 'status'],
    },
    {
      title: '详细信息',
      fields: ['employee_count', 'total_amount', 'paid_at'],
    },
  ],

  formColCount: 2,
  createTitle: '创建工资发放批次',
  editTitle: '编辑工资发放批次',
  detailTitle: '工资发放批次详情',

  actions: ['create', 'detail', 'delete'],
};
