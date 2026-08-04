import type { EntitySchema } from '@/schema';

export const purchaseContractSchema: EntitySchema = {
  entity: 'purchaseContract',
  title: '采购合同',
  description: '管理采购合同，包括合同创建、审批、签订、执行等全生命周期',

  api: {
    module: 'scm',
    resource: 'purchaseContracts',
  },

  fields: [
    {
      name: 'contractNo',
      label: '合同编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'supplier_id',
      label: '供应商',
      type: 'text',
      required: true,
      listWidth: 160,
    },
    {
      name: 'title',
      label: '合同标题',
      type: 'text',
      required: true,
      listWidth: 180,
    },
    {
      name: 'amount',
      label: '合同金额',
      type: 'number',
      defaultValue: 0,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'sign_date',
      label: '签订日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'start_date',
      label: '生效日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '到期日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'draft',
      options: {
        type: 'static',
        options: [
          { value: 'draft', label: '草稿' },
          { value: 'pending', label: '待审批' },
          { value: 'approved', label: '已审批' },
          { value: 'active', label: '执行中' },
          { value: 'expired', label: '已到期' },
          { value: 'terminated', label: '已终止' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'terms',
      label: '合同条款',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'contractNo',
      'supplier_id',
      'title',
      'amount',
      'sign_date',
      'start_date',
      'end_date',
      'status',
    ],
    searchFields: ['contractNo', 'title', 'supplier_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        pending: 'warning',
        approved: 'success',
        active: 'primary',
        expired: 'default',
        terminated: 'error',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        pending: '待审批',
        approved: '已审批',
        active: '执行中',
        expired: '已到期',
        terminated: '已终止',
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
          { label: '草稿', value: 'draft' },
          { label: '待审批', value: 'pending' },
          { label: '已审批', value: 'approved' },
          { label: '执行中', value: 'active' },
          { label: '已到期', value: 'expired' },
          { label: '已终止', value: 'terminated' },
          { label: '已取消', value: 'cancelled' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['contractNo', 'supplier_id', 'title', 'status'],
    },
    {
      title: '金额与日期',
      fields: ['amount', 'sign_date', 'start_date', 'end_date'],
    },
    {
      title: '合同条款',
      fields: ['terms'],
    },
  ],

  formColCount: 2,
  createTitle: '新增采购合同',
  editTitle: '编辑采购合同',
  detailTitle: '采购合同详情',
};
