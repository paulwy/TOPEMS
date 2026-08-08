import type { EntitySchema } from '@/schema';

export const emergencyDrillSchema: EntitySchema = {
  entity: 'ehsEmergencyDrill',
  title: '应急演练',
  description: '管理企业应急演练记录，包括演练编号、名称、日期、参与人员、地点、状态等',

  api: {
    module: 'ehs',
    resource: 'drills',
  },

  fields: [
    {
      name: 'drill_no',
      label: '演练编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'drill_name',
      label: '演练名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'drill_date',
      label: '演练日期',
      type: 'date',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.drill_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'duration_hours',
      label: '时长(小时)',
      type: 'number',
      defaultValue: 0,
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.duration_hours as number | null | undefined;
        return v != null ? String(v) : '-';
      },
    },
    {
      name: 'location',
      label: '地点',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
      validation: [{ type: 'maxLength', value: 256 }],
    },
    {
      name: 'participants',
      label: '参与人员',
      type: 'textarea',
      showInList: false,
      placeholder: '多个人员用逗号分隔',
      colSpan: 2,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.participants;
        if (Array.isArray(v)) return v.join(', ') || '-';
        if (typeof v === 'string') return v || '-';
        return '-';
      },
    },
    {
      name: 'summary',
      label: '演练概要',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'issues_found',
      label: '发现问题',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
    {
      name: 'improvements',
      label: '改进措施',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
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
          { value: 'planned', label: '已计划' },
          { value: 'ongoing', label: '进行中' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
      },
      listWidth: 100,
      validation: [{ type: 'maxLength', value: 32 }],
    },
  ],

  list: {
    columns: ['drill_no', 'drill_name', 'drill_date', 'duration_hours', 'location', 'status'],
    searchFields: ['drill_no', 'drill_name'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        draft: 'default',
        planned: 'info',
        ongoing: 'warning',
        completed: 'success',
        cancelled: 'error',
      },
      labelMap: {
        draft: '草稿',
        planned: '已计划',
        ongoing: '进行中',
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
          { label: '全部', value: 'all' },
          { label: '草稿', value: 'draft' },
          { label: '已计划', value: 'planned' },
          { label: '进行中', value: 'ongoing' },
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
      fields: ['drill_no', 'drill_name', 'drill_date', 'duration_hours'],
    },
    {
      title: '演练详情',
      fields: ['location', 'status'],
    },
    {
      title: '演练内容',
      fields: ['participants', 'summary', 'issues_found', 'improvements'],
    },
  ],

  formColCount: 2,
  createTitle: '新建应急演练',
  editTitle: '编辑应急演练',
  detailTitle: '应急演练详情',
};
