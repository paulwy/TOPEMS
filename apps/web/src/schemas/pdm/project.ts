import type { EntitySchema, BadgeColor } from '@/schema';

const STATUS_OPTIONS = [
  { value: 'planning', label: '规划中' },
  { value: 'active', label: '进行中' },
  { value: 'on_hold', label: '暂停' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const STATUS_COLOR_MAP: Record<string, BadgeColor> = {
  planning: 'warning',
  active: 'success',
  on_hold: 'warning',
  completed: 'primary',
  cancelled: 'error',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  planning: '规划中',
  active: '进行中',
  on_hold: '暂停',
  completed: '已完成',
  cancelled: '已取消',
};

const PHASE_OPTIONS = [
  { value: 'initiation', label: '启动' },
  { value: 'planning', label: '规划' },
  { value: 'execution', label: '执行' },
  { value: 'monitoring', label: '监控' },
  { value: 'closing', label: '收尾' },
];

const PHASE_COLOR_MAP: Record<string, string> = {
  initiation: 'default',
  planning: 'warning',
  execution: 'primary',
  monitoring: 'success',
  closing: 'secondary',
};

const PHASE_LABEL_MAP: Record<string, string> = {
  initiation: '启动',
  planning: '规划',
  execution: '执行',
  monitoring: '监控',
  closing: '收尾',
};

export const pdmProjectSchema: EntitySchema = {
  entity: 'pdm_project',
  title: 'PDM项目',
  description: '管理产品开发项目，包括状态、阶段、成员和进度',

  api: {
    module: 'pdm',
    resource: 'projects',
  },

  fields: [
    {
      name: 'project_no',
      label: '项目编号',
      type: 'text',
      required: true,
      readonlyOnEdit: true,
      sortable: true,
      listWidth: 120,
    },
    {
      name: 'name',
      label: '项目名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 160,
    },
    {
      name: 'description',
      label: '项目描述',
      type: 'textarea',
      listWidth: 200,
      hideInList: true,
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'planning',
      listWidth: 100,
      options: {
        type: 'static',
        options: STATUS_OPTIONS,
      },
    },
    {
      name: 'phase',
      label: '阶段',
      type: 'select',
      defaultValue: 'initiation',
      listWidth: 100,
      options: {
        type: 'static',
        options: PHASE_OPTIONS,
      },
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 120,
    },
    {
      name: 'budget',
      label: '预算',
      type: 'number',
      listWidth: 120,
      align: 'right',
      renderCell: (row: Record<string, unknown>) => {
        const value = row.budget as number;
        return value ? `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` : '-';
      },
    },
    {
      name: 'progress',
      label: '进度',
      type: 'number',
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => `${(row.progress as number) || 0}%`,
    },
    {
      name: 'member_count',
      label: '成员',
      type: 'number',
      listWidth: 80,
      align: 'center',
    },
  ],

  list: {
    columns: [
      'project_no',
      'name',
      'status',
      'phase',
      'start_date',
      'end_date',
      'progress',
      'member_count',
    ],
    searchFields: ['project_no', 'name', 'description'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: STATUS_COLOR_MAP,
      labelMap: STATUS_LABEL_MAP,
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [{ label: '全部状态', value: 'all' }, ...STATUS_OPTIONS],
      },
      {
        id: 'phase',
        label: '阶段',
        type: 'select',
        options: [{ label: '全部阶段', value: 'all' }, ...PHASE_OPTIONS],
      },
    ],
  },

  formSections: [
    {
      title: '基本信息',
      fields: ['project_no', 'name', 'description'],
    },
    {
      title: '项目状态',
      fields: ['status', 'phase', 'start_date', 'end_date'],
    },
    {
      title: '预算与进度',
      fields: ['budget', 'progress'],
    },
  ],

  formColCount: 2,
  createTitle: '添加项目',
  editTitle: '编辑项目',
  detailTitle: '项目详情',

  actions: ['create', 'edit', 'detail', 'delete'],
};

export {
  STATUS_OPTIONS,
  STATUS_COLOR_MAP,
  STATUS_LABEL_MAP,
  PHASE_OPTIONS,
  PHASE_COLOR_MAP,
  PHASE_LABEL_MAP,
};
