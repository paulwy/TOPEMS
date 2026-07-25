import type { EntitySchema } from '@/schema';

export const accountingSubjectSchema: EntitySchema = {
  entity: 'finance_accounting_subject',
  title: '会计科目',
  description: '管理会计科目编码、类别与层级关系',

  api: {
    module: 'finance',
    resource: 'accountingSubjects',
  },

  fields: [
    {
      name: 'code',
      label: '科目编码',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'name',
      label: '科目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'category',
      label: '科目类别',
      type: 'select',
      options: {
        type: 'static',
        options: [
          { value: 'asset', label: '资产类' },
          { value: 'liability', label: '负债类' },
          { value: 'equity', label: '权益类' },
          { value: 'cost', label: '成本类' },
          { value: 'expense', label: '费用类' },
          { value: 'income', label: '收入类' },
        ],
      },
      listWidth: 120,
    },
    {
      name: 'level',
      label: '科目级别',
      type: 'select',
      required: true,
      defaultValue: 1,
      options: {
        type: 'static',
        options: [
          { value: 1, label: '一级' },
          { value: 2, label: '二级' },
          { value: 3, label: '三级' },
          { value: 4, label: '四级' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'parent_code',
      label: '上级科目编码',
      type: 'text',
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'is_cash_flow',
      label: '现金流量科目',
      type: 'select',
      defaultValue: false,
      options: {
        type: 'static',
        options: [
          { value: true, label: '是' },
          { value: false, label: '否' },
        ],
      },
      listWidth: 120,
      showInList: false,
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
          { value: 'disabled', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '备注',
      type: 'textarea',
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
      showInList: false,
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
    columns: ['code', 'name', 'category', 'level', 'is_cash_flow', 'status'],
    searchFields: ['code', 'name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        disabled: 'error',
      },
      labelMap: {
        active: '启用',
        disabled: '停用',
      },
    },
    filters: [
      {
        id: 'category',
        label: '科目类别',
        type: 'select',
        options: [
          { label: '全部类别', value: 'all' },
          { label: '资产类', value: 'asset' },
          { label: '负债类', value: 'liability' },
          { label: '权益类', value: 'equity' },
          { label: '成本类', value: 'cost' },
          { label: '费用类', value: 'expense' },
          { label: '收入类', value: 'income' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'disabled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['code', 'name', 'category', 'level', 'status'],
    },
    {
      title: '科目关系',
      fields: ['parent_code', 'is_cash_flow'],
    },
    {
      title: '备注',
      fields: ['description'],
    },
  ],

  formColCount: 2,
  createTitle: '新增会计科目',
  editTitle: '编辑会计科目',
  detailTitle: '会计科目详情',
};
