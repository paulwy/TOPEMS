import type { EntitySchema } from '@/schema';

export const attendanceSchema: EntitySchema = {
  entity: 'hrm_attendance',
  title: '考勤记录',
  description: '管理员工考勤记录，包括签到、签退、工作时长、状态等',

  api: {
    module: 'hrm',
    resource: 'attendance',
  },

  fields: [
    {
      name: 'employee_id',
      label: '员工ID',
      type: 'text',
      listWidth: 120,
      showInForm: false,
    },
    {
      name: 'employee_name',
      label: '员工姓名',
      type: 'text',
      listWidth: 150,
      showInForm: false,
    },
    {
      name: 'date',
      label: '日期',
      type: 'date',
      required: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'check_in',
      label: '签到时间',
      type: 'datetime',
      listWidth: 120,
    },
    {
      name: 'check_out',
      label: '签退时间',
      type: 'datetime',
      listWidth: 120,
    },
    {
      name: 'check_in_time',
      label: '签到时间',
      type: 'text',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'check_out_time',
      label: '签退时间',
      type: 'text',
      showInList: false,
      showInForm: false,
    },
    {
      name: 'work_hours',
      label: '工作时长',
      type: 'number',
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'status',
      label: '考勤状态',
      type: 'select',
      required: true,
      defaultValue: 'normal',
      options: {
        type: 'static',
        options: [
          { value: 'normal', label: '正常' },
          { value: 'late', label: '迟到' },
          { value: 'early_leave', label: '早退' },
          { value: 'absent', label: '缺勤' },
          { value: 'leave', label: '请假' },
          { value: 'business_trip', label: '出差' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 20 }],
    },
    {
      name: 'attendance_status',
      label: '考勤状态码',
      type: 'text',
      showInList: false,
      showInForm: false,
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
      listWidth: 160,
      showInList: false,
    },
  ],

  list: {
    columns: ['employee_name', 'date', 'check_in', 'check_out', 'work_hours', 'status'],
    searchFields: ['employee_name', 'employee_id'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        normal: 'success',
        late: 'warning',
        early_leave: 'warning',
        absent: 'error',
        leave: 'info',
        business_trip: 'primary',
      },
      labelMap: {
        normal: '正常',
        late: '迟到',
        early_leave: '早退',
        absent: '缺勤',
        leave: '请假',
        business_trip: '出差',
      },
    },
    filters: [
      {
        id: 'status',
        label: '考勤状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { value: 'normal', label: '正常' },
          { value: 'late', label: '迟到' },
          { value: 'early_leave', label: '早退' },
          { value: 'absent', label: '缺勤' },
          { value: 'leave', label: '请假' },
          { value: 'business_trip', label: '出差' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['employee_id', 'date', 'status'],
    },
    {
      title: '打卡记录',
      fields: ['check_in', 'check_out', 'work_hours'],
    },
  ],

  formColCount: 2,
  createTitle: '新增考勤记录',
  editTitle: '编辑考勤记录',
  detailTitle: '考勤详情',
};
