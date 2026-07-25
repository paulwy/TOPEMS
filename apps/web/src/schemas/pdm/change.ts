import type { EntitySchema } from '@/schema';

export const changeSchema: EntitySchema = {
  entity: 'pdm_change',
  title: '变更管理',
  description: '管理产品变更单，包括变更单号、标题、类型、原因、申请人、状态等',

  api: {
    module: 'pdm',
    resource: 'changeOrders',
  },

  fields: [
    {
      name: 'change_no',
      label: '变更单号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '变更标题',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'type',
      label: '变更类型',
      type: 'select',
      required: true,
      options: {
        type: 'static',
        options: [
          { value: 'design', label: '设计变更' },
          { value: 'process', label: '工艺变更' },
          { value: 'material', label: '材料变更' },
          { value: 'equipment', label: '设备变更' },
          { value: 'other', label: '其他变更' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'priority',
      label: '优先级',
      type: 'select',
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'low', label: '低' },
          { value: 'normal', label: '普通' },
          { value: 'high', label: '高' },
          { value: 'urgent', label: '紧急' },
        ],
      },
      listWidth: 80,
    },
    {
      name: 'applicant_name',
      label: '申请人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'apply_date',
      label: '申请日期',
      type: 'date',
      required: true,
      listWidth: 120,
    },
    {
      name: 'approved_by',
      label: '审批人',
      type: 'text',
      listWidth: 100,
    },
    {
      name: 'approved_date',
      label: '审批日期',
      type: 'date',
      listWidth: 120,
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
          { value: 'reviewing', label: '审批中' },
          { value: 'approved', label: '已批准' },
          { value: 'rejected', label: '已驳回' },
          { value: 'implemented', label: '已实施' },
          { value: 'closed', label: '已关闭' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'reason',
      label: '变更原因',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'description',
      label: '变更描述',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'impact_analysis',
      label: '影响分析',
      type: 'textarea',
      showInList: false,
    },
    {
      name: 'remarks',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: ['change_no', 'title', 'type', 'priority', 'applicant_name', 'apply_date', 'status'],
    searchFields: ['change_no', 'title'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        reviewing: 'info',
        approved: 'success',
        rejected: 'error',
        implemented: 'success',
        closed: 'default',
      },
      labelMap: {
        pending: '待审批',
        reviewing: '审批中',
        approved: '已批准',
        rejected: '已驳回',
        implemented: '已实施',
        closed: '已关闭',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待审批', value: 'pending' },
          { label: '审批中', value: 'reviewing' },
          { label: '已批准', value: 'approved' },
          { label: '已驳回', value: 'rejected' },
          { label: '已实施', value: 'implemented' },
          { label: '已关闭', value: 'closed' },
        ],
      },
      {
        id: 'type',
        label: '变更类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '设计变更', value: 'design' },
          { label: '工艺变更', value: 'process' },
          { label: '材料变更', value: 'material' },
          { label: '设备变更', value: 'equipment' },
          { label: '其他变更', value: 'other' },
        ],
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { label: '全部优先级', value: 'all' },
          { label: '低', value: 'low' },
          { label: '普通', value: 'normal' },
          { label: '高', value: 'high' },
          { label: '紧急', value: 'urgent' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['change_no', 'title', 'type', 'priority'],
    },
    {
      title: '申请与审批',
      fields: ['applicant_name', 'apply_date', 'approved_by', 'approved_date'],
    },
    {
      title: '变更详情',
      fields: ['reason', 'description', 'impact_analysis'],
    },
    {
      title: '状态与备注',
      fields: ['status', 'remarks'],
    },
  ],

  formColCount: 2,
  createTitle: '新增变更单',
  editTitle: '编辑变更单',
  detailTitle: '变更详情',
};
