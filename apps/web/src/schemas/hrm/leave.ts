import type { EntitySchema } from '@/schema';

export const leaveSchema: EntitySchema = {
  entity: 'hrm_leave',
  title: '请假管理',
  description: '管理员工请假申请，包括请假类型、时间、状态等',

  api: {
    module: 'hrm',
    resource: 'leaveRequests',
  },

  fields: [
    {
      name: 'employee_id',
      label: '员工',
      type: 'select',
      required: true,
      listWidth: 140,
      showInList: false,
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      listWidth: 140,
      showInForm: false,
    },
    {
      name: 'leave_type',
      label: '请假类型',
      type: 'select',
      required: true,
      defaultValue: 'annual',
      options: {
        type: 'static',
        options: [
          { value: 'annual', label: '年假' },
          { value: 'sick', label: '病假' },
          { value: 'personal', label: '事假' },
          { value: 'maternity', label: '产假' },
          { value: 'paternity', label: '陪产假' },
          { value: 'other', label: '其他' },
        ],
      },
      listWidth: 100,
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
      name: 'days',
      label: '天数',
      type: 'number',
      defaultValue: 0,
      listWidth: 80,
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
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      showInForm: false,
    },
    {
      name: 'reason',
      label: '请假原因',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'approver_id',
      label: '审批人',
      type: 'text',
      listWidth: 100,
      showInForm: false,
    },
    {
      name: 'rejection_reason',
      label: '审批意见',
      type: 'text',
      showInList: false,
      showInForm: false,
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
    searchFields: ['employee_name', 'leave_type'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'warning',
        approved: 'success',
        rejected: 'error',
        cancelled: 'default',
      },
      labelMap: {
        pending: '待审批',
        approved: '已批准',
        rejected: '已驳回',
        cancelled: '已取消',
      },
    },
    filters: [
      {
        id: 'leave_type',
        label: '请假类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { value: 'annual', label: '年假' },
          { value: 'sick', label: '病假' },
          { value: 'personal', label: '事假' },
          { value: 'maternity', label: '产假' },
          { value: 'paternity', label: '陪产假' },
          { value: 'other', label: '其他' },
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
          { value: 'cancelled', label: '已取消' },
        ],
      },
    ],
  },

  formSections: [
    {
      title: '员工信息',
      fields: ['employee_id'],
    },
    {
      title: '请假信息',
      fields: ['leave_type', 'start_date', 'end_date', 'days'],
    },
    {
      title: '备注',
      fields: ['reason'],
    },
  ],

  formColCount: 2,
  createTitle: '新增请假申请',
  editTitle: '编辑请假申请',
  detailTitle: '请假详情',

  dynamicOptions: [
    {
      field: 'employee_id',
      loader: async () => {
        const { employeeApi } = await import('@/api/hrm');
        const response = await employeeApi.list();
        const items = (response.data?.items || response.data || []) as Array<{
          id: string;
          name: string;
        }>;
        if (Array.isArray(items)) {
          return items.map((e) => ({ value: e.id, label: e.name }));
        }
        return [];
      },
      queryKey: ['hrm-leave-employees'],
    },
  ],

  actions: ['create', 'edit', 'detail', 'delete'],
};
