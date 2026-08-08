import type { EntitySchema } from '@/schema';

export const productionScheduleSchema: EntitySchema = {
  entity: 'mes_production_schedule',
  title: '生产排程',
  description: '管理生产排程，包括工单、工序、工位、计划时间、数量、状态等',

  api: {
    module: 'mes',
    resource: 'schedules',
  },

  fields: [
    {
      name: 'order_id',
      label: '工单ID',
      type: 'text',
      required: true,
      listWidth: 120,
    },
    {
      name: 'order_number',
      label: '工单号',
      type: 'text',
      readonlyOnEdit: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'process_id',
      label: '工序ID',
      type: 'text',
      showInList: false,
      listWidth: 120,
    },
    {
      name: 'process_name',
      label: '工序',
      type: 'text',
      readonlyOnEdit: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'work_station_id',
      label: '工位ID',
      type: 'text',
      showInList: false,
      listWidth: 120,
    },
    {
      name: 'work_station_name',
      label: '工位',
      type: 'text',
      readonlyOnEdit: true,
      showInForm: false,
      sortable: true,
      listWidth: 140,
    },
    {
      name: 'quantity',
      label: '数量',
      type: 'number',
      required: true,
      sortable: true,
      listWidth: 100,
    },
    {
      name: 'planned_start_time',
      label: '计划开始时间',
      type: 'datetime',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'planned_end_time',
      label: '计划结束时间',
      type: 'datetime',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'actual_start_time',
      label: '实际开始时间',
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 180,
    },
    {
      name: 'actual_end_time',
      label: '实际结束时间',
      type: 'datetime',
      readonlyOnEdit: true,
      showInForm: false,
      listWidth: 180,
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
      showInList: false,
      listWidth: 100,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'scheduled',
      options: {
        type: 'static',
        options: [
          { value: 'scheduled', label: '已排程' },
          { value: 'in_progress', label: '执行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
    {
      name: 'notes',
      label: '备注',
      type: 'textarea',
      showInList: false,
    },
  ],

  list: {
    columns: [
      'order_number',
      'process_name',
      'work_station_name',
      'quantity',
      'planned_start_time',
      'planned_end_time',
      'status',
    ],
    searchFields: ['order_number', 'process_name', 'work_station_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        scheduled: 'secondary',
        in_progress: 'primary',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        scheduled: '已排程',
        in_progress: '执行中',
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
          { label: '全部状态', value: '' },
          { label: '已排程', value: 'scheduled' },
          { label: '执行中', value: 'in_progress' },
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
      fields: ['order_id', 'quantity', 'process_id', 'work_station_id'],
    },
    {
      title: '计划时间',
      fields: ['planned_start_time', 'planned_end_time'],
    },
    {
      title: '优先级与备注',
      fields: ['priority', 'status', 'notes'],
    },
  ],

  formColCount: 2,
  createTitle: '新增排程',
  editTitle: '编辑排程',
  detailTitle: '生产排程详情',
};
