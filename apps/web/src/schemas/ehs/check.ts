import type { EntitySchema } from '@/schema';

export const inspectionPlanSchema: EntitySchema = {
  entity: 'ehsInspectionPlan',
  title: '检查计划',
  description: '管理企业安全检查计划，包括检查类型、频率、负责人、状态等',

  api: {
    module: 'ehs',
    resource: 'inspectionPlans',
  },

  fields: [
    {
      name: 'plan_no',
      label: '计划编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '计划名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'inspection_type',
      label: '检查类型',
      type: 'select',
      required: true,
      defaultValue: 'daily',
      options: {
        type: 'static',
        options: [
          { value: 'daily', label: '日常检查' },
          { value: 'weekly', label: '周检查' },
          { value: 'monthly', label: '月度检查' },
          { value: 'quarterly', label: '季度检查' },
          { value: 'yearly', label: '年度检查' },
          { value: 'special', label: '专项检查' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspection_type as string;
        const map: Record<string, string> = {
          daily: '日常检查',
          weekly: '周检查',
          monthly: '月度检查',
          quarterly: '季度检查',
          yearly: '年度检查',
          special: '专项检查',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'frequency',
      label: '检查频率',
      type: 'select',
      required: true,
      defaultValue: 'daily',
      options: {
        type: 'static',
        options: [
          { value: 'daily', label: '每天' },
          { value: 'weekly', label: '每周' },
          { value: 'monthly', label: '每月' },
          { value: 'quarterly', label: '每季度' },
          { value: 'yearly', label: '每年' },
        ],
      },
      listWidth: 100,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.frequency as string;
        const map: Record<string, string> = {
          daily: '每天',
          weekly: '每周',
          monthly: '每月',
          quarterly: '每季度',
          yearly: '每年',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'inspector',
      label: '负责人',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspector as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'start_date',
      label: '开始日期',
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.start_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'end_date',
      label: '结束日期',
      type: 'date',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.end_date as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'active',
      options: {
        type: 'static',
        options: [
          { value: 'active', label: '启用' },
          { value: 'inactive', label: '停用' },
        ],
      },
      listWidth: 100,
    },
    {
      name: 'description',
      label: '描述',
      type: 'textarea',
      showInList: false,
      colSpan: 2,
    },
  ],

  list: {
    columns: ['plan_no', 'title', 'inspection_type', 'frequency', 'inspector', 'status'],
    searchFields: ['plan_no', 'title', 'inspector'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        active: 'success',
        inactive: 'default',
      },
      labelMap: {
        active: '启用',
        inactive: '停用',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
        ],
      },
    ],
  },

  actions: ['create', 'edit', 'detail', 'delete'],

  formSections: [
    {
      title: '基本信息',
      fields: ['title', 'description', 'inspection_type', 'frequency'],
    },
    {
      title: '时间安排',
      fields: ['start_date', 'end_date', 'inspector'],
    },
  ],

  formColCount: 2,
  createTitle: '新增检查计划',
  editTitle: '编辑检查计划',
  detailTitle: '检查计划详情',
};

export const inspectionRecordSchema: EntitySchema = {
  entity: 'ehsInspectionRecord',
  title: '检查记录',
  description: '管理企业安全检查记录，包括检查类型、位置、检查人、结果、状态等',

  api: {
    module: 'ehs',
    resource: 'inspectionRecords',
  },

  fields: [
    {
      name: 'record_no',
      label: '记录编号',
      type: 'text',
      readonlyOnEdit: true,
      listWidth: 140,
    },
    {
      name: 'title',
      label: '检查名称',
      type: 'text',
      required: true,
      sortable: true,
      listWidth: 180,
    },
    {
      name: 'inspection_type',
      label: '检查类型',
      type: 'select',
      required: true,
      defaultValue: 'daily',
      options: {
        type: 'static',
        options: [
          { value: 'daily', label: '日常检查' },
          { value: 'weekly', label: '周检查' },
          { value: 'monthly', label: '月度检查' },
          { value: 'quarterly', label: '季度检查' },
          { value: 'yearly', label: '年度检查' },
          { value: 'special', label: '专项检查' },
        ],
      },
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspection_type as string;
        const map: Record<string, string> = {
          daily: '日常检查',
          weekly: '周检查',
          monthly: '月度检查',
          quarterly: '季度检查',
          yearly: '年度检查',
          special: '专项检查',
        };
        return map[v] || v || '-';
      },
    },
    {
      name: 'location',
      label: '位置',
      type: 'text',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.location as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'inspector',
      label: '检查人',
      type: 'text',
      listWidth: 120,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspector as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'inspected_at',
      label: '检查时间',
      type: 'date',
      listWidth: 140,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.inspected_at as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'result',
      label: '检查结果',
      type: 'text',
      listWidth: 120,
      showInList: false,
      renderCell: (row: Record<string, unknown>) => {
        const v = row.result as string | null | undefined;
        return v || '-';
      },
    },
    {
      name: 'status',
      label: '状态',
      type: 'select',
      defaultValue: 'pending',
      options: {
        type: 'static',
        options: [
          { value: 'pending', label: '待处理' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
        ],
      },
      listWidth: 100,
    },
  ],

  list: {
    columns: [
      'record_no',
      'title',
      'inspection_type',
      'location',
      'inspector',
      'inspected_at',
      'status',
    ],
    searchFields: ['record_no', 'title', 'inspector'],
    pageSize: 10,
    statusBadge: {
      field: 'status',
      colorMap: {
        pending: 'error',
        in_progress: 'warning',
        completed: 'success',
      },
      labelMap: {
        pending: '待处理',
        in_progress: '进行中',
        completed: '已完成',
      },
    },
    filters: [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: 'all' },
          { label: '待处理', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
        ],
      },
    ],
  },

  actions: ['detail'],

  formSections: [
    {
      title: '基本信息',
      fields: ['record_no', 'title', 'inspection_type', 'status'],
    },
    {
      title: '检查详情',
      fields: ['location', 'inspector', 'inspected_at', 'result'],
    },
  ],

  formColCount: 2,
  detailTitle: '检查记录详情',
};
